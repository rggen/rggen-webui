import { useState } from 'react';
import type { ProjectConfig, RegisterBlock } from '../types/rggen';
import { generateConfigYaml, generateBlockYaml } from '../utils/yamlGenerator';

interface Props {
  config: ProjectConfig;
  blocks: RegisterBlock[];
  onClose: () => void;
}

export function YamlPreviewModal({ config, blocks, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'config' | string>('config');

  const tabs = [
    { id: 'config' as const, label: 'config.yaml', content: generateConfigYaml(config) },
    ...blocks.map(b => ({
      id: b.id,
      label: `${b.name || 'block'}.yaml`,
      content: generateBlockYaml(b),
    })),
  ];

  const activeContent = tabs.find(t => t.id === activeTab)?.content ?? '';

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded shadow-lg flex flex-col w-3/4 max-w-4xl h-3/4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 shrink-0">
          <span className="text-sm font-medium text-gray-700">YAML Preview</span>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 text-xs border border-gray-300 hover:border-red-400 text-gray-500 hover:text-red-700 rounded"
              onClick={handleCopy}
            >
              Copy
            </button>
            <button
              className="text-gray-400 hover:text-gray-700 text-lg leading-none"
              onClick={onClose}
            >×</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 shrink-0 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`px-3 py-1.5 text-xs whitespace-nowrap border-b-2 ${
                activeTab === tab.id
                  ? 'border-red-800 text-red-800 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <table className="w-full border-collapse text-xs font-mono">
            <tbody>
              {activeContent.split('\n').filter((_, i, a) => i < a.length - 1).map((line, i) => (
                <tr key={i} className="leading-5">
                  <td className="select-none text-right text-gray-400 px-3 py-0 w-10 border-r border-gray-200 bg-gray-100 shrink-0">
                    {i + 1}
                  </td>
                  <td className="px-3 py-0 text-gray-800 whitespace-pre">{line}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
