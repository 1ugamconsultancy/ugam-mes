process.env.NODE_ENV='test';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {provenance}=require('../.security-build/common/provenance');
const {OeeService}=require('../.security-build/production/oee.service');
test('missing, fresh, stale, historical and simulated provenance are distinct',()=>{
 assert.equal(provenance('RECORDED',null,['Missing']).availability,'UNAVAILABLE');
 assert.equal(provenance('RECORDED',new Date()).availability,'AVAILABLE');
 assert.equal(provenance('RECORDED','2020-01-01').availability,'STALE');
 assert.equal(provenance('RECORDED','2020-01-01',[],[],{start:'2020-01-01',end:'2020-01-02'}).availability,'AVAILABLE');
 assert.equal(provenance('SIMULATED',new Date()).sourceKind,'SIMULATED');
});
test('empty and partial OEE never invent runtime, ideal rate, counts or forecasts',async()=>{
 const empty=new OeeService({find:async()=>[]});const missing=await empty.calculateOee('machine');
 assert.equal(missing.oee,null);assert.equal(missing.goodCount,null);assert.equal(missing.quality,null);
 const measured=new OeeService({find:async()=>[{id:'record',countGood:0,countScrap:5,timestamp:new Date()}]});const result=await measured.calculateOee('machine');
 assert.equal(result.goodCount,0);assert.equal(result.quality,0);assert.equal(result.availability,null);assert.equal(result.performance,null);
 const prediction=await empty.getPredictiveAnalytics('machine','PNP-01');assert.equal(prediction.timeUntilFailureHours,null);assert.equal(prediction.provenance.availability,'UNAVAILABLE');
});
