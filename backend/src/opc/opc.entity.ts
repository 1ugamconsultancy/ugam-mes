export type OpcDataType = 'BOOLEAN' | 'FLOAT' | 'INTEGER' | 'STRING';
export type OpcAccessMode = 'READ_ONLY' | 'READ_WRITE';
export type OpcQuality = 'GOOD' | 'BAD' | 'UNCERTAIN' | 'COMM_FAILURE';

export interface OpcTag {
  id: string;
  tagName: string;           // Channel.Device.Tag identifier, e.g. "CUT_01.PLC.Cmd_Start"
  kepwareAddress: string;    // Kepware internal tag address, e.g. "Channel1.CUT_01.Cmd_Start"
  equipmentCode: string;     // Mapped MES equipment, e.g. "CUT-01"
  description: string;       // Human readable tag description
  dataType: OpcDataType;
  accessMode: OpcAccessMode;
  currentValue: any;
  engineeringUnits?: string; // e.g. "°C", "RPM", "bar", "cuts/min"
  quality: OpcQuality;
  scanRateMs?: number;
  alarmHiLimit?: number | null;
  alarmLowLimit?: number | null;
  isAlarmActive?: boolean;
  lastUpdated: string;
}

export interface OpcAuditLog {
  id: string;
  timestamp: string;
  tagName: string;
  action: 'READ' | 'WRITE' | 'ALARM_TRIP' | 'ALARM_CLEAR' | 'SYNC' | 'CONNECT';
  oldValue?: any;
  newValue?: any;
  user?: string;
  status: 'SUCCESS' | 'ERROR';
  details?: string;
}

export interface KepwareServerConfig {
  endpointUrl: string;
  protocol: 'KEPWARE_REST' | 'OPC_UA';
  scanRateMs: number;
  status: 'CONNECTED' | 'SIMULATION' | 'OFFLINE';
  lastHeartbeat: string;
  activeTagsCount: number;
  totalWrites: number;
}

export interface WriteTagDto {
  tagName: string;
  value: any;
  user?: string;
  notes?: string;
}

export interface CreateTagDto {
  tagName: string;
  kepwareAddress?: string;
  equipmentCode: string;
  description: string;
  dataType: OpcDataType;
  accessMode: OpcAccessMode;
  initialValue?: any;
  engineeringUnits?: string;
  alarmHiLimit?: number;
  alarmLowLimit?: number;
}
