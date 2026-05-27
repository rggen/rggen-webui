import { Fragment } from 'react';
import type { Register, RegisterBlock, BitField, IndirectQualifier } from '../types/rggen';
import type { SourceLocation } from '../utils/yamlGenerator';
import { RegisterRow } from './RegisterRow';
import { BitFieldSubTable } from './BitFieldSubTable';

interface Props {
  block: RegisterBlock;
  errorLoc?: SourceLocation | null;
  onAddRegister: () => void;
  onDeleteRegister: (regId: string) => void;
  onUpdateRegister: (regId: string, updates: Partial<Register>) => void;
  onToggleExpanded: (regId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onAddBitField: (regId: string) => void;
  onDeleteBitField: (regId: string, bfId: string) => void;
  onUpdateBitField: (regId: string, bfId: string, updates: Partial<BitField>) => void;
  onAddQualifier: (regId: string) => void;
  onDeleteQualifier: (regId: string, qId: string) => void;
  onUpdateQualifier: (regId: string, qId: string, updates: Partial<IndirectQualifier>) => void;
  onRegisterHelpClick?: () => void;
  onBitFieldHelpClick?: () => void;
}

const th = 'px-2 py-1 text-xs font-medium text-gray-500 text-left border-r border-gray-200';

export function RegisterTable({
  block, errorLoc,
  onAddRegister, onDeleteRegister, onUpdateRegister, onToggleExpanded,
  onExpandAll, onCollapseAll,
  onAddBitField, onDeleteBitField, onUpdateBitField,
  onAddQualifier, onDeleteQualifier, onUpdateQualifier,
  onRegisterHelpClick, onBitFieldHelpClick,
}: Props) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-auto relative">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="px-2 py-1 w-8 border-r border-gray-200"></th>
              <th className="px-2 py-1 w-20 border-r border-gray-200"></th>
              <th className={`${th} min-w-40`}>Name</th>
              <th className={`${th} w-24`}>Offset</th>
              <th className={`${th} w-28`}>Type</th>
              <th className={th}>Comment</th>
              <th className="px-2 py-1 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {block.registers.map(reg => {
              const isRegError = errorLoc?.kind === 'register' && errorLoc.registerId === reg.id;
              const isBfError  = errorLoc?.kind === 'bitfield'  && errorLoc.registerId === reg.id;
              return (
                <Fragment key={reg.id}>
                  <RegisterRow
                    register={reg}
                    highlighted={isRegError}
                    highlightedProperty={isRegError ? errorLoc.property : undefined}
                    onToggle={() => onToggleExpanded(reg.id)}
                    onChange={updates => onUpdateRegister(reg.id, updates)}
                    onDelete={() => onDeleteRegister(reg.id)}
                    onAddQualifier={() => onAddQualifier(reg.id)}
                    onDeleteQualifier={qId => onDeleteQualifier(reg.id, qId)}
                    onUpdateQualifier={(qId, updates) => onUpdateQualifier(reg.id, qId, updates)}
                    onHelpClick={onRegisterHelpClick}
                  />
                  {reg.expanded && (
                    <BitFieldSubTable
                      register={reg}
                      errorBitFieldId={isBfError ? errorLoc.bitFieldId : undefined}
                      highlightedBfProperty={isBfError ? errorLoc.bfProperty : undefined}
                      onAddBitField={() => onAddBitField(reg.id)}
                      onDeleteBitField={bfId => onDeleteBitField(reg.id, bfId)}
                      onUpdateBitField={(bfId, updates) => onUpdateBitField(reg.id, bfId, updates)}
                      onHelpClick={onBitFieldHelpClick}
                    />
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        <div className="sticky bottom-0 px-4 py-2 flex items-center gap-2 border-t border-gray-200 bg-white">
          <button
            className="px-3 py-1 text-sm border border-red-300 text-red-700 hover:bg-red-50 rounded"
            onClick={onAddRegister}
          >+ Add Register</button>
          <button
            className="px-3 py-1 text-sm border border-gray-300 text-gray-500 hover:bg-gray-50 rounded"
            onClick={onExpandAll}
          >Expand All</button>
          <button
            className="px-3 py-1 text-sm border border-gray-300 text-gray-500 hover:bg-gray-50 rounded"
            onClick={onCollapseAll}
          >Collapse All</button>
        </div>
      </div>
    </div>
  );
}
