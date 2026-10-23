// Read-only smoke checks for the deployed seed accounts; credentials/tokens stay local.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const accounts=JSON.parse(fs.readFileSync(process.env.SECURITY_TEST_CREDENTIALS||path.resolve(__dirname,'../../security-bootstrap-credentials.json'),'utf8')).accounts;
const base=process.env.SECURITY_TEST_BASE_URL||'http://127.0.0.1:3001';
const auto='a0000000-0001-1111-1111-111111111111',food='a0000000-0002-2222-2222-222222222222';
const autoOrg='10000000-0000-0000-0000-000000000001',foodOrg='10000000-0000-0000-0000-000000000002';
let checks=0;
async function request(route,token,status,method='GET',body) {
 const res=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 assert.equal(res.status,status,`${method} ${route}: expected ${status}, got ${res.status}`);checks++;return res.json();
}
(async()=>{
 const tokens={};
 for(const account of accounts) {
  const isFood=account.username==='food_op1',global=account.role==='SUPER_ADMIN';
  const login=await request('/auth/login',null,201,'POST',{username:account.username,password:account.password,...(!global?{plantId:isFood?food:auto,organizationId:isFood?foodOrg:autoOrg}:{})});
  assert.equal(login.user.role,account.role);tokens[account.username]=login.access_token;
  assert.equal((await request('/auth/profile',login.access_token,200)).username,account.username);
 }
 const a=tokens.admin,f=tokens.food_op1,s=tokens.superadmin;
 await request('/auth/login',null,401,'POST',{username:'admin',password:'SecretMESPassword123'});
 await request('/opc/tags',null,401);await request('/auth/users',f,403);
 assert.equal((await request('/work-orders',a,200)).length,6);assert.deepEqual(await request('/work-orders',f,200),[]);
 assert.equal((await request('/inventory/stock',a,200)).length,5);assert.deepEqual(await request('/inventory/stock',f,200),[]);
 await request('/work-orders/80111111-0003-1111-1111-111111111111',f,404);
 await request('/inventory/traceability/PO-260003',f,404);
 await request('/inventory/traceability/PO-260003',a,200);
 await request('/ebr/80111111-0003-1111-1111-111111111111',f,404);
 await request('/work-orders',s,403);assert.equal((await request('/enterprise/users',s,200)).length,7);
 const users=await request('/auth/users',a,200);assert.equal(users.length,5);assert.ok(users.every(u=>!('passwordHash'in u)));
 console.log(`PASS: ${checks} deployed read-only HTTP checks; all seven accounts authenticate, former bypass rejected, and plant boundaries verified.`);
})().catch(err=>{console.error(err.message);process.exitCode=1;});
