export type RegisterType =
  | 'default' | 'rw' | 'indirect' | 'external' | 'reserved' | 'maskable';

export const BIT_FIELD_TYPES = [
  'rw', 'ro', 'wo', 'w1', 'wo1',
  'rc', 'rs',
  'rof', 'rohw',
  'rotrg', 'wotrg', 'rwtrg', 'w1trg', 'w0trg',
  'rowo', 'rowotrg', 'row0trg', 'row1trg',
  'wrc', 'wrs',
  'rwc', 'rws', 'rwhw', 'rwe', 'rwl',
  'w1c', 'w0c', 'wc',
  'w1s', 'w0s', 'ws',
  'w1t', 'w0t',
  'woc', 'wos',
  'w0crs', 'w1crs', 'wcrs',
  'w0src', 'w1src', 'wsrc',
  'counter', 'custom', 'reserved',
] as const;

export type BitFieldType = typeof BIT_FIELD_TYPES[number];

// Types that do NOT support initial_value
export const NO_INITIAL_VALUE_TYPES: ReadonlySet<BitFieldType> = new Set([
  'ro', 'rotrg', 'w0trg', 'w1trg', 'row0trg', 'row1trg', 'reserved',
] as BitFieldType[]);

export const SW_READ_VALUES = ['default', 'none', 'clear', 'set'] as const;
export type CustomSwRead = typeof SW_READ_VALUES[number];

export const SW_WRITE_VALUES = [
  'default', 'none',
  'clear', 'clear_0', 'clear_1',
  'set', 'set_0', 'set_1',
  'toggle_0', 'toggle_1',
] as const;
export type CustomSwWrite = typeof SW_WRITE_VALUES[number];

export interface IndirectQualifier {
  id: string;
  bitFieldRef: string;
  fixedValue: string;
}

export interface BitField {
  id: string;
  name: string;
  lsb: string;
  width: string;
  type: BitFieldType;
  initialValue: string;
  parameterize: boolean;
  comment: string;
  reference: string;
  sequenceSize: string;
  sequenceStep: string;
  customSwRead: CustomSwRead;
  customSwWrite: CustomSwWrite;
  customSwWriteOnce: boolean;
  customHwWrite: boolean;
  customHwSet: boolean;
  customHwClear: boolean;
  customReadTrigger: boolean;
  customWriteTrigger: boolean;
  showAdvanced: boolean;
}

export interface Register {
  id: string;
  name: string;
  offsetAddress: string;
  type: RegisterType;
  comment: string;
  bitFields: BitField[];
  expanded: boolean;
  arraySize: string;
  arrayStep: string;
  indirectQualifiers: IndirectQualifier[];
  showAdvanced: boolean;
}

export interface RegisterBlock {
  id: string;
  name: string;
  busWidth: 8 | 16 | 32 | 64 | '';
  byteSize: string;
  comment: string;
  registers: Register[];
}

export type Protocol = 'apb' | 'axi4lite' | 'avalon' | 'wishbone';

export interface ProjectConfig {
  busWidth: 8 | 16 | 32 | 64;
  addressWidth: string;
  protocol: Protocol;
}
