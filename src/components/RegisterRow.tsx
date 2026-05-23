import type { Register, RegisterType, IndirectQualifier } from '../types/rggen';

const REGISTER_TYPES: RegisterType[] = ['default', 'rw', 'indirect', 'external', 'reserved', 'maskable'];

interface Props {
  register: Register;
  onToggle: () => void;
  onChange: (updates: Partial<Register>) => void;
  onDelete: () => void;
  onAddQualifier: () => void;
  onDeleteQualifier: (qId: string) => void;
  onUpdateQualifier: (qId: string, updates: Partial<IndirectQualifier>) => void;
}

const td = 'px-2 py-1 border-r border-gray-200 text-sm';

export function RegisterRow({
  register, onToggle, onChange, onDelete,
  onAddQualifier, onDeleteQualifier, onUpdateQualifier,
}: Props) {
  const handleTypeChange = (newType: RegisterType) => {
    const updates: Partial<Register> = { type: newType };
    if (newType === 'indirect') updates.showAdvanced = true;
    onChange(updates);
  };

  return (
    <>
      <tr className="border-b border-gray-200 hover:bg-red-50">
        <td className="px-2 py-1 w-8 text-center border-r border-gray-200">
          <button
            className="text-gray-500 hover:text-red-700 text-xs"
            onClick={onToggle}
            title={register.expanded ? 'Collapse' : 'Expand bit fields'}
          >
            {register.expanded ? '▼' : '▶'}
          </button>
        </td>
        <td className={`${td} min-w-40`}>
          <input
            className="w-full outline-none bg-transparent"
            value={register.name}
            placeholder="register_0"
            onChange={e => onChange({ name: e.target.value })}
          />
        </td>
        <td className={`${td} w-24`}>
          <input
            className="w-full outline-none bg-transparent font-mono"
            value={register.offsetAddress}
            placeholder="0x00"
            onChange={e => onChange({ offsetAddress: e.target.value })}
          />
        </td>
        <td className={`${td} w-28`}>
          <select
            className="w-full outline-none bg-transparent"
            value={register.type}
            onChange={e => handleTypeChange(e.target.value as RegisterType)}
          >
            {REGISTER_TYPES.map(t => (
              <option key={t} value={t}>{t === 'default' ? '(default)' : t}</option>
            ))}
          </select>
        </td>
        <td className={td}>
          <input
            className="w-full outline-none bg-transparent"
            value={register.comment}
            placeholder="comment"
            onChange={e => onChange({ comment: e.target.value })}
          />
        </td>
        <td className="px-2 py-1 w-20 text-center border-r border-gray-200">
          <button
            className="text-xs text-gray-400 hover:text-red-700 whitespace-nowrap"
            onClick={() => onChange({ showAdvanced: !register.showAdvanced })}
          >
            Adv {register.showAdvanced ? '▲' : '▼'}
          </button>
        </td>
        <td className="px-2 py-1 w-8 text-center">
          <button className="text-gray-400 hover:text-red-600" onClick={onDelete}>×</button>
        </td>
      </tr>

      {register.showAdvanced && (
        <tr className="bg-red-50 border-b border-gray-200">
          <td colSpan={7} className="px-6 py-2">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-600 font-medium w-20">Array:</span>
                <label className="flex items-center gap-1">
                  <span className="text-gray-500">Size</span>
                  <input
                    className="border border-gray-300 rounded px-2 py-0.5 w-20 focus:outline-none focus:border-red-400"
                    value={register.arraySize}
                    placeholder="e.g. 4"
                    onChange={e => onChange({ arraySize: e.target.value })}
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="text-gray-500">Step</span>
                  <input
                    className="border border-gray-300 rounded px-2 py-0.5 w-20 focus:outline-none focus:border-red-400"
                    value={register.arrayStep}
                    placeholder="e.g. 8"
                    onChange={e => onChange({ arrayStep: e.target.value })}
                  />
                </label>
              </div>

              {register.type === 'indirect' && (
                <div className="flex flex-col gap-1">
                  <span className="text-gray-600 font-medium">Qualifiers:</span>
                  {register.indirectQualifiers.map(q => (
                    <div key={q.id} className="flex items-center gap-2 ml-4">
                      <input
                        className="border border-gray-300 rounded px-2 py-0.5 w-52 font-mono text-sm focus:outline-none focus:border-red-400"
                        value={q.bitFieldRef}
                        placeholder="register_0.bit_field_0"
                        onChange={e => onUpdateQualifier(q.id, { bitFieldRef: e.target.value })}
                      />
                      <input
                        className="border border-gray-300 rounded px-2 py-0.5 w-28 font-mono text-sm focus:outline-none focus:border-red-400"
                        value={q.fixedValue}
                        placeholder="Fixed value (opt.)"
                        onChange={e => onUpdateQualifier(q.id, { fixedValue: e.target.value })}
                      />
                      <button
                        className="text-gray-400 hover:text-red-600"
                        onClick={() => onDeleteQualifier(q.id)}
                      >×</button>
                    </div>
                  ))}
                  <button
                    className="ml-4 text-xs text-red-700 hover:underline self-start"
                    onClick={onAddQualifier}
                  >+ Add Qualifier</button>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
