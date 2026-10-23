const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
process.env.NODE_ENV = 'test';
// Service tests mock the bcrypt boundary, not the access decisions under test.
const load = Module._load;
Module._load = function(name, ...args) {
 if (name === 'bcrypt') return { compare: async (password, hash) => hash === `test:${password}`, hash: async password => `test:${password}` };
 return load.call(this, name, ...args);
};
const { AuthService } = require('../.security-build/auth/auth.service');
const { AuthGuard } = require('../.security-build/auth/auth.guard');
const { accessStorage, currentPlant } = require('../.security-build/auth/access-context');
const { WorkOrdersService } = require('../.security-build/work-orders/work-orders.service');
const { ProductionGateway } = require('../.security-build/production/production.gateway');
const { OpcService } = require('../.security-build/opc/opc.service');
const { ComplianceService } = require('../.security-build/compliance/compliance.service');
const { validate } = require('class-validator');
const { plainToInstance } = require('class-transformer');
const { CreateUserDto } = require('../.security-build/auth/user.dto');
const plantA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const plantB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const orgA = '11111111-1111-4111-8111-111111111111';
const orgB = '22222222-2222-4222-8222-222222222222';
function fixture() {
 const users = [
  { id: 'admin-a', username: 'admin.a', role: 'ADMIN', plantId: plantA, organizationId: orgA, sessionVersion: 0, isActive: true, passwordHash: 'test:correct password' },
  { id: 'operator-b', username: 'operator.b', role: 'OPERATOR', plantId: plantB, organizationId: orgB, sessionVersion: 0, isActive: true, passwordHash: 'test:correct password' },
  { id: 'super', username: 'super', role: 'SUPER_ADMIN', plantId: null, organizationId: null, sessionVersion: 0, isActive: true, passwordHash: 'test:correct password' }
 ];
 const matches = (u,q) => Object.entries(q).every(([k,v])=>u[k]===v);
 const repo = {
  findOneBy: async q => users.find(u=>matches(u,q)),
  findOne: async q => users.find(u=>matches(u,q.where)),
  find: async q => users.filter(u=>matches(u,q?.where || {})),
  create: q=>q,
  save: async u=> { if (!u.id) { u.id=`user-${users.length}`; users.push(u); } return u; }
 };
 repo.manager={transaction:async fn=>fn({query:async()=>[],getRepository:()=>repo})};
 const plants = [{ id: plantA, organizationId: orgA, status: 'ACTIVE' }, { id: plantB, organizationId: orgB, status: 'ACTIVE' }];
 const orgs = [{ id: orgA, isActive: true }, { id: orgB, isActive: true }];
 let claims;
 const jwt = { signAsync: async p=>{ claims=p; return 'signed'; }, verifyAsync: async()=>claims };
 const service = new AuthService(repo, {findOneBy:async q=>plants.find(p=>matches(p,q))}, {findOneBy:async q=>orgs.find(o=>matches(o,q))}, {findOneBy:async()=>null}, jwt);
 return { users, repo, plants, orgs, service, setClaims:p=>claims=p };
}
const actor = (role='ADMIN', plantId=plantA, sub='admin-a')=>({sub,username:'admin.a',role,plantId,organizationId:plantId===plantB?orgB:orgA,sessionVersion:0});
test('login normalizes username and rejects former bypass passwords', async()=> {
 const f=fixture(); const result=await f.service.login(' ADMIN.A ','correct password',plantA,orgA);
 assert.equal(result.user.plantId,plantA);
 for (const password of ['SecretMESPassword123','admin','admin123','password']) await assert.rejects(f.service.login('admin.a',password));
});
test('ordinary login cannot choose another plant or organization', async()=> {
 const f=fixture(); await assert.rejects(f.service.login('admin.a','correct password',plantB,orgB), {status:403});
 await assert.rejects(f.service.login('admin.a','correct password',plantA,orgB), {status:403});
});
test('super admin uses explicit plant context or global administration', async()=> {
 const f=fixture(); assert.equal((await f.service.login('super','correct password')).user.plantId,null);
 assert.equal((await f.service.login('super','correct password',plantB,orgB)).user.plantId,plantB);
 await assert.rejects(f.service.login('super','correct password',plantB,orgA));
});
test('inactive and inconsistent assignments fail closed', async()=> {
 const f=fixture(); f.plants[0].status='INACTIVE'; await assert.rejects(f.service.login('admin.a','correct password'));
 f.plants[0].status='ACTIVE'; f.users[0].organizationId=orgB; await assert.rejects(f.service.login('admin.a','correct password'));
});
test('plant admin cannot escalate, transfer, edit foreign users, or list foreign accounts', async()=> {
 const f=fixture(); await accessStorage.run(actor(), async()=> {
  await assert.rejects(f.service.createUser({username:'evil',role:'SUPER_ADMIN'}),{status:403});
  await assert.rejects(f.service.createUser({username:'evil',plantId:plantB,role:'OPERATOR'}),{status:403});
  await assert.rejects(f.service.updateUser('operator-b',{role:'ADMIN'}),{status:404});
  await assert.rejects(f.service.updateUser('admin-a',{plantId:plantB}),{status:403});
  const users=await f.service.getUsers(); assert.deepEqual(users.map(u=>u.id),['admin-a']); assert.equal(users[0].passwordHash,undefined);
 });
});
test('new plant users inherit administrator scope and safe response',async()=> {
 const f=fixture(); await accessStorage.run(actor(),async()=> {
  const u=await f.service.createUser({username:' New.Operator ',role:'OPERATOR',password:'a long password',email:'new@example.com'});
  assert.equal(u.username,'new.operator');assert.equal(u.plantId,plantA);assert.equal(u.organizationId,orgA);assert.equal(u.passwordHash,undefined);
 });
});
test('super admin transfer derives organization and revokes old token',async()=> {
 const f=fixture(); const old={sub:'admin-a',role:'ADMIN',plantId:plantA,organizationId:orgA,sessionVersion:0}; f.setClaims(old);
 await f.service.authenticateToken('token');
 await accessStorage.run(actor('SUPER_ADMIN',null,'super'),()=>f.service.updateUser('admin-a',{plantId:plantB}));
 assert.equal(f.users[0].organizationId,orgB);await assert.rejects(f.service.authenticateToken('token'),{status:401});
});
test('missing session version and deactivated accounts cannot reuse tokens',async()=> {
 const f=fixture(); f.setClaims({sub:'admin-a',role:'ADMIN'});await assert.rejects(f.service.authenticateToken('token'));
 f.setClaims({sub:'admin-a',role:'ADMIN',sessionVersion:0,plantId:plantA,organizationId:orgA});f.users[0].isActive=false;await assert.rejects(f.service.authenticateToken('token'));
});
test('DTO validation rejects unknown roles and normalizes usernames',async()=> {
 const dto=plainToInstance(CreateUserDto,{username:' Operator.A ',email:'a@example.com',password:'a long password',role:'INVALID'});
 assert.equal(dto.username,'operator.a');assert.ok((await validate(dto)).some(e=>e.property==='role'));
});
test('global guard requires selected plant for manufacturing and checks current role',async()=> {
 const req={headers:{authorization:'Bearer token'}};
 const ctx={switchToHttp:()=>({getRequest:()=>req}),getHandler:()=>({}),getClass:()=>({name:'OpcController'})};
 const auth={authenticateToken:async()=>actor('SUPER_ADMIN',null,'super')};
 const reflector={getAllAndOverride:key=>key==='public'?false:undefined};
 await assert.rejects(new AuthGuard(auth,reflector).canActivate(ctx),{status:403});
 auth.authenticateToken=async()=>actor('OPERATOR');reflector.getAllAndOverride=key=>key==='public'?false:['ADMIN'];
 await assert.rejects(new AuthGuard(auth,reflector).canActivate(ctx),{status:403});
});
test('work order list and ID lookup include active plant',async()=> {
 const queries=[];const repo={find:async q=>{queries.push(q);return[];},findOne:async q=>{queries.push(q);return null;}};
 const service=new WorkOrdersService({describe:async()=>({})},repo,{});
 await accessStorage.run(actor(),async()=>{await service.findAll();await assert.rejects(service.findById('foreign'),{status:404});});
 assert.equal(queries[0].where.plantId,plantA);assert.deepEqual(queries[1].where,{id:'foreign',plantId:plantA});
});
test('concurrent async contexts remain isolated',async()=> {
 const results=await Promise.all([plantA,plantB].map(p=>accessStorage.run(actor('OPERATOR',p),async()=>{await new Promise(r=>setTimeout(r,5));return currentPlant();})));
 assert.deepEqual(results,[plantA,plantB]);assert.throws(()=>currentPlant());
});
test('socket clients join only authenticated plant room and broadcasts target rooms',async()=> {
 const gateway=new ProductionGateway({authenticateToken:async token=>({...actor('OPERATOR',token==='a'?plantA:plantB),exp:Math.floor(Date.now()/1000)+60})});
 const rooms=[]; const emitted=[];
 gateway.server={to:room=>({emit:(event,data)=>emitted.push({room,event,data})})};
 for(const [id,token] of [['1','a'],['2','b']]) {
  const client={id,connected:true,data:{},handshake:{auth:{token}},join:async room=>rooms.push(room),disconnect:()=>{}};
  await gateway.handleConnection(client); gateway.handleDisconnect(client);
 }
 gateway.broadcastAlert(plantA,'Title','Message','WARNING');
 assert.deepEqual(rooms.filter(r=>r.startsWith('plant:')),[`plant:${plantA}`,`plant:${plantB}`]);assert.equal(emitted[0].room,`plant:${plantA}`);
});
test('OPC reads and logs are plant scoped; read-only writes never reach equipment',async()=> {
 const queries=[]; const db={query:async(sql,args)=>{queries.push({sql,args});if(sql.startsWith('SELECT data'))return[{data:{tagName:'tag',equipmentCode:'MC',accessMode:'READ_ONLY'}}];if(sql.includes('SELECT m.id'))return[{id:'m'}];return[];}};
 await accessStorage.run(actor(),async()=> {
  const opc=new OpcService(db);await opc.getTags();await opc.getAuditLogs();await assert.rejects(opc.writeTag({tagName:'tag',value:1}),{status:400});
 });
 assert.ok(queries.filter(q=>!q.sql.includes('SELECT m.id')).every(q=>q.args[0]===plantA));assert.ok(!queries.some(q=>q.sql.startsWith('INSERT')));
});
test('OPC audit failure prevents physical command dispatch',async()=> {
 let fetches=0;const original=global.fetch;global.fetch=async()=>{fetches++;throw new Error();};
 process.env.OPC_ALLOWED_ENDPOINTS='http://equipment.example/readwrite';
 const db={query:async(sql)=>{
  if(sql.startsWith('SELECT data FROM opc_tags'))return[{data:{tagName:'tag',equipmentCode:'MC',accessMode:'READ_WRITE',dataType:'INTEGER',currentValue:0,kepwareAddress:'MC.tag'}}];
  if(sql.includes('SELECT m.id'))return[{id:'m'}];
  if(sql.startsWith('SELECT data FROM opc_server'))return[{data:{endpointUrl:'http://equipment.example/readwrite'}}];
  if(sql.startsWith('INSERT INTO opc_command_audit'))throw new Error('Database unavailable');return[];
 }};
 try {await accessStorage.run(actor(),async()=>{await assert.rejects(new OpcService(db).writeTag({tagName:'tag',value:1}));});assert.equal(fetches,0);} finally {global.fetch=original;}
});
test('signatures reject bypass passwords, altered whitespace, and foreign plant signers',async()=> {
 const f=fixture(); const saved=[];
 const signatures={create:v=>v,save:async v=>{saved.push(v);return v;}};
 const audits={create:v=>v,save:async v=>v};
 signatures.manager={transaction:async fn=>fn({getRepository:entity=>entity.name==='ElectronicSignature'?signatures:audits})};
 const compliance=new ComplianceService(f.repo,signatures,audits,{}, {}, {}, {});
 await accessStorage.run(actor(),async()=> {
  for(const password of ['admin','admin123','password','SecretMESPassword123',' correct password ']) await assert.rejects(compliance.sign('admin.a',password,'Approval'),{status:401});
  await assert.rejects(compliance.sign('operator.b','correct password','Approval'),{status:401});
  await compliance.sign('admin.a','correct password','Approval');
 });
 assert.equal(saved.length,1); assert.equal(saved[0].userId,'admin-a');
});
test('sockets reject missing/invalid authentication before joining any room',async()=> {
 const gateway=new ProductionGateway({authenticateToken:async()=>{throw new Error('Invalid');}},{});
 for(const auth of [{},{token:'invalid'}]) {
  let disconnected=false;let joined=false;
  await gateway.handleConnection({id:'bad',data:{},handshake:{auth},join:async()=>{joined=true;},disconnect:()=>{disconnected=true;}});
  assert.equal(disconnected,true);assert.equal(joined,false);
 }
});
test('operator messages cannot target a user from another plant',async()=> {
 const calls=[];
 const gateway=new ProductionGateway({authenticateToken:async()=>actor('SUPERVISOR')},{query:async(sql,args)=>{calls.push(args);return[];}});
 gateway.server={to:()=>{throw new Error('Must not emit');}};
 const result=await gateway.handlePingOperator({handshake:{auth:{token:'a'}},disconnect:()=>{}},{operatorId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',message:'Check line'});
 assert.equal(result.error,'Recipient not found');assert.equal(calls[0][1],plantA);
});
test('production OPC connection failure stays offline instead of simulating success',async()=> {
 const original=global.fetch;global.fetch=async()=>{throw new Error('Offline');};
 process.env.OPC_ALLOWED_ENDPOINTS='http://equipment.example/readwrite';
 const db={query:async sql=>sql.startsWith('SELECT data FROM opc_server')?[{data:{endpointUrl:'http://equipment.example/readwrite'}}]:[]};
 try {
  const result=await accessStorage.run(actor(),()=>new OpcService(db).testConnection());
  assert.equal(result.success,false);assert.equal(result.status,'OFFLINE');
 } finally {global.fetch=original;}
});
test('unconfirmed equipment write is audited UNKNOWN and never updates a tag',async()=> {
 const original=global.fetch;global.fetch=async()=>{throw new Error('Timeout');};
 process.env.OPC_ALLOWED_ENDPOINTS='http://equipment.example/readwrite';const queries=[];
 const db={query:async(sql,args)=>{
  queries.push({sql,args});
  if(sql.startsWith('SELECT data FROM opc_tags'))return[{data:{tagName:'tag',equipmentCode:'MC',accessMode:'READ_WRITE',dataType:'INTEGER',currentValue:0,kepwareAddress:'MC.tag'}}];
  if(sql.includes('SELECT m.id'))return[{id:'m'}];
  if(sql.startsWith('SELECT data FROM opc_server'))return[{data:{endpointUrl:'http://equipment.example/readwrite'}}];return[];
 }};
 try {
  await accessStorage.run(actor(),async()=>assert.rejects(new OpcService(db).writeTag({tagName:'tag',value:1,user:'forged'}),{status:503}));
  assert.equal(queries.find(q=>q.sql.startsWith('INSERT INTO opc_command_audit')).args[3],'admin.a');
  assert.equal(queries.find(q=>q.sql.startsWith('UPDATE opc_command_audit')).args[1],'UNKNOWN');
  assert.equal(queries.some(q=>q.sql.startsWith('UPDATE opc_tags')),false);
 } finally {global.fetch=original;}
});
after(()=>{Module._load=load;});
