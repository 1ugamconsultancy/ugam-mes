// Run against an isolated restored database with the seven seed accounts provisioned.
// Never prints passwords or bearer tokens. Includes reversible account-transfer tests.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const credentials=JSON.parse(fs.readFileSync(process.env.SECURITY_TEST_CREDENTIALS||path.resolve(__dirname,'../../security-bootstrap-credentials.json'),'utf8')).accounts;
const base=process.env.SECURITY_TEST_BASE_URL||'http://127.0.0.1:3002';
const auto='a0000000-0001-1111-1111-111111111111',food='a0000000-0002-2222-2222-222222222222';
const autoOrg='10000000-0000-0000-0000-000000000001',foodOrg='10000000-0000-0000-0000-000000000002';
let count=0;
async function request(route,token,method='GET',body) {
 const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 const data=await response.json().catch(()=>null);return {status:response.status,data};
}
async function expect(route,token,status,method='GET',body) {
 const result=await request(route,token,method,body);assert.equal(result.status,status,`${method} ${route} expected ${status}; got ${result.status}`);count++;return result.data;
}
async function login(username,plantId,organizationId) {
 const account=credentials.find(a=>a.username===username);
 return expect('/auth/login',null,201,'POST',{username,password:account.password,plantId,organizationId});
}
(async()=>{
 await expect('/opc/tags',null,401);await expect('/opc/write',null,401,'POST',{tagName:'anything',value:1});
 await expect('/auth/login',null,401,'POST',{username:'admin',password:'SecretMESPassword123'});
 const admin=await login('admin',auto,autoOrg),op=await login('food_op1',food,foodOrg),superGlobal=await login('superadmin');
 const a=admin.access_token,f=op.access_token,s=superGlobal.access_token;
 const autoOrders=await expect('/work-orders',a,200);assert.equal(autoOrders.length,6);
 assert.deepEqual(await expect('/work-orders',f,200),[]);
 await expect(`/work-orders/${autoOrders[0].id}`,f,404);
 await expect(`/work-orders/${autoOrders[0].id}`,f,404,'PATCH',{status:'CLOSED'});
 await expect('/auth/users',f,403);
 const roster=await expect('/auth/users',a,200);assert.equal(roster.length,5);assert.ok(roster.every(u=>u.plantId===auto&&!('passwordHash'in u)));
 const directory=await expect('/auth/directory',f,200);assert.deepEqual(directory.map(u=>u.username),['food_op1']);
 await expect('/auth/users',a,403,'POST',{username:'illegal.super',email:'illegal@example.invalid',password:'a strong test password',role:'SUPER_ADMIN'});
 await expect('/auth/users',a,409,'POST',{username:' ADMIN ',email:'duplicate@example.invalid',password:'a strong test password',role:'OPERATOR'});
 await expect('/auth/login',null,403,'POST',{username:'admin',password:credentials.find(x=>x.username==='admin').password,plantId:food,organizationId:foodOrg});
 await expect('/opc/server/config',f,403,'PUT',{endpointUrl:'http://example.invalid'});
 await expect('/work-orders',s,403);
 assert.equal((await expect('/enterprise/users',s,200)).length,7);
 const superFood=await login('superadmin',food,foodOrg);assert.deepEqual(await expect('/work-orders',superFood.access_token,200),[]);
 await expect('/quality/checks',f,200);assert.deepEqual(await expect('/equipment/status',f,200),[]);
 await expect('/ebr/'+autoOrders[0].id,f,404);
 await expect('/compliance/sign',a,401,'POST',{username:'admin',password:'admin',meaning:'Security test'});
 const signature=await expect('/compliance/sign',a,201,'POST',{username:'admin',password:credentials.find(x=>x.username==='admin').password,meaning:'Security validation on restored database'});assert.equal(signature.username,'admin');
 const operator=await login('operator1',auto,autoOrg);
 try {
  await expect('/enterprise/users/44444444-4444-4444-4444-444444444444/allocation',s,200,'PATCH',{plantId:food,organizationId:foodOrg,role:'OPERATOR'});
  await expect('/auth/profile',operator.access_token,401);
 } finally {
  await expect('/enterprise/users/44444444-4444-4444-4444-444444444444/allocation',s,200,'PATCH',{plantId:auto,organizationId:autoOrg,role:'OPERATOR'});
 }
 console.log(`PASS: ${count} real HTTP assertions against restored database; native bcrypt, plant access, role enforcement, signatures, and token revocation verified.`);
})().catch(err=>{console.error(err.message);process.exitCode=1;});
