import type { RegisterBlock, Register, BitField, ProjectConfig } from '../types/rggen';
import { NO_INITIAL_VALUE_TYPES } from '../types/rggen';

export interface SourceLocation {
  kind: 'block' | 'register' | 'bitfield' | 'config';
  blockId?: string;
  blockProperty?: keyof RegisterBlock;
  registerId?: string;
  property?: keyof Register;
  bitFieldId?: string;
  bfProperty?: keyof BitField;
  configField?: keyof ProjectConfig;
}

export type BlockSourceMap = Map<number, SourceLocation>;
export type ConfigSourceMap = Map<number, SourceLocation>;

// --- YAML key → TypeScript property mapping ---

function yamlKeyToBlockProp(s: string): keyof RegisterBlock | undefined {
  if (s.startsWith('- name:') || s.startsWith('name:')) return 'name';
  if (s.startsWith('bus_width:')) return 'busWidth';
  if (s.startsWith('byte_size:')) return 'byteSize';
  if (s.startsWith('comment:')) return 'comment';
  return undefined;
}

function yamlKeyToRegProp(s: string): keyof Register | undefined {
  if (s.startsWith('- name:') || s.startsWith('name:')) return 'name';
  if (s.startsWith('offset_address:')) return 'offsetAddress';
  if (s.startsWith('type:')) return 'type';
  if (s.startsWith('size:')) return 'arraySize';
  if (s.startsWith('comment:')) return 'comment';
  return undefined;
}

function yamlKeyToBfProp(s: string): keyof BitField | undefined {
  if (s.startsWith('- name:') || s.startsWith('name:')) return 'name';
  if (s.startsWith('type:')) return 'type';
  if (s.startsWith('initial_value:')) return 'initialValue';
  if (s.startsWith('reference:')) return 'reference';
  if (s.startsWith('comment:')) return 'comment';
  if (s.startsWith('lsb:')) return 'lsb';
  if (s.startsWith('width:')) return 'width';
  if (s.startsWith('sequence_size:')) return 'sequenceSize';
  if (s.startsWith('step:')) return 'sequenceStep';
  return undefined;
}

function yamlKeyToConfigField(s: string): keyof ProjectConfig | undefined {
  if (s.startsWith('bus_width:')) return 'busWidth';
  if (s.startsWith('address_width:')) return 'addressWidth';
  if (s.startsWith('protocol:')) return 'protocol';
  if (s.startsWith('enable_wide_register:')) return 'enableWideRegister';
  return undefined;
}

// --- YAML value builders ---

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
  const dims = reg.arraySize.split(',').map(s => s.trim()).filter(Boolean);
  if (dims.length === 1 && !reg.arrayStep) return dims[0];
  const parts = [...dims, ...(reg.arrayStep ? [`{step: ${reg.arrayStep}}`] : [])];
  return `[${parts.join(', ')}]`;
}

// --- Block YAML builder (pure text) ---

function buildBitFieldLines(bf: BitField, lines: string[], indent: string): void {
  const pfx = `${indent}  `;
  let first = true;

  function push(text: string): void {
    lines.push(first ? `${indent}- ${text}` : `${pfx}${text}`);
    first = false;
  }

  if (bf.name) push(`name: ${bf.name}`);
  push('bit_assignment:');
  if (bf.lsb !== '') lines.push(`${pfx}  lsb: ${bf.lsb}`);
  lines.push(`${pfx}  width: ${bf.width || 1}`);
  if (bf.sequenceSize !== '') {
    lines.push(`${pfx}  sequence_size: ${bf.sequenceSize}`);
    if (bf.sequenceStep !== '') lines.push(`${pfx}  step: ${bf.sequenceStep}`);
  }
  push(`type: ${bf.type}`);
  if (!NO_INITIAL_VALUE_TYPES.has(bf.type) && bf.initialValue !== '') {
    const val = bf.parameterize ? `{ default: ${bf.initialValue} }` : bf.initialValue;
    push(`initial_value: ${val}`);
  }
  if (bf.reference) push(`reference: ${bf.reference}`);
  if (bf.comment) push(`comment: '${bf.comment}'`);
}

function buildRegisterLines(reg: Register, lines: string[], indent: string): void {
  const pfx = `${indent}  `;
  lines.push(`${indent}- name: ${reg.name}`);
  if (reg.offsetAddress) lines.push(`${pfx}offset_address: ${reg.offsetAddress}`);
  const regType = buildRegisterType(reg);
  if (regType) lines.push(`${pfx}type: ${regType}`);
  const regSize = buildRegisterSize(reg);
  if (regSize) lines.push(`${pfx}size: ${regSize}`);
  if (reg.comment) lines.push(`${pfx}comment: '${reg.comment}'`);
  if (reg.bitFields.length > 0) {
    lines.push(`${pfx}bit_fields:`);
    for (const bf of reg.bitFields) {
      buildBitFieldLines(bf, lines, pfx);
    }
  }
}

function buildBlockLines(block: RegisterBlock): string[] {
  const lines: string[] = [];
  lines.push('register_blocks:');
  lines.push(`  - name: ${block.name}`);
  if (block.busWidth !== 32) lines.push(`    bus_width: ${block.busWidth}`);
  if (block.byteSize) lines.push(`    byte_size: ${block.byteSize}`);
  if (block.comment) lines.push(`    comment: '${block.comment}'`);
  if (block.registers.length > 0) {
    lines.push('    registers:');
    for (const reg of block.registers) {
      buildRegisterLines(reg, lines, '    ');
    }
  }
  return lines;
}

function buildConfigLines(config: ProjectConfig): string[] {
  const lines: string[] = [];
  lines.push(`bus_width: ${config.busWidth}`);
  lines.push(`address_width: ${config.addressWidth || 16}`);
  lines.push(`protocol: ${config.protocol}`);
  if (config.enableWideRegister) lines.push('enable_wide_register: true');
  return lines;
}

// --- Source map construction by scanning generated text ---
//
// Indentation structure of generated block YAML:
//   0: register_blocks:
//   2:   - name: <block>          ← block item (only one per file)
//   4:     bus_width / registers / etc.
//   4:     - name: <register>     ← register item  (indent=4, starts with "- ")
//   6:       offset_address / bit_fields / etc.
//   6:       - name: <bitfield>   ← bitfield item  (indent=6, starts with "- ")
//   8:         bit_assignment / type / etc.
//  10:           lsb / width / etc. (bit_assignment sub-fields)

function scanBlockSourceMap(lines: string[], block: RegisterBlock): BlockSourceMap {
  const map: BlockSourceMap = new Map();
  let regIndex = -1;
  let bfIndex  = -1;

  lines.forEach((line, i) => {
    const s      = line.trimStart();
    const indent = line.length - s.length;

    if (indent === 4 && s.startsWith('- ')) {
      regIndex++;
      bfIndex = -1;
    } else if (indent === 6 && s.startsWith('- ')) {
      bfIndex++;
    }

    if (regIndex < 0) {
      const blockProperty = yamlKeyToBlockProp(s);
      if (blockProperty) map.set(i + 1, { kind: 'block', blockId: block.id, blockProperty });
      return;
    }

    const reg = block.registers[regIndex];
    if (!reg) return;

    const bf = bfIndex >= 0 ? reg.bitFields[bfIndex] : undefined;
    if (bf) {
      map.set(i + 1, {
        kind: 'bitfield',
        blockId: block.id,
        registerId: reg.id,
        bitFieldId: bf.id,
        bfProperty: yamlKeyToBfProp(s),
      });
    } else {
      const property = yamlKeyToRegProp(s);
      if (property) map.set(i + 1, { kind: 'register', blockId: block.id, registerId: reg.id, property });
    }
  });

  return map;
}

function scanConfigSourceMap(lines: string[]): ConfigSourceMap {
  const map: ConfigSourceMap = new Map();
  lines.forEach((line, i) => {
    const configField = yamlKeyToConfigField(line.trimStart());
    if (configField) map.set(i + 1, { kind: 'config', configField });
  });
  return map;
}

// --- Public API ---

export function generateBlockYaml(block: RegisterBlock): string {
  return buildBlockLines(block).join('\n') + '\n';
}

export function generateConfigYaml(config: ProjectConfig): string {
  return buildConfigLines(config).join('\n') + '\n';
}

export function generateBlockYamlWithSourceMap(block: RegisterBlock): { yaml: string; sourceMap: BlockSourceMap } {
  const lines = buildBlockLines(block);
  return {
    yaml: lines.join('\n') + '\n',
    sourceMap: scanBlockSourceMap(lines, block),
  };
}

export function generateConfigYamlWithSourceMap(config: ProjectConfig): { yaml: string; sourceMap: ConfigSourceMap } {
  const lines = buildConfigLines(config);
  return {
    yaml: lines.join('\n') + '\n',
    sourceMap: scanConfigSourceMap(lines),
  };
}

// Returns the nearest SourceLocation at or before the given 1-based line number.
export function lookupSourceMap(map: BlockSourceMap | ConfigSourceMap, line: number): SourceLocation | null {
  let result: SourceLocation | null = null;
  for (const [k, v] of map) {
    if (k <= line) result = v;
    else break;
  }
  return result;
}
