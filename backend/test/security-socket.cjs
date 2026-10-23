// Run in the frontend builder (socket.io-client available) against the restored database.
const { io }=require('socket.io-client');
const fs=require('fs'),assert=require('node:assert/strict');
const base=process.env.SECURITY_TEST_BASE_URL||'http://ugam-security-validation:3000';
const credentials=JSON.parse(fs.readFileSync('/app/security-credentials.json','utf8')).accounts;
const clients=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function login(username,plantId,organizationId) {
 const password=credentials.find(a=>a.username===username).password;
 const res=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,plantId,organizationId})});
 assert.equal(res.status,201);return(await res.json()).access_token;
}
async function connect(token) {
 const socket=io(base,{transports:['websocket'],auth:token?{token}:{},reconnection:false,timeout:3000});clients.push(socket);
 await new Promise(resolve=>{socket.once('connect',resolve);socket.once('connect_error',resolve);socket.once('disconnect',resolve);setTimeout(resolve,3500).unref();});
 await sleep(200);return socket;
}
(async()=>{
 const a=await login('admin','a0000000-0001-1111-1111-111111111111','10000000-0000-0000-0000-000000000001');
 const f=await login('food_op1','a0000000-0002-2222-2222-222222222222','10000000-0000-0000-0000-000000000002');
 const auto=await connect(a),food=await connect(f),anonymous=await connect();
 assert.equal(auto.connected,true);assert.equal(food.connected,true);assert.equal(anonymous.connected,false);
 let autoEvents=0,foodEvents=0;
 auto.on('liveCounterUpdated',()=>autoEvents++);food.on('liveCounterUpdated',()=>foodEvents++);
 const machines=await(await fetch(base+'/plants/machines',{headers:{Authorization:`Bearer ${a}`}})).json();
 assert.ok(machines.length);
 const log=await fetch(base+'/production/log',{method:'POST',headers:{Authorization:`Bearer ${a}`,'Content-Type':'application/json'},body:JSON.stringify({machineId:machines[0].id,good:0,scrap:0})});
 assert.equal(log.status,201);await sleep(300);
 assert.equal(autoEvents,1);assert.equal(foodEvents,0);
 console.log('PASS: real Socket.IO handshakes reject anonymous access; automotive production events reach only the automotive client.');
})().catch(err=>{console.error(err.message);process.exitCode=1;}).finally(()=>clients.forEach(s=>s.disconnect()));
