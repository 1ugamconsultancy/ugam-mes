// Real TypeORM/PostgreSQL tests in an isolated schema; no application rows changed.
process.env.NODE_ENV='test';
const Module=require('node:module'),load=Module._load;
Module._load=function(name,...args){if(name==='bcrypt')return {compare:async(p,h)=>h===`test:${p}`,hash:async p=>`test:${p}`};return load.call(this,name,...args);};
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {Client}=require('pg');const {DataSource}=require('typeorm');
const {EnterpriseService}=require('../.security-build/enterprise/enterprise.service');
const {AuthService}=require('../.security-build/auth/auth.service');
const {Organization}=require('../.security-build/enterprise/organization.entity');
const {Plant}=require('../.security-build/plants/plants.entity');
const {PlantThemeSetting}=require('../.security-build/enterprise/plant-theme.entity');
const {User}=require('../.security-build/auth/user.entity');
const {accessStorage}=require('../.security-build/auth/access-context');
const yaml=fs.readFileSync(path.join(__dirname,'../../docker-compose.yml'),'utf8');
const cfg={host:'127.0.0.1',port:5434,user:'mes_admin',password:yaml.match(/POSTGRES_PASSWORD:\s*(\S+)/)[1],database:'ugam_mes'};
const schema='archive_test_'+Date.now(),admin=new Client(cfg);let db;let count=0;
const test=async(name,fn)=>{await fn();console.log('PASS '+name);count++;};
async function main(){
 await admin.connect();await admin.query(`CREATE SCHEMA ${schema}`);
 const tables=(await admin.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows;
 for(const {tablename} of tables){assert.match(tablename,/^[a-z0-9_]+$/);await admin.query(`CREATE TABLE ${schema}.${tablename} (LIKE public.${tablename} INCLUDING ALL)`);}
 await admin.query(`SET search_path TO ${schema},public`);
 await admin.query(fs.readFileSync(path.join(__dirname,'../migrations/20261018_enterprise_archive.sql'),'utf8'));
 db=new DataSource({type:'postgres',host:cfg.host,port:cfg.port,username:cfg.user,password:cfg.password,database:cfg.database,schema,synchronize:false,entities:[path.join(__dirname,'../.security-build/**/*.entity.js'),path.join(__dirname,'../.security-build/**/*.entities.js')],extra:{options:`-c search_path=${schema},public`}});await db.initialize();
 const orgRepo=db.getRepository(Organization),plantRepo=db.getRepository(Plant),themeRepo=db.getRepository(PlantThemeSetting),users=db.getRepository(User);
 const jwt={signAsync:async p=>JSON.stringify(p),verifyAsync:async t=>JSON.parse(t)};
 const auth=new AuthService(users,plantRepo,orgRepo,themeRepo,jwt),enterprise=new EnterpriseService(orgRepo,plantRepo,themeRepo,users,auth);
 const superUser=await users.save(users.create({id:randomUUID(),username:'archive-super',email:'archive-super@test.invalid',passwordHash:'test:MES123',role:'SUPER_ADMIN',isActive:true,sessionVersion:0}));
 const as=(role,fn)=>accessStorage.run({sub:superUser.id,role,username:superUser.username,plantId:null,organizationId:null},fn);
 const run=fn=>as('SUPER_ADMIN',fn);
 const org=await enterprise.createOrganization({name:'Test organization',code:'TEST-ORG',industryType:'AUTOMOTIVE',isActive:true});
 const sibling=await enterprise.createOrganization({name:'Second organization',code:'TEST-ORG2',industryType:'AUTOMOTIVE',isActive:true});
 const plant=await enterprise.createPlant({name:'Test plant',code:'TEST-PLANT',organizationId:org.id});
 const independent=await enterprise.createPlant({name:'Independent archive',code:'TEST-PLANT2',organizationId:org.id});
 const worker=await run(()=>auth.createUser({username:'archive-worker',email:'worker@test.invalid',password:'MES123',role:'OPERATOR',plantId:plant.id,organizationId:org.id}));
 const beforeLogin=await auth.login('archive-worker','MES123');
 await test('archive is restricted to super administrators and cannot be patched',async()=>{
  await assert.rejects(as('ADMIN',()=>enterprise.archiveEntity('plant',plant.id,false)),{status:403});
  await assert.rejects(enterprise.updatePlant(plant.id,{archivedAt:new Date()}),{status:400});
  await assert.rejects(enterprise.createOrganization({name:'Bypass',code:'BYPASS',archivedAt:new Date()}),{status:400});
 });
 await test('organization archive suspends descendants and revokes sessions without changing assignments',async()=>{
  await run(()=>enterprise.archiveEntity('plant',independent.id,false));
  await run(()=>enterprise.archiveEntity('organization',org.id,false));
  assert.equal((await enterprise.getOrganizations()).some(o=>o.id===org.id),false);
  assert.equal((await enterprise.getPlants()).some(p=>p.id===plant.id),false);
  assert.equal((await enterprise.getPlants(undefined,true)).find(p=>p.id===plant.id).inheritedArchived,true);
  await assert.rejects(auth.login('archive-worker','MES123'),{status:403});
  await assert.rejects(auth.authenticateToken(beforeLogin.access_token||beforeLogin.token),{status:401});
  const stored=await users.findOneBy({id:worker.id});assert.equal(stored.plantId,plant.id);assert.equal(stored.isActive,true);
  await assert.rejects(enterprise.updatePlant(plant.id,{name:'Cannot edit'}),{status:409});
  await assert.rejects(enterprise.createPlant({name:'Cannot add',code:'NO',organizationId:org.id}),{status:409});
  await assert.rejects(enterprise.updatePlantTheme(plant.id,{themeName:'No',colors:{}}),{status:409});
 });
 await test('restoration preserves independent archive and activation states; old tokens stay revoked',async()=>{
  await run(()=>enterprise.archiveEntity('organization',org.id,true));
  assert.equal((await plantRepo.findOneBy({id:independent.id})).archivedAt instanceof Date,true);
  assert.equal((await plantRepo.findOneBy({id:plant.id})).archivedAt,null);
  await auth.login('archive-worker','MES123');await assert.rejects(auth.authenticateToken(beforeLogin.access_token||beforeLogin.token),{status:401});
  await enterprise.updateOrganization(sibling.id,{isActive:false});await run(()=>enterprise.archiveEntity('organization',sibling.id,false));await run(()=>enterprise.archiveEntity('organization',sibling.id,true));assert.equal((await orgRepo.findOneBy({id:sibling.id})).isActive,false);
 });
 await test('audit failure rolls back archive and session increments',async()=>{
  const before=await users.findOneBy({id:worker.id});
  await db.query("CREATE FUNCTION reject_archive_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected audit failure'; END $$");
  await db.query('CREATE TRIGGER reject_archive_audit BEFORE INSERT ON enterprise_archive_events FOR EACH ROW EXECUTE FUNCTION reject_archive_audit()');
  await assert.rejects(run(()=>enterprise.archiveEntity('plant',plant.id,false)),/injected audit failure/);
  assert.equal((await plantRepo.findOneBy({id:plant.id})).archivedAt,null);assert.equal((await users.findOneBy({id:worker.id})).sessionVersion,before.sessionVersion);
  await db.query('DROP TRIGGER reject_archive_audit ON enterprise_archive_events');
 });
 await test('allocation racing archive cannot grant access to archived scope',async()=>{
  await enterprise.updateOrganization(sibling.id,{isActive:true});
  const destination=await enterprise.createPlant({name:'Race plant',code:'RACE',organizationId:sibling.id});
  const results=await Promise.allSettled([run(()=>enterprise.archiveEntity('plant',destination.id,false)),run(()=>auth.updateUser(worker.id,{plantId:destination.id,organizationId:sibling.id}))]);
  assert.equal(results[0].status,'fulfilled');
  const saved=await users.findOneBy({id:worker.id});
  if(saved.plantId===destination.id)await assert.rejects(auth.login('archive-worker','MES123'),{status:403});
  else assert.equal(results[1].status,'rejected');
  await assert.rejects(run(()=>auth.updateUser(worker.id,{plantId:destination.id,organizationId:sibling.id})),{status:400});
  await assert.rejects(db.query('UPDATE users SET plant_id=$1,organization_id=$2 WHERE id=$3',[destination.id,sibling.id,worker.id]));
 });
 await test('repeat archive is idempotent and codes remain reserved',async()=>{
  const before=Number((await db.query('SELECT count(*) FROM enterprise_archive_events'))[0].count);
  await run(()=>enterprise.archiveEntity('plant',independent.id,false));
  assert.equal(Number((await db.query('SELECT count(*) FROM enterprise_archive_events'))[0].count),before);
  await assert.rejects(enterprise.createPlant({name:'Duplicate',code:'TEST-PLANT2',organizationId:org.id}),{status:409});
 });
 console.log(`${count} archive integration groups passed`);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(db?.isInitialized)await db.destroy();await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();});
