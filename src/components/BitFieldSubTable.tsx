import type { BitField, Register } from '../types/rggen';
import { BitFieldRow } from './BitFieldRow';

interface Props {
  register: Register;
  onAddBitField: () => void;
  onDeleteBitField: (bfId: string) => void;
  onUpdateBitField: (bfId: string, updates: Partial<BitField>) => void;
}

const th = 'px-2 py-1 text-xs font-medium text-gray-500 text-left border-r border-gray-200 bg-gray-100';

export function BitFieldSubTable({ register, onAddBitField, onDeleteBitField, onUpdateBitField }: Props) {
  return (
    <tr>
      <td colSpan={7} className="p-0 bg-gray-50">
        <div className="ml-10 border-l-2 border-red-300">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className={`${th} min-w-36`}>Name</th>
                <th className={`${th} w-16 text-center`}>LSB</th>
                <th className={`${th} w-16 text-center`}>Width</th>
                <th className={`${th} w-32`}>Type</th>
                <th className={`${th} w-20`}>Init</th>
                <th className={th}>Comment</th>
                <th className="px-2 py-1 w-20 bg-gray-100"></th>
                <th className="px-2 py-1 w-8 bg-gray-100"></th>
              </tr>
            </thead>
            <tbody>
              {register.bitFields.map(bf => (
                <BitFieldRow
                  key={bf.id}
                  bitField={bf}
                  onChange={updates => onUpdateBitField(bf.id, updates)}
                  onDelete={() => onDeleteBitField(bf.id)}
                />
              ))}
            </tbody>
          </table>
          <div className="px-4 py-1.5">
            <button
              className="px-2 py-0.5 text-xs border border-red-300 text-red-700 hover:bg-red-50 rounded"
              onClick={onAddBitField}
            >+ Add Bit Field</button>
          </div>
        </div>
      </td>
    </tr>
  );
}
