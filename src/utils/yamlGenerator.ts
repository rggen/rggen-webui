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
  if (s.startsWith('sw_write_once:')) return 'customSwWriteOnce';
  if (s.startsWith('sw_write:')) return 'customSwWrite';
  if (s.startsWith('sw_read:')) return 'customSwRead';
  if (s.startsWith('hw_write:')) return 'customHwWrite';
  if (s.startsWith('hw_set:')) return 'customHwSet';
  if (s.startsWith('hw_clear:')) return 'customHwClear';
  if (s.startsWith('read_trigger:')) return 'customReadTrigger';
  if (s.startsWith('write_trigger:')) return 'customWriteTrigger';
  return undefined;
}

function yamlKeyToConfigField(s: string): keyof ProjectConfig | undefined {
  if (s.startsWith('bus_width:')) return 'busWidth';
  if (s.startsWith('address_width:')) return 'addressWidth';
  if (s.startsWith('protocol:')) return 'protocol';
  return undefined;
}

// --- YAML value builders ---

function toYamlInline(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(toYamlInline).join(', ')}]`;
  return String(v);
}

function parseInitElement(s: string): unknown {
  const parts = s.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  return parts[0] ?? '';
}

function reshapeFlat(flat: unknown[], dims: number[]): unknown {
  if (dims.length <= 1) return flat;
  const stride = Math.floor(flat.length / dims[0]);
  return Array.from({ length: dims[0] }, (_, i) =>
    reshapeFlat(flat.slice(i * stride, (i + 1) * stride), dims.slice(1))
  );
}

function buildRegisterSize(reg: Register): string | null {
  if (!reg.arraySize) return null;
  const dims = reg.arraySize.split(',').map(s => s.trim()).filter(Boolean);
  if (dims.length === 1 && !reg.arrayStep) return dims[0];
  const parts = [...dims, ...(reg.arrayStep ? [`{step: ${reg.arrayStep}}`] : [])];
  return `[${parts.join(', ')}]`;
}

// --- Block YAML builder (pure text) ---

function buildIndirectTypeLines(reg: Register, lines: string[], pfx: string): void {
  const inner = `${pfx}  `;
  lines.push(`${pfx}type:`);
  lines.push(`${inner}- indirect`);
  for (const q of reg.indirectQualifiers) {
    lines.push(q.fixedValue !== '' ? `${inner}- [${q.bitFieldRef}, ${q.fixedValue}]` : `${inner}- ${q.bitFieldRef}`);
  }
}

function buildCustomTypeLines(bf: BitField, lines: string[], pfx: string): void {
  const opts: [string, string][] = [];
  if (bf.customSwRead !== 'default')  opts.push(['sw_read',        bf.customSwRead]);
  if (bf.customSwWrite !== 'default') opts.push(['sw_write',       bf.customSwWrite]);
  if (bf.customSwWriteOnce)           opts.push(['sw_write_once',  'true']);
  if (bf.customHwWrite)               opts.push(['hw_write',       'true']);
  if (bf.customHwSet)                 opts.push(['hw_set',         'true']);
  if (bf.customHwClear)               opts.push(['hw_clear',       'true']);
  if (bf.customReadTrigger)           opts.push(['read_trigger',   'true']);
  if (bf.customWriteTrigger)          opts.push(['write_trigger',  'true']);

  if (opts.length === 0) {
    lines.push(`${pfx}type: custom`);
    return;
  }

  const inner = `${pfx}  `;
  lines.push(`${pfx}type:`);
  lines.push(`${inner}- custom`);
  lines.push(`${inner}- ${opts[0][0]}: ${opts[0][1]}`);
  for (let i = 1; i < opts.length; i++) {
    lines.push(`${inner}  ${opts[i][0]}: ${opts[i][1]}`);
  }
}

function buildBitFieldLines(bf: BitField, lines: string[], indent: string, regDims: number[] = []): void {
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
  if (bf.type === 'custom') {
    buildCustomTypeLines(bf, lines, pfx);
  } else {
    push(`type: ${bf.type}`);
  }
  if (!NO_INITIAL_VALUE_TYPES.has(bf.type)) {
    if (bf.parameterize && typeof bf.initialValue === 'string' && bf.initialValue !== '') {
      push(`initial_value: { default: ${bf.initialValue} }`);
    } else if (Array.isArray(bf.initialValue)) {
      // per-element: each string may be comma-separated (sequence element)
      const flat = bf.initialValue.map(parseInitElement).filter(v => v !== '');
      if (flat.length > 0) {
        const shaped = regDims.length > 1 ? reshapeFlat(flat, regDims) : flat;
        push(`initial_value: ${toYamlInline(shaped)}`);
      }
    } else if (typeof bf.initialValue === 'string' && bf.initialValue !== '') {
      // may be comma-separated sequence
      const parts = bf.initialValue.split(',').map(p => p.trim()).filter(p => p !== '');
      const val = parts.length > 1 ? `[${parts.join(', ')}]` : parts[0];
      if (val) push(`initial_value: ${val}`);
    }
  }
  if (bf.reference) push(`reference: ${bf.reference}`);
  if (bf.comment) push(`comment: '${bf.comment}'`);
}

function buildRegisterLines(reg: Register, lines: string[], indent: string): void {
  const pfx = `${indent}  `;
  lines.push(`${indent}- name: ${reg.name}`);
  if (reg.offsetAddress) lines.push(`${pfx}offset_address: 0x${reg.offsetAddress}`);
  if (reg.type === 'indirect') {
    buildIndirectTypeLines(reg, lines, pfx);
  } else if (reg.type !== 'default') {
    lines.push(`${pfx}type: ${reg.type}`);
  }
  const regSize = buildRegisterSize(reg);
  if (regSize) lines.push(`${pfx}size: ${regSize}`);
  if (reg.comment) lines.push(`${pfx}comment: '${reg.comment}'`);
  if (reg.bitFields.length > 0) {
    const regDims = reg.arraySize
      ? reg.arraySize.split(',').map(s => parseInt(s.trim(), 10) || 1)
      : [];
    lines.push(`${pfx}bit_fields:`);
    for (const bf of reg.bitFields) {
      buildBitFieldLines(bf, lines, pfx, regDims);
    }
  }
}

function buildBlockLines(block: RegisterBlock): string[] {
  const lines: string[] = [];
  lines.push('register_blocks:');
  lines.push(`  - name: ${block.name}`);
  if (block.busWidth !== '') lines.push(`    bus_width: ${block.busWidth}`);
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
  return lines;
}

// --- Source map construction by scanning generated text ---
//
// Indentation structure of generated block YAML:
//   0: register_blocks:
//   2:   - name: <block>             ← block item (only one per file)
//   4:     bus_width / registers / etc.
//   4:     - name: <register>        ← register item  (indent=4, starts with "- ")
//   6:       offset_address / type (simple) / bit_fields / etc.
//   6:       type:                   ← indirect type header
//   8:         - indirect / qualifiers  ← indirect type block (indent=8, starts with "- ")
//   6:       - name: <bitfield>      ← bitfield item  (indent=6, starts with "- ")
//   8:         bit_assignment / type (simple or custom header) / etc.
//  10:           lsb / width / etc.  (bit_assignment sub-fields, no "- ")
//  10:           - custom / options  (custom type block, starts with "- ")
//  12:             subsequent option keys (custom type mapping continuation)

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
      let bfProperty: keyof BitField | undefined;
      if (indent === 10 && s.startsWith('- ')) {
        // Inside custom type block: "- custom" maps to 'type', "- sw_read: ..." maps to the option
        const content = s.slice(2);
        bfProperty = content === 'custom' ? 'type' : yamlKeyToBfProp(content);
      } else {
        // indent=8 (regular bf props), indent=10 without "- " (bit_assignment sub-fields),
        // indent=12 (custom option continuation)
        bfProperty = yamlKeyToBfProp(s);
      }
      map.set(i + 1, {
        kind: 'bitfield',
        blockId: block.id,
        registerId: reg.id,
        bitFieldId: bf.id,
        bfProperty,
      });
    } else {
      if (indent === 8 && s.startsWith('- ')) {
        // Inside indirect type block
        map.set(i + 1, { kind: 'register', blockId: block.id, registerId: reg.id, property: 'indirectQualifiers' });
      } else {
        const property = yamlKeyToRegProp(s);
        if (property) map.set(i + 1, { kind: 'register', blockId: block.id, registerId: reg.id, property });
      }
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
