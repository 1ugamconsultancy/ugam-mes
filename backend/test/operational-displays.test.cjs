const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EquipmentService}=require('../.security-build/equipment/equipment.service');
const {accessStorage}=require('../.security-build/auth/access-context');
const run=fn=>accessStorage.run({sub:'u',role:'OPERATOR',plantId:'plant-a'},fn);
function fixture({counts=[],cal=[],qual=[],failure=false,master=[]}={}) {
  const calls=[];
  const service=new EquipmentService({find:async()=>cal},{find:async()=>qual},{},
    {find:async()=>[{id:'machine-a',code:'M1',name:'Machine',status:'IDLE',lastStatusChange:new Date('2026-01-01'),line:{area:{}}}],
      query:async(sql,args)=>{calls.push({sql,args});if(failure)throw Error('offline');return counts;}});
  service.getMasterEquipment=async()=>master;
  return {service,calls};
}
test('missing metadata and samples stay unavailable; status is not overridden by master',()=>run(async()=>{
  const {service}=fixture({master:[{equipmentId:'M1',status:'RUNNING',capacityPerShift:0}]});
  const [r]=await service.getEquipmentStatuses();
  assert.equal(r.produced,null);assert.equal(r.scrap,null);assert.equal(r.manufacturer,null);
  assert.equal(r.capacityPerShift,0);assert.equal(r.status,'IDLE');assert.equal(r.calibrationStatus,'Unavailable');
  assert.equal(r.qualificationType,'Unavailable');assert.equal(r.countProvenance.availability,'UNAVAILABLE');
  assert.equal(r.statusProvenance.observedAt,'2026-01-01T00:00:00.000Z');
}));
test('verified zeros survive; SQL restricts both machine and order to active plant',()=>run(async()=>{
  const {service,calls}=fixture({counts:[{machine_id:'machine-a',good:'0',scrap:'0',first_observation:'2026-01-01',last_observation:'2026-01-02'}]});
  const [r]=await service.getEquipmentStatuses();assert.equal(r.produced,0);assert.equal(r.scrap,0);
  assert.equal(r.countProvenance.availability,'AVAILABLE');assert.match(r.countProvenance.reportingPeriod.label,/lifetime/);
  assert.match(calls[0].sql,/a.plant_id=\$1 AND w.plant_id=\$1 AND p.evidence_verified=true/);
  assert.deepEqual(calls[0].args,['plant-a']);
}));
test('failed aggregation never reports zero',()=>run(async()=>{
  const [r]=await fixture({failure:true}).service.getEquipmentStatuses();
  assert.equal(r.produced,null);assert.match(r.countProvenance.missingInputs[0],/could not be loaded/);
}));
test('latest failed calibration is not hidden by older passing evidence',()=>run(async()=>{
  const [r]=await fixture({cal:[{machineId:'machine-a',calibrationDate:'2025-01-01',status:'PASSED',nextCalibrationDue:'2099-01-01'},
    {machineId:'machine-a',calibrationDate:'2026-01-01',status:'FAILED',nextCalibrationDue:'2099-01-01'}]}).service.getEquipmentStatuses();
  assert.equal(r.calibrationStatus,'FAILED');assert.notEqual(r.complianceStatus,'Qualified');
}));
