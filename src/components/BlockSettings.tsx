import type { RegisterBlock } from '../types/rggen';

interface Props {
  block: RegisterBlock;
  onChange: (updates: Partial<RegisterBlock>) => void;
}

export function BlockSettings({ block, onChange }: Props) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-200 text-sm flex-wrap">
      <label className="flex items-center gap-2">
        <span className="text-gray-500 font-medium">Name</span>
        <input
          className="border border-gray-300 rounded px-2 py-1 w-36 focus:outline-none focus:border-blue-400"
          value={block.name}
          onChange={e => onChange({ name: e.target.value })}
        />
      </label>
      <label className="flex items-center gap-2">
        <span className="text-gray-500 font-medium">Bus Width</span>
        <select
          className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
          value={block.busWidth}
          onChange={e => onChange({ busWidth: Number(e.target.value) as 8 | 16 | 32 | 64 })}
        >
          {[8, 16, 32, 64].map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-gray-500 font-medium">Byte Size</span>
        <input
          className="border border-gray-300 rounded px-2 py-1 w-24 focus:outline-none focus:border-blue-400"
          value={block.byteSize}
          onChange={e => onChange({ byteSize: e.target.value })}
        />
      </label>
      <label className="flex items-center gap-2">
        <span className="text-gray-500 font-medium">Comment</span>
        <input
          className="border border-gray-300 rounded px-2 py-1 w-56 focus:outline-none focus:border-blue-400"
          value={block.comment}
          placeholder="optional"
          onChange={e => onChange({ comment: e.target.value })}
        />
      </label>
    </div>
  );
}
