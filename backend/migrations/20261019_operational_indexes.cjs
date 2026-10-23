// Executed by scripts/operational-indexes.cjs; concurrent DDL must not be wrapped in BEGIN.
module.exports = {
  version: '20261019_operational_indexes',
  indexes: [
    ['production_logs', ['work_order_id', 'timestamp', 'id']],
    ['production_logs', ['machine_id', 'timestamp'], 'evidence_verified = true'],
    ['quality_checks', ['work_order_id', 'created_at', 'id']],
    ['order_evidence', ['work_order_id', 'recorded_at', 'id']],
    ['order_transition_history', ['work_order_id', 'created_at', 'id']],
    ['deviations', ['work_order_id', 'reported_at', 'id']],
    ['material_consumptions', ['work_order_id', 'consumed_at', 'id']],
    ['dispensing_records', ['work_order_id']],
    ['material_inventory', ['material_batch_id', 'id']],
    ['material_inventory', ['storage_location_id']],
    ['storage_locations', ['warehouse_id']],
    ['warehouses', ['plant_id']],
    ['material_batches', ['goods_receipt_id']],
    ['material_batches', ['material_id']],
  ].map(([table, columns, predicate], i) => ({
    name: `opidx_20261019_${String(i + 1).padStart(2, '0')}`, table, columns, predicate,
  })),
};
