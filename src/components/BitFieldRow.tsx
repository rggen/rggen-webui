import type { BitField, BitFieldType } from '../types/rggen';
import { BIT_FIELD_TYPES, NO_INITIAL_VALUE_TYPES } from '../types/rggen';


interface Props {
  bitField: BitField;
  onChange: (updates: Partial<BitField>) => void;
  onDelete: () => void;
}

const td = 'px-2 py-1 border-r border-gray-200 text-sm';

export function BitFieldRow({ bitField, onChange, onDelete }: Props) {
  const noInitVal = NO_INITIAL_VALUE_TYPES.has(bitField.type);

  const handleTypeChange = (newType: BitFieldType) => {
    const updates: Partial<BitField> = { type: newType };
    const willHaveInit = !NO_INITIAL_VALUE_TYPES.has(newType);
    if (willHaveInit && bitField.initialValue === '') updates.initialValue = '0';
    if (!willHaveInit) updates.initialValue = '';
    onChange(updates);
  };

  return (
    <>
      <tr className="border-b border-gray-100 bg-gray-50 hover:bg-gray-100">
        <td className={`${td} min-w-36`}>
          <input
            className="w-full outline-none bg-transparent"
            value={bitField.name}
            placeholder="bit_field_0"
            onChange={e => onChange({ name: e.target.value })}
          />
        </td>
        <td className={`${td} w-16 text-center`}>
          <input
            className="w-full outline-none bg-transparent font-mono text-center"
            value={bitField.lsb}
            placeholder="auto"
            onChange={e => onChange({ lsb: e.target.value })}
          />
        </td>
        <td className={`${td} w-16 text-center`}>
          <input
            className="w-full outline-none bg-transparent font-mono text-center"
            value={bitField.width}
            placeholder="1"
            onChange={e => onChange({ width: e.target.value })}
          />
        </td>
        <td className={`${td} w-32`}>
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
        <td className={`${td} w-20`}>
          <input
            className={`w-full outline-none font-mono ${noInitVal ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-transparent'}`}
            value={bitField.initialValue}
            placeholder={noInitVal ? '-' : '0'}
            disabled={noInitVal}
            onChange={e => onChange({ initialValue: e.target.value })}
          />
        </td>
        <td className={td}>
          <input
            className="w-full outline-none bg-transparent"
            value={bitField.comment}
            placeholder="comment"
            onChange={e => onChange({ comment: e.target.value })}
          />
        </td>
        <td className="px-2 py-1 w-20 text-center">
          <button
            className="text-xs text-gray-400 hover:text-red-700 whitespace-nowrap"
            onClick={() => onChange({ showAdvanced: !bitField.showAdvanced })}
          >
            Adv {bitField.showAdvanced ? '▲' : '▼'}
          </button>
        </td>
        <td className="px-2 py-1 w-8 text-center">
          <button className="text-gray-400 hover:text-red-600" onClick={onDelete}>×</button>
        </td>
      </tr>

      {bitField.showAdvanced && (
        <tr className="bg-red-50 border-b border-gray-100">
          <td colSpan={8} className="px-8 py-2">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-600 font-medium w-20">Reference:</span>
                <input
                  className="border border-gray-300 rounded px-2 py-0.5 w-56 font-mono text-sm focus:outline-none focus:border-red-400"
                  value={bitField.reference}
                  placeholder="register_0.bit_field_0"
                  onChange={e => onChange({ reference: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-600 font-medium w-20">Sequence:</span>
                <label className="flex items-center gap-1">
                  <span className="text-gray-500">Size</span>
                  <input
                    className="border border-gray-300 rounded px-2 py-0.5 w-20 focus:outline-none focus:border-red-400"
                    value={bitField.sequenceSize}
                    placeholder="e.g. 4"
                    onChange={e => onChange({ sequenceSize: e.target.value })}
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="text-gray-500">Step</span>
                  <input
                    className="border border-gray-300 rounded px-2 py-0.5 w-20 focus:outline-none focus:border-red-400"
                    value={bitField.sequenceStep}
                    placeholder="e.g. 8"
                    onChange={e => onChange({ sequenceStep: e.target.value })}
                  />
                </label>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
