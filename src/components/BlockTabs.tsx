import type { RegisterBlock } from '../types/rggen';

interface Props {
  blocks: RegisterBlock[];
  activeBlockId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onImport: (files: File[]) => Promise<void>;
}

export function BlockTabs({ blocks, activeBlockId, onSelect, onAdd, onDelete, onImport }: Props) {
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    onImport(files).catch(err => alert(`Import failed:\n${err.message}`));
    e.target.value = '';
  };

  return (
    <div className="flex items-end border-b border-gray-200 bg-gray-50 px-4 gap-1">
      {blocks.map(block => (
        <div
          key={block.id}
          className={`flex items-center gap-1 px-3 py-2 text-sm cursor-pointer border-b-2 -mb-px select-none ${
            block.id === activeBlockId
              ? 'border-red-800 text-red-800 font-medium bg-white'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-t'
          }`}
          onClick={() => onSelect(block.id)}
        >
          <span>{block.name || '(unnamed)'}</span>
          <button
            className="ml-1 text-gray-400 hover:text-red-600 leading-none"
            onClick={e => { e.stopPropagation(); onDelete(block.id); }}
            title="Delete block"
          >×</button>
        </div>
      ))}
      <div className="flex items-center gap-1 mb-1 self-center">
        <button
          className="px-3 py-1 text-sm border border-red-300 text-red-700 hover:bg-red-50 rounded"
          onClick={onAdd}
        >+ Add Block</button>
        <label className="px-3 py-1 text-sm border border-gray-300 text-gray-600 hover:bg-gray-100 rounded cursor-pointer">
          From YAML
          <input type="file" accept=".yml,.yaml" multiple className="hidden" onChange={handleImport} />
        </label>
      </div>
    </div>
  );
}
