// Live smoke test: creates and removes only uniquely named disposable enterprise records.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{Client}=require('pg');
if(process.argv[2]!=='--development')throw Error('Use --development for this local installation');
const base='http://127.0.0.1:8085/api';let token,org,plant;const marker='ARCHIVE-QA-'+Date.now();
async function api(route,method='GET',body,expected=200){const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,expected,JSON.stringify({route,status:r.status,data}));return data;}
async function main(){
 token=(await api('/auth/login','POST',{username:'superadmin',password:'MES123'},201)).access_token;
 org=await api('/enterprise/organizations','POST',{name:'Disposable archive verification',code:marker,industryType:'AUTOMOTIVE'},201);
 plant=await api('/enterprise/plants','POST',{name:'Disposable archive plant',code:marker+'-P',organizationId:org.id},201);
 await api(`/enterprise/plants/${plant.id}/archive`,'POST',{},201);
 assert.equal((await api('/enterprise/plants')).some(p=>p.id===plant.id),false);
 assert.ok((await api('/enterprise/plants?includeArchived=true')).find(p=>p.id===plant.id).archivedAt);
 await api(`/enterprise/plants/${plant.id}`,'PATCH',{name:'Blocked edit'},409);
 await api(`/enterprise/plants/${plant.id}/restore`,'POST',{},201);
 await api(`/enterprise/organizations/${org.id}/archive`,'POST',{},201);
 assert.equal((await api('/enterprise/plants?includeArchived=true')).find(p=>p.id===plant.id).inheritedArchived,true);
 await api(`/enterprise/plants/${plant.id}/restore`,'POST',{},409);
 await api(`/enterprise/organizations/${org.id}/restore`,'POST',{},201);
 assert.equal((await api('/enterprise/plants')).find(p=>p.id===plant.id).archivedAt,null);
 console.log('PASS live create, archive, restore, filtering, inherited suspension and archived-edit rejection');
}
async function cleanup(){if(!org)return;assert.equal(org.code,marker);const yaml=fs.readFileSync(path.join(__dirname,'../../docker-compose.yml'),'utf8');const db=new Client({host:'127.0.0.1',port:5434,user:'mes_admin',database:'ugam_mes',password:yaml.match(/POSTGRES_PASSWORD:\s*(\S+)/)[1]});await db.connect();try{await db.query('BEGIN');const ids=[org.id,...(plant?[plant.id]:[])];await db.query('DELETE FROM enterprise_archive_events WHERE entity_id=ANY($1::uuid[])',[ids]);if(plant){await db.query('DELETE FROM plant_theme_settings WHERE plant_id=$1',[plant.id]);await db.query('DELETE FROM plants WHERE id=$1 AND code=$2',[plant.id,marker+'-P']);}await db.query('DELETE FROM organizations WHERE id=$1 AND code=$2',[org.id,marker]);await db.query('COMMIT');console.log('Disposable smoke-test records removed');}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>cleanup().catch(e=>{console.error('Cleanup failed: '+e.message);process.exitCode=1;}));
