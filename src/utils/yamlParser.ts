import * as yaml from 'js-yaml';
import type { RegisterBlock, Register, BitField, IndirectQualifier, ProjectConfig, BitFieldType, RegisterType } from '../types/rggen';
import { BIT_FIELD_TYPES, NO_INITIAL_VALUE_TYPES } from '../types/rggen';

const REGISTER_TYPES = new Set<string>(['default', 'rw', 'indirect', 'external', 'reserved', 'maskable']);

function normalizeOffsetAddress(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  const num = Number(String(value).trim());
  if (!Number.isInteger(num) || num < 0) return String(value).replace(/^0x/i, '');
  return num.toString(16);
}
const BIT_FIELD_TYPE_SET = new Set<string>(BIT_FIELD_TYPES);
const BUS_WIDTHS = new Set([8, 16, 32, 64]);
const PROTOCOLS = new Set(['apb', 'axi4lite', 'avalon', 'wishbone']);

function obj(v: unknown, path: string): Record<string, unknown> {
  if (v === null || typeof v !== 'object' || Array.isArray(v))
    throw new Error(`${path}: object expected`);
  return v as Record<string, unknown>;
}

function arr(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`${path}: array expected`);
  return v;
}

function str(v: unknown, path: string): string {
  if (typeof v !== 'string') throw new Error(`${path}: string expected`);
  return v;
}

function num(v: unknown, path: string): number {
  if (typeof v !== 'number') throw new Error(`${path}: number expected`);
  return v;
}

function checkFields(o: Record<string, unknown>, allowed: string[], path: string) {
  for (const key of Object.keys(o))
    if (!allowed.includes(key)) throw new Error(`${path}: unknown field '${key}'`);
}

function parseBitAssignment(v: unknown, path: string) {
  const o = obj(v, path);
  checkFields(o, ['lsb', 'width', 'sequence_size', 'step'], path);
  return {
    lsb:          o.lsb           !== undefined ? String(num(o.lsb,           `${path}.lsb`))           : '',
    width:        o.width         !== undefined ? String(num(o.width,         `${path}.width`))         : '1',
    sequenceSize: o.sequence_size !== undefined ? String(num(o.sequence_size, `${path}.sequence_size`)) : '',
    sequenceStep: o.step          !== undefined ? String(num(o.step,          `${path}.step`))          : '',
  };
}

function parseBitField(v: unknown, path: string): BitField {
  const o = obj(v, path);
  checkFields(o, ['name', 'bit_assignment', 'type', 'initial_value', 'reference', 'comment'], path);

  const type = str(o.type, `${path}.type`);
  if (!BIT_FIELD_TYPE_SET.has(type))
    throw new Error(`${path}.type: unknown bit field type '${type}'`);

  if (o.bit_assignment === undefined)
    throw new Error(`${path}.bit_assignment: required`);
  const ba = parseBitAssignment(o.bit_assignment, `${path}.bit_assignment`);
  const noInit = NO_INITIAL_VALUE_TYPES.has(type as BitFieldType);
  const reference = o.reference !== undefined ? str(o.reference, `${path}.reference`) : '';
  const sequenceSize = ba.sequenceSize;

  let initialValue = noInit ? '' : '0';
  let parameterize = false;
  if (o.initial_value !== undefined) {
    if (typeof o.initial_value === 'object' && !Array.isArray(o.initial_value) && o.initial_value !== null) {
      const iv = o.initial_value as Record<string, unknown>;
      checkFields(iv, ['default'], `${path}.initial_value`);
      initialValue = iv.default !== undefined ? String(iv.default) : '0';
      parameterize = true;
    } else {
      initialValue = String(o.initial_value);
    }
  }

  return {
    id: crypto.randomUUID(),
    name:         o.name    !== undefined ? str(o.name,    `${path}.name`)    : '',
    lsb:          ba.lsb,
    width:        ba.width,
    sequenceSize,
    sequenceStep: ba.sequenceStep,
    type:         type as BitFieldType,
    initialValue,
    parameterize,
    reference,
    comment:      o.comment !== undefined ? str(o.comment, `${path}.comment`) : '',
    showAdvanced: reference !== '' || sequenceSize !== '',
  };
}

function parseRegisterType(v: unknown, path: string): { type: RegisterType; indirectQualifiers: IndirectQualifier[] } {
  if (v === undefined || v === null) return { type: 'default', indirectQualifiers: [] };

  if (typeof v === 'string') {
    if (!REGISTER_TYPES.has(v)) throw new Error(`${path}: unknown register type '${v}'`);
    return { type: v as RegisterType, indirectQualifiers: [] };
  }

  if (Array.isArray(v)) {
    if (v[0] !== 'indirect') throw new Error(`${path}: array type must start with 'indirect'`);
    const qualifiers: IndirectQualifier[] = v.slice(1).map((q, i) => {
      if (typeof q === 'string') return { id: crypto.randomUUID(), bitFieldRef: q, fixedValue: '' };
      if (Array.isArray(q) && q.length === 2) return { id: crypto.randomUUID(), bitFieldRef: String(q[0]), fixedValue: String(q[1]) };
      throw new Error(`${path}[${i + 1}]: invalid qualifier`);
    });
    return { type: 'indirect', indirectQualifiers: qualifiers };
  }

  throw new Error(`${path}: invalid type format`);
}

function parseRegisterSize(v: unknown, path: string): { arraySize: string; arrayStep: string } {
  if (v === undefined || v === null) return { arraySize: '', arrayStep: '' };
  if (typeof v === 'number') return { arraySize: String(v), arrayStep: '' };
  if (Array.isArray(v) && v.length >= 1) {
    // last element may be {step: N}
    const last = v[v.length - 1];
    const hasStep = typeof last === 'object' && last !== null && !Array.isArray(last);
    const dimElems = hasStep ? v.slice(0, -1) : v;

    if (!dimElems.every(e => typeof e === 'number'))
      throw new Error(`${path}: size dimensions must be numbers`);

    const arraySize = (dimElems as number[]).join(', ');
    let arrayStep = '';
    if (hasStep) {
      const stepObj = obj(last, `${path}[${v.length - 1}]`);
      checkFields(stepObj, ['step'], `${path}[${v.length - 1}]`);
      const step = stepObj.step !== undefined ? num(stepObj.step, `${path}[${v.length - 1}].step`) : 0;
      arrayStep = step ? String(step) : '';
    }
    return { arraySize, arrayStep };
  }
  throw new Error(`${path}: invalid size format`);
}

function parseRegister(v: unknown, path: string): Register {
  const o = obj(v, path);
  checkFields(o, ['name', 'offset_address', 'type', 'size', 'comment', 'bit_fields'], path);

  const { type, indirectQualifiers } = parseRegisterType(o.type, `${path}.type`);
  const { arraySize, arrayStep } = parseRegisterSize(o.size, `${path}.size`);

  const bitFields: BitField[] = [];
  if (o.bit_fields !== undefined)
    for (const [i, bf] of arr(o.bit_fields, `${path}.bit_fields`).entries())
      bitFields.push(parseBitField(bf, `${path}.bit_fields[${i}]`));

  return {
    id: crypto.randomUUID(),
    name:               o.name           !== undefined ? str(o.name,           `${path}.name`)           : '',
    offsetAddress:      normalizeOffsetAddress(o.offset_address),
    comment:            o.comment        !== undefined ? str(o.comment,        `${path}.comment`)        : '',
    type,
    indirectQualifiers,
    bitFields,
    arraySize,
    arrayStep,
    expanded:           true,
    showAdvanced:       arraySize !== '' || type === 'indirect',
  };
}

function parseBlock(v: unknown, path: string): RegisterBlock {
  const o = obj(v, path);
  checkFields(o, ['name', 'bus_width', 'byte_size', 'comment', 'registers'], path);

  const busWidth = o.bus_width !== undefined ? num(o.bus_width, `${path}.bus_width`) : 32;
  if (!BUS_WIDTHS.has(busWidth)) throw new Error(`${path}.bus_width: must be 8, 16, 32, or 64`);

  const registers: Register[] = [];
  if (o.registers !== undefined)
    for (const [i, r] of arr(o.registers, `${path}.registers`).entries())
      registers.push(parseRegister(r, `${path}.registers[${i}]`));

  return {
    id: crypto.randomUUID(),
    name:     o.name      !== undefined ? str(o.name,    `${path}.name`)    : '',
    busWidth: busWidth as 8 | 16 | 32 | 64,
    byteSize: o.byte_size !== undefined ? String(o.byte_size)               : '',
    comment:  o.comment   !== undefined ? str(o.comment, `${path}.comment`) : '',
    registers,
  };
}

export function parseBlockYaml(content: string): RegisterBlock[] {
  const raw = yaml.load(content);
  if (Array.isArray(raw))
    throw new Error('This YAML uses rggen\'s native input format, which is not supported.\nImport only accepts YAML files generated by RgGen Web UI.');
  const o = obj(raw, 'root');
  checkFields(o, ['register_blocks'], 'root');

  if (o.register_blocks === undefined) throw new Error('root.register_blocks: required');
  return arr(o.register_blocks, 'root.register_blocks')
    .map((b, i) => parseBlock(b, `register_blocks[${i}]`));
}

export function parseConfigYaml(content: string): ProjectConfig {
  const raw = yaml.load(content);
  const o = obj(raw, 'config');
  checkFields(o, ['bus_width', 'address_width', 'protocol', 'enable_wide_register'], 'config');

  const busWidth = o.bus_width !== undefined ? num(o.bus_width, 'config.bus_width') : 32;
  if (!BUS_WIDTHS.has(busWidth)) throw new Error('config.bus_width: must be 8, 16, 32, or 64');

  const protocol = o.protocol !== undefined ? str(o.protocol, 'config.protocol') : 'apb';
  if (!PROTOCOLS.has(protocol)) throw new Error(`config.protocol: unknown value '${protocol}'`);

  return {
    busWidth: busWidth as 8 | 16 | 32 | 64,
    addressWidth: o.address_width !== undefined ? String(o.address_width) : '16',
    protocol: protocol as ProjectConfig['protocol'],
    enableWideRegister: o.enable_wide_register === true,
  };
}
