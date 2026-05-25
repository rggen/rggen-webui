import type { ProjectConfig, Protocol } from '../types/rggen';

const PROTOCOLS: Protocol[] = ['apb', 'axi4lite', 'avalon', 'wishbone'];

const HIGHLIGHT = 'outline outline-2 outline-red-500 rounded';

interface Props {
  config: ProjectConfig;
  onChange: (updates: Partial<ProjectConfig>) => void;
  onImport: (file: File) => Promise<void>;
  highlightedField?: keyof ProjectConfig;
}

export function ConfigSettings({ config, onChange, onImport, highlightedField }: Props) {
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onImport(file).catch(err => alert(`Import failed:\n${err.message}`));
    e.target.value = '';
  };

  const hl = (field: keyof ProjectConfig) => highlightedField === field ? HIGHLIGHT : '';

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-red-50 border-b border-red-200 text-sm flex-wrap">
      <span className="text-red-800 font-semibold text-xs uppercase tracking-wide">Config</span>
      <label className="flex items-center gap-2">
        <span className="text-gray-500 font-medium">Bus Width</span>
        <select
          className={`border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-red-400 ${hl('busWidth')}`}
          value={config.busWidth}
          onChange={e => onChange({ busWidth: Number(e.target.value) as 8 | 16 | 32 | 64 })}
        >
          {[8, 16, 32, 64].map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-gray-500 font-medium">Address Width</span>
        <input
          className={`border border-gray-300 rounded px-2 py-1 w-20 focus:outline-none focus:border-red-400 ${hl('addressWidth')}`}
          value={config.addressWidth}
          onChange={e => onChange({ addressWidth: e.target.value })}
        />
      </label>
      <label className="flex items-center gap-2">
        <span className="text-gray-500 font-medium">Protocol</span>
        <select
          className={`border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-red-400 ${hl('protocol')}`}
          value={config.protocol}
          onChange={e => onChange({ protocol: e.target.value as Protocol })}
        >
          {PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      <label className={`flex items-center gap-2 ${hl('enableWideRegister')}`}>
        <input
          type="checkbox"
          checked={config.enableWideRegister}
          onChange={e => onChange({ enableWideRegister: e.target.checked })}
          className="accent-red-700"
        />
        <span className="text-gray-500 font-medium">Enable Wide Register</span>
      </label>
      <label className="px-2 py-0.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-100 rounded cursor-pointer">
        From YAML
        <input type="file" accept=".yml,.yaml" className="hidden" onChange={handleImport} />
      </label>
    </div>
  );
}
