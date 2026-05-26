import { useRef, useEffect } from 'react';
import type { BitField, BitFieldType, CustomSwRead, CustomSwWrite } from '../types/rggen';
import { BIT_FIELD_TYPES, NO_INITIAL_VALUE_TYPES, SW_READ_VALUES, SW_WRITE_VALUES } from '../types/rggen';

interface Props {
  bitField: BitField;
  highlighted?: boolean;
  highlightedProperty?: keyof BitField;
  onChange: (updates: Partial<BitField>) => void;
  onDelete: () => void;
}

const td = 'px-2 py-1 border-r border-gray-200 text-sm';
const CELL_HL = 'outline outline-2 outline-red-500';

export function BitFieldRow({ bitField, highlighted, highlightedProperty, onChange, onDelete }: Props) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const noInitVal = NO_INITIAL_VALUE_TYPES.has(bitField.type);

  useEffect(() => {
    if (highlighted) rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [highlighted]);

  const hl = (prop: keyof BitField) =>
    highlightedProperty === prop ? CELL_HL : '';

  const handleTypeChange = (newType: BitFieldType) => {
    const updates: Partial<BitField> = { type: newType };
    const willHaveInit = !NO_INITIAL_VALUE_TYPES.has(newType);
    if (willHaveInit && bitField.initialValue === '') updates.initialValue = '0';
    if (!willHaveInit) updates.initialValue = '';
    if (newType === 'custom') updates.showAdvanced = true;
    onChange(updates);
  };

  return (
    <>
      <tr
        ref={rowRef}
        className={`border-b border-gray-100 hover:bg-gray-100 ${highlighted ? 'bg-red-100 hover:bg-red-100' : 'bg-gray-50'}`}
      >
        <td className="px-2 py-1 w-20 text-center">
          <button
            className="text-xs text-gray-400 hover:text-red-700 whitespace-nowrap"
            onClick={() => onChange({ showAdvanced: !bitField.showAdvanced })}
          >
            Adv {bitField.showAdvanced ? '▲' : '▼'}
          </button>
        </td>
        <td className={`${td} min-w-36 ${hl('name')}`}>
          <input
            className="w-full outline-none bg-transparent"
            value={bitField.name}
            onChange={e => onChange({ name: e.target.value })}
          />
        </td>
        <td className={`${td} w-16 text-center ${hl('lsb')}`}>
          <input
            className="w-full outline-none bg-transparent font-mono text-center"
            value={bitField.lsb}
            placeholder="auto"
            onChange={e => onChange({ lsb: e.target.value })}
          />
        </td>
        <td className={`${td} w-16 text-center ${hl('width')}`}>
          <input
            className="w-full outline-none bg-transparent font-mono text-center"
            value={bitField.width}
            placeholder="1"
            onChange={e => onChange({ width: e.target.value })}
          />
        </td>
        <td className={`${td} w-32 ${hl('type')}`}>
          <select
            className="w-full outline-none bg-transparent"
            value={bitField.type}
            onChange={e => handleTypeChange(e.target.value as BitFieldType)}
          >
            {BIT_FIELD_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </td>
        <td className={`${td} w-24 ${hl('initialValue')}`}>
          <div className="flex items-center gap-1">
            <input
              className={`w-full outline-none font-mono ${noInitVal ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-transparent'}`}
              value={bitField.initialValue}
              placeholder={noInitVal ? '-' : '0'}
              disabled={noInitVal}
              onChange={e => onChange({ initialValue: e.target.value })}
            />
            {!noInitVal && (
              <input
                type="checkbox"
                title="Parameterize initial value (outputs as { default: value })"
                checked={bitField.parameterize}
                onChange={e => onChange({ parameterize: e.target.checked })}
                className="accent-red-700 shrink-0"
              />
            )}
          </div>
        </td>
        <td className={`${td} ${hl('comment')}`}>
          <input
            className="w-full outline-none bg-transparent"
            value={bitField.comment}
            placeholder="comment"
            onChange={e => onChange({ comment: e.target.value })}
          />
        </td>
        <td className="px-2 py-1 w-8 text-center">
          <button className="text-gray-400 hover:text-red-600" onClick={onDelete}>×</button>
        </td>
      </tr>

      {bitField.showAdvanced && (
        <tr className={`border-b border-gray-100 ${highlighted ? 'bg-red-50' : 'bg-red-50'}`}>
          <td colSpan={8} className="px-8 py-2">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-600 font-medium w-20">Sequence:</span>
                <label className="flex items-center gap-1">
                  <span className="text-gray-500">Size</span>
                  <input
                    className={`border border-gray-300 rounded px-2 py-0.5 w-20 focus:outline-none focus:border-red-400 ${hl('sequenceSize')}`}
                    value={bitField.sequenceSize}
                    placeholder="e.g. 4"
                    onChange={e => onChange({ sequenceSize: e.target.value })}
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="text-gray-500">Step</span>
                  <input
                    className={`border border-gray-300 rounded px-2 py-0.5 w-20 focus:outline-none focus:border-red-400 ${hl('sequenceStep')}`}
                    value={bitField.sequenceStep}
                    placeholder="e.g. 8"
                    onChange={e => onChange({ sequenceStep: e.target.value })}
                  />
                </label>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-600 font-medium w-20">Reference:</span>
                <input
                  className={`border border-gray-300 rounded px-2 py-0.5 w-56 font-mono text-sm focus:outline-none focus:border-red-400 ${hl('reference')}`}
                  value={bitField.reference}
                  placeholder="register_0.bit_field_0"
                  onChange={e => onChange({ reference: e.target.value })}
                />
              </div>
              {bitField.type === 'custom' && (
                <div className="flex flex-col gap-2">
                  <span className="text-gray-600 font-medium">Custom:</span>
                  <div className="flex flex-wrap gap-4 ml-4">
                    <label className="flex items-center gap-1">
                      <span className="text-gray-500">SW Read</span>
                      <select
                        className={`border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:border-red-400 ${hl('customSwRead')}`}
                        value={bitField.customSwRead}
                        onChange={e => onChange({ customSwRead: e.target.value as CustomSwRead })}
                      >
                        {SW_READ_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </label>
                    <label className="flex items-center gap-1">
                      <span className="text-gray-500">SW Write</span>
                      <select
                        className={`border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:border-red-400 ${hl('customSwWrite')}`}
                        value={bitField.customSwWrite}
                        onChange={e => onChange({ customSwWrite: e.target.value as CustomSwWrite })}
                      >
                        {SW_WRITE_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-4 ml-4">
                    {(
                      [
                        ['customSwWriteOnce', 'SW Write Once'],
                        ['customHwWrite',     'HW Write'],
                        ['customHwSet',       'HW Set'],
                        ['customHwClear',     'HW Clear'],
                        ['customReadTrigger', 'Read Trigger'],
                        ['customWriteTrigger','Write Trigger'],
                      ] as [keyof BitField, string][]
                    ).map(([key, label]) => (
                      <label key={key} className={`flex items-center gap-1 ${hl(key)}`}>
                        <input
                          type="checkbox"
                          checked={bitField[key] as boolean}
                          onChange={e => onChange({ [key]: e.target.checked })}
                          className="accent-red-700"
                        />
                        <span className="text-gray-500">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
