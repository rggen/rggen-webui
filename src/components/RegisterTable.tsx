import { Fragment } from 'react';
import type { Register, RegisterBlock, BitField, IndirectQualifier } from '../types/rggen';
import { RegisterRow } from './RegisterRow';
import { BitFieldSubTable } from './BitFieldSubTable';

interface Props {
  block: RegisterBlock;
  onAddRegister: () => void;
  onDeleteRegister: (regId: string) => void;
  onUpdateRegister: (regId: string, updates: Partial<Register>) => void;
  onToggleExpanded: (regId: string) => void;
  onAddBitField: (regId: string) => void;
  onDeleteBitField: (regId: string, bfId: string) => void;
  onUpdateBitField: (regId: string, bfId: string, updates: Partial<BitField>) => void;
  onAddQualifier: (regId: string) => void;
  onDeleteQualifier: (regId: string, qId: string) => void;
  onUpdateQualifier: (regId: string, qId: string, updates: Partial<IndirectQualifier>) => void;
}

const th = 'px-2 py-1 text-xs font-medium text-gray-500 text-left border-r border-gray-200';

export function RegisterTable({
  block, onAddRegister, onDeleteRegister, onUpdateRegister, onToggleExpanded,
  onAddBitField, onDeleteBitField, onUpdateBitField,
  onAddQualifier, onDeleteQualifier, onUpdateQualifier,
}: Props) {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-gray-100 border-b border-gray-300">
            <th className="px-2 py-1 w-8 border-r border-gray-200"></th>
            <th className={`${th} min-w-40`}>Name</th>
            <th className={`${th} w-24`}>Offset</th>
            <th className={`${th} w-28`}>Type</th>
            <th className={th}>Comment</th>
            <th className="px-2 py-1 w-20 border-r border-gray-200"></th>
            <th className="px-2 py-1 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {block.registers.map(reg => (
            <Fragment key={reg.id}>
              <RegisterRow
                register={reg}
                onToggle={() => onToggleExpanded(reg.id)}
                onChange={updates => onUpdateRegister(reg.id, updates)}
                onDelete={() => onDeleteRegister(reg.id)}
                onAddQualifier={() => onAddQualifier(reg.id)}
                onDeleteQualifier={qId => onDeleteQualifier(reg.id, qId)}
                onUpdateQualifier={(qId, updates) => onUpdateQualifier(reg.id, qId, updates)}
              />
              {reg.expanded && (
                <BitFieldSubTable
                  register={reg}
                  onAddBitField={() => onAddBitField(reg.id)}
                  onDeleteBitField={bfId => onDeleteBitField(reg.id, bfId)}
                  onUpdateBitField={(bfId, updates) => onUpdateBitField(reg.id, bfId, updates)}
                />
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2">
        <button
          className="px-3 py-1 text-sm border border-red-300 text-red-700 hover:bg-red-50 rounded"
          onClick={onAddRegister}
        >+ Add Register</button>
      </div>
    </div>
  );
}
