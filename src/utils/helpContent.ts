export type HelpLevel = 'config' | 'block' | 'register' | 'bitfield';

interface HelpField {
  kind: 'field';
  label: string;
  description: string | string[];
}

interface HelpOptions {
  kind: 'options';
  label: string;
  description: string | string[];
  options: { value: string; description: string }[];
}

export type HelpItem = HelpField | HelpOptions;

export interface HelpSection {
  title: string;
  items: HelpItem[];
}

function f(label: string, description: string | string[]): HelpField {
  return { kind: 'field', label, description };
}

function opts(label: string, description: string, options: [string, string][]): HelpOptions {
  return { kind: 'options', label, description, options: options.map(([value, desc]) => ({ value, description: desc })) };
}

export const HELP_CONTENT: Record<HelpLevel, HelpSection> = {
  config: {
    title: 'Config',
    items: [
      f('Bus Width', 'Data bus width in bits. All registers in the project use this width unless overridden per block. Must be 8, 16, 32, or 64.'),
      f('Address Width', 'Number of address bits. Determines the addressable range of the register map.'),
      f('Protocol', 'Bus interface protocol used for the generated RTL. Available options: apb, axi4lite, avalon, wishbone.'),
    ],
  },
  block: {
    title: 'Register Block',
    items: [
      f('Name', 'Identifier for this register block. Used as the module/entity name in generated RTL.'),
      f('Bus Width', 'Overrides the project-level bus width for this block only. Leave blank to use the project-level setting.'),
      f('Byte Size', 'Total address space size in bytes allocated to this block.'),
      f('Comment', 'Optional descriptive text. Not used in generation.'),
    ],
  },
  register: {
    title: 'Register',
    items: [
      f('Name', 'Identifier for this register. Used in generated RTL and software headers.'),
      f('Offset Address', 'Byte offset of this register from the block base address, in hexadecimal (without 0x prefix). Leave blank to assign automatically in declaration order.'),
      opts('Type', 'Access behavior of this register.', [
        ['default',  'Access attribute is derived from the contained bit fields.'],
        ['rw',       'The entire register is treated as read-write, regardless of the individual bit field types.'],
        ['indirect', 'Register is selected by matching qualifier bit field values rather than by address. Useful for banking multiple registers at the same address. Access attribute is derived from the contained bit fields.'],
        ['external', 'Register logic is implemented outside the generated RTL. Only the bus interface is generated.'],
        ['maskable', 'Supports bit-wise write masking. The upper half of the write data is treated as a write-enable mask.'],
        ['reserved', 'Address is reserved; all accesses are ignored.'],
      ]),
      f('Comment', 'Optional descriptive text.'),
      f('Array / Dim, Step', 'Defines a register array. Each dimension entry specifies the element count. Step sets the address stride per element in bytes; leave blank for automatic (= register width in bytes).'),
      f('Qualifiers (indirect type only)', 'Each qualifier pairs a bit field reference with an optional fixed value. A register is selected when all qualifier conditions match.'),
    ],
  },
  bitfield: {
    title: 'Bit Field',
    items: [
      f('Name', 'Identifier for this bit field.'),
      f('LSB', 'Least-significant bit position within the register. Leave blank for automatic assignment (packed from LSB 0 upward in declaration order).'),
      f('Width', 'Bit width of this field. Defaults to 1.'),
      opts('Type', 'Access behavior of this bit field.', [
        ['rw',       'SW read/write. HW read. Holds value.'],
        ['ro',       'SW read only. Value is driven directly from a HW input port.'],
        ['wo',       'SW write only. HW read. Value is not readable by SW.'],
        ['w1',       'SW write once (subsequent writes are ignored). HW read.'],
        ['wo1',      'SW write once, write only.'],
        ['rc',       'SW read clears field to 0. SW write is ignored. HW set.'],
        ['rs',       'SW read sets field to all 1s. SW write is ignored. HW clear.'],
        ['rof',      'Read-only, fixed value (from initial value parameter). HW cannot write.'],
        ['rohw',     'Read-only. Value is written by HW and stored internally (unlike ro, which is driven directly from a HW input port without storage).'],
        ['rotrg',    'SW read triggers a pulse. No storage.'],
        ['wotrg',    'SW write triggers a pulse. No storage.'],
        ['rwtrg',    'SW read or write triggers a pulse. No storage.'],
        ['w1trg',    'SW write of 1 triggers a pulse. No storage.'],
        ['w0trg',    'SW write of 0 triggers a pulse. No storage.'],
        ['rowo',     'SW read returns a separate read-only value; SW write updates the write register. HW reads the write register.'],
        ['rowotrg',  'Like rowo, but SW read also triggers a pulse in addition to returning the read-only value.'],
        ['row0trg',  'Like rowo, but SW write of 0 triggers a pulse.'],
        ['row1trg',  'Like rowo, but SW write of 1 triggers a pulse.'],
        ['wrc',      'SW write stores the value as-is; SW read clears the field to 0. No HW clear.'],
        ['wrs',      'SW write stores the value as-is; SW read sets the field to all 1s. No HW set.'],
        ['rwc',      'SW read/write. HW clear.'],
        ['rws',      'SW read/write. HW set.'],
        ['rwhw',     'SW read/write. HW write (overwrites SW value).'],
        ['rwe',      'SW read/write with HW write-enable.'],
        ['rwl',      'SW read/write with HW lock (HW signal can lock the field to prevent further SW writes).'],
        ['w1c',      'SW write 1 to clear. SW read. HW set.'],
        ['w0c',      'SW write 0 to clear. SW read. HW set.'],
        ['wc',       'SW write (any) to clear. SW read. HW set.'],
        ['w1s',      'SW write 1 to set. SW read. HW clear.'],
        ['w0s',      'SW write 0 to set. SW read. HW clear.'],
        ['ws',       'SW write (any) to set. SW read. HW clear.'],
        ['w1t',      'SW write 1 to toggle. SW read.'],
        ['w0t',      'SW write 0 to toggle. SW read.'],
        ['woc',      'SW write clears field. No SW read. HW set.'],
        ['wos',      'SW write sets field. No SW read. HW clear.'],
        ['w0crs',    'SW write 0 clears; SW read sets; no HW.'],
        ['w1crs',    'SW write 1 clears; SW read sets; no HW.'],
        ['wcrs',     'SW write (any) clears; SW read sets; no HW.'],
        ['w0src',    'SW write 0 sets; SW read clears; no HW.'],
        ['w1src',    'SW write 1 sets; SW read clears; no HW.'],
        ['wsrc',     'SW write (any) sets; SW read clears; no HW.'],
        ['counter',  'Increment/decrement counter. HW controls count direction and enable.'],
        ['custom',   'Fully configurable. SW read/write behavior, HW interactions, and trigger conditions are specified individually in the advanced options.'],
        ['reserved', 'Bits are reserved. Writes ignored, reads return 0.'],
      ]),
      f('Initial Value', [
        'Reset value of the field. Not applicable for types with no storage.',
        'The checkbox marks it as a parameter in the generated RTL (output as { default: value }).',
        'For sequence bit fields, enter comma-separated values (e.g. "0, 1, 2, 3"). Causes an error if parameterize is checked.',
        'For array registers, expand Adv to set a per-element initial value. Each element also accepts comma-separated values for sequence bit fields. Parameterize and per-element are mutually exclusive.',
      ]),
      f('Comment', 'Optional descriptive text.'),
      f('Sequence (advanced)', 'Generates an array of bit fields at consecutive bit positions. Size: number of elements. Step: bit distance between elements (defaults to field width).'),
      f('Reference (advanced)', 'For types that reference another bit field. Specify as register_name.bit_field_name.'),
      f('Custom options (advanced, custom type only)', [
        'SW Read: how SW reads affect the field.',
        'SW Write: how SW writes affect the field.',
        'SW Write Once: subsequent SW writes are ignored after the first.',
        'HW Write: HW can write the field.',
        'HW Set: HW can set all bits to 1.',
        'HW Clear: HW can clear all bits to 0.',
        'Read Trigger: SW read generates a trigger pulse.',
        'Write Trigger: SW write generates a trigger pulse.',
      ]),
    ],
  },
};
