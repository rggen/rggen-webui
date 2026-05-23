import type { RegisterBlock, Register, BitField, ProjectConfig } from '../types/rggen';
import { NO_INITIAL_VALUE_TYPES } from '../types/rggen';

function buildBitAssignment(bf: BitField): string {
  const parts: string[] = [];
  if (bf.lsb !== '') parts.push(`lsb: ${bf.lsb}`);
  parts.push(`width: ${bf.width || 1}`);
  if (bf.sequenceSize !== '') {
    parts.push(`sequence_size: ${bf.sequenceSize}`);
    if (bf.sequenceStep !== '') parts.push(`step: ${bf.sequenceStep}`);
  }
  return `{ ${parts.join(', ')} }`;
}

function buildBitFieldLine(bf: BitField, indent: string): string {
  const parts: string[] = [];
  if (bf.name) parts.push(`name: ${bf.name}`);
  parts.push(`bit_assignment: ${buildBitAssignment(bf)}`);
  parts.push(`type: ${bf.type}`);
  if (!NO_INITIAL_VALUE_TYPES.has(bf.type) && bf.initialValue !== '')
    parts.push(`initial_value: ${bf.initialValue}`);
  if (bf.reference) parts.push(`reference: ${bf.reference}`);
  if (bf.comment) parts.push(`comment: '${bf.comment}'`);
  return `${indent}- { ${parts.join(', ')} }`;
}

function buildRegisterType(reg: Register): string | null {
  if (reg.type === 'default') return null;
  if (reg.type === 'indirect') {
    const quals = reg.indirectQualifiers.map(q =>
      q.fixedValue !== '' ? `[${q.bitFieldRef}, ${q.fixedValue}]` : q.bitFieldRef
    );
    return `[indirect${quals.length > 0 ? ', ' + quals.join(', ') : ''}]`;
  }
  return reg.type;
}

function buildRegisterSize(reg: Register): string | null {
  if (!reg.arraySize) return null;
  if (!reg.arrayStep) return reg.arraySize;
  return `[${reg.arraySize}, {step: ${reg.arrayStep}}]`;
}

function generateRegisterYaml(reg: Register, indent: string): string {
  const lines: string[] = [];
  lines.push(`${indent}- name: ${reg.name}`);
  if (reg.offsetAddress) lines.push(`${indent}  offset_address: ${reg.offsetAddress}`);
  const regType = buildRegisterType(reg);
  if (regType) lines.push(`${indent}  type: ${regType}`);
  const regSize = buildRegisterSize(reg);
  if (regSize) lines.push(`${indent}  size: ${regSize}`);
  if (reg.comment) lines.push(`${indent}  comment: '${reg.comment}'`);
  if (reg.bitFields.length > 0) {
    lines.push(`${indent}  bit_fields:`);
    for (const bf of reg.bitFields) {
      lines.push(buildBitFieldLine(bf, `${indent}  `));
    }
  }
  return lines.join('\n');
}

export function generateBlockYaml(block: RegisterBlock): string {
  const lines: string[] = [];
  lines.push('register_blocks:');
  lines.push(`  - name: ${block.name}`);
  if (block.busWidth !== 32) lines.push(`    bus_width: ${block.busWidth}`);
  if (block.byteSize) lines.push(`    byte_size: ${block.byteSize}`);
  if (block.comment) lines.push(`    comment: '${block.comment}'`);
  if (block.registers.length > 0) {
    lines.push('    registers:');
    for (const reg of block.registers) {
      lines.push(generateRegisterYaml(reg, '    '));
    }
  }
  return lines.join('\n') + '\n';
}

export function generateConfigYaml(config: ProjectConfig): string {
  const lines: string[] = [];
  lines.push(`bus_width: ${config.busWidth}`);
  lines.push(`address_width: ${config.addressWidth || 16}`);
  lines.push(`protocol: ${config.protocol}`);
  if (config.enableWideRegister) lines.push('enable_wide_register: true');
  return lines.join('\n') + '\n';
}
