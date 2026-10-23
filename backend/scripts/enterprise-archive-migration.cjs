// Targets this installation's development database only. Does not change archive state of existing records.
const fs=require('node:fs'),path=require('node:path'),{Client}=require('pg');
const root=path.resolve(__dirname,'../..'),yaml=fs.readFileSync(path.join(root,'docker-compose.yml'),'utf8');
const client=new Client({host:'127.0.0.1',port:5434,user:'mes_admin',database:'ugam_mes',password:yaml.match(/POSTGRES_PASSWORD:\s*(\S+)/)[1]});
async function main(){
 await client.connect();
 if(process.argv[2]==='apply'){
  if(process.argv[3]!=='--development')throw Error('Explicit --development acknowledgement required');
  await client.query(fs.readFileSync(path.join(__dirname,'../migrations/20261018_enterprise_archive.sql'),'utf8'));
 }
 console.log(JSON.stringify({migration:(await client.query("SELECT version,applied_at FROM operational_migrations WHERE version='20261018_enterprise_archive'")).rows,
 organizations:(await client.query('SELECT count(*) AS total,count(archived_at) AS archived FROM organizations')).rows,
 plants:(await client.query('SELECT count(*) AS total,count(archived_at) AS archived FROM plants')).rows},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>client.end());
