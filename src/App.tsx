import JSZip from 'jszip';
import { useEditorState } from './hooks/useEditorState';
import { BlockTabs } from './components/BlockTabs';
import { BlockSettings } from './components/BlockSettings';
import { ConfigSettings } from './components/ConfigSettings';
import { RegisterTable } from './components/RegisterTable';
import { generateBlockYaml, generateConfigYaml } from './utils/yamlGenerator';

export default function App() {
  const state = useEditorState();

  const handleDownload = async () => {
    const zip = new JSZip();
    zip.file('config.yml', generateConfigYaml(state.config));
    for (const block of state.blocks) {
      zip.file(`${block.name || 'block'}.yml`, generateBlockYaml(block));
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rggen.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!state.activeBlock) return null;

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-red-200 shrink-0">
        <img src="/rggen.png" alt="RgGen" className="h-8" />
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 border border-gray-300 hover:border-red-400 text-gray-500 hover:text-red-700 text-sm rounded"
            onClick={() => {
              if (confirm('Reset all data to initial state?')) state.resetState();
            }}
          >
            Reset
          </button>
          <button
            className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white text-sm rounded"
            onClick={handleDownload}
          >
            Download All (ZIP)
          </button>
        </div>
      </div>

      {/* Config settings */}
      <div className="shrink-0">
        <ConfigSettings
          config={state.config}
          onChange={state.updateConfig}
          onImport={state.importConfigFile}
        />
      </div>

      {/* Block tabs */}
      <div className="shrink-0">
        <BlockTabs
          blocks={state.blocks}
          activeBlockId={state.activeBlockId}
          onSelect={state.setActiveBlockId}
          onAdd={state.addBlock}
          onDelete={state.deleteBlock}
          onImport={(files) => state.importBlockFile(files)}
        />
      </div>

      {/* Block settings */}
      <div className="shrink-0">
        <BlockSettings
          block={state.activeBlock}
          onChange={updates => state.updateBlock(state.activeBlockId, updates)}
        />
      </div>

      {/* Register table */}
      <RegisterTable
        block={state.activeBlock}
        onAddRegister={() => state.addRegister(state.activeBlockId)}
        onDeleteRegister={regId => state.deleteRegister(state.activeBlockId, regId)}
        onUpdateRegister={(regId, updates) => state.updateRegister(state.activeBlockId, regId, updates)}
        onToggleExpanded={regId => state.toggleExpanded(state.activeBlockId, regId)}
        onAddBitField={regId => state.addBitField(state.activeBlockId, regId)}
        onDeleteBitField={(regId, bfId) => state.deleteBitField(state.activeBlockId, regId, bfId)}
        onUpdateBitField={(regId, bfId, updates) => state.updateBitField(state.activeBlockId, regId, bfId, updates)}
        onAddQualifier={regId => state.addQualifier(state.activeBlockId, regId)}
        onDeleteQualifier={(regId, qId) => state.deleteQualifier(state.activeBlockId, regId, qId)}
        onUpdateQualifier={(regId, qId, updates) => state.updateQualifier(state.activeBlockId, regId, qId, updates)}
      />
    </div>
  );
}
