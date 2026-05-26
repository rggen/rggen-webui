import { useState, useEffect, useMemo, useRef } from 'react';
import JSZip from 'jszip';
import { useEditorState } from './hooks/useEditorState';
import { useRgGenWasm } from './hooks/useRgGenWasm';
import { BlockTabs } from './components/BlockTabs';
import { BlockSettings } from './components/BlockSettings';
import { ConfigSettings } from './components/ConfigSettings';
import { RegisterTable } from './components/RegisterTable';
import { YamlPreviewModal } from './components/YamlPreviewModal';
import { IntegrationGuideModal } from './components/IntegrationGuideModal';
import {
  generateBlockYaml, generateConfigYaml,
  generateBlockYamlWithSourceMap, generateConfigYamlWithSourceMap,
  lookupSourceMap,
} from './utils/yamlGenerator';
import type { SourceLocation } from './utils/yamlGenerator';

const RGGEN_VERSIONS = __RGGEN_VERSIONS__;

function formatVersionsText(): string {
  return Object.entries(RGGEN_VERSIONS)
    .map(([name, version]) => `${name}: ${version}`)
    .join('\n');
}

export default function App() {
  const state = useEditorState();
  const wasm = useRgGenWasm();
  const [showPreview, setShowPreview] = useState(false);
  const [showIntegrationGuide, setShowIntegrationGuide] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showSampleMenu, setShowSampleMenu] = useState(false);
  const versionsRef = useRef<HTMLDivElement>(null);
  const sampleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showVersions) return;
    const handler = (e: MouseEvent) => {
      if (versionsRef.current && !versionsRef.current.contains(e.target as Node)) {
        setShowVersions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showVersions]);

  useEffect(() => {
    if (!showSampleMenu) return;
    const handler = (e: MouseEvent) => {
      if (sampleMenuRef.current && !sampleMenuRef.current.contains(e.target as Node)) {
        setShowSampleMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSampleMenu]);

  // Derive highlight location from error — pure computation, no setState needed
  const errorLoc = useMemo<SourceLocation | null>(() => {
    if (!wasm.errorLocation) return null;
    const approximate = wasm.errorLocation.approximate;
    const strip = (loc: SourceLocation | null): SourceLocation | null =>
      loc && approximate
        ? { ...loc, property: undefined, bfProperty: undefined, configField: undefined, blockProperty: undefined }
        : loc;

    if (wasm.errorLocation.kind === 'config') {
      const { sourceMap } = generateConfigYamlWithSourceMap(state.config);
      return strip(lookupSourceMap(sourceMap, wasm.errorLocation.line));
    }
    const block = state.blocks.find(b => (b.name || 'block') === wasm.errorLocation!.blockName);
    if (!block) return null;
    const { sourceMap } = generateBlockYamlWithSourceMap(block);
    return strip(lookupSourceMap(sourceMap, wasm.errorLocation.line));
  }, [wasm.errorLocation, state.config, state.blocks]);

  // Side effects only: switch block tab and expand the relevant register
  useEffect(() => {
    if (!wasm.errorLocation || wasm.errorLocation.kind !== 'block') return;
    const block = state.blocks.find(b => (b.name || 'block') === wasm.errorLocation!.blockName);
    if (!block) return;
    state.setActiveBlockId(block.id);
    if (errorLoc?.registerId) state.expandRegister(block.id, errorLoc.registerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wasm.errorLocation]);

  const handleDownload = async () => {
    const zip = new JSZip();
    zip.file('config.yaml', generateConfigYaml(state.config));
    for (const block of state.blocks) {
      zip.file(`${block.name || 'block'}.yaml`, generateBlockYaml(block));
    }
    zip.file('VERSIONS', formatVersionsText());
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rggen.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateBusy = wasm.status === 'loading' || wasm.status === 'running';
  const generateLabel = wasm.status === 'loading' ? 'Loading...'
    : wasm.status === 'running' ? 'Running...'
    : 'Generate (ZIP)';

  if (!state.activeBlock) return null;

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-red-200 shrink-0">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}rggen.png`} alt="RgGen" className="h-8" />
          <a
            href="https://github.com/rggen/rggen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-red-700"
          >GitHub</a>
          <a
            href="https://github.com/rggen/rggen/wiki"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-red-700"
          >Wiki</a>
          <div className="relative" ref={versionsRef}>
            <button
              className="text-xs text-gray-400 hover:text-red-700"
              onClick={() => setShowVersions(v => !v)}
            >
              Versions
            </button>
            {showVersions && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded shadow-md p-3 min-w-max">
                <table className="text-xs text-gray-700 border-collapse">
                  <tbody>
                    {Object.entries(RGGEN_VERSIONS).map(([name, version]) => (
                      <tr key={name}>
                        <td className="pr-4 py-0.5 font-mono">{name}</td>
                        <td className="py-0.5 font-mono text-gray-500">{version}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={sampleMenuRef}>
            <button
              className="px-3 py-1 border border-gray-300 hover:border-red-400 text-gray-500 hover:text-red-700 text-sm rounded"
              onClick={() => setShowSampleMenu(v => !v)}
            >
              Load Sample
            </button>
            {showSampleMenu && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded shadow-md min-w-max">
                {[
                  { label: 'block_0 (all field types)', action: () => { if (confirm('Load sample into current tab? Current block will be replaced.')) { state.loadSample(); setShowSampleMenu(false); } } },
                  { label: 'uart_csr (UART)',            action: () => { if (confirm('Load sample into current tab? Current block will be replaced.')) { state.loadUartCsr(); setShowSampleMenu(false); } } },
                ].map(({ label, action }) => (
                  <button
                    key={label}
                    className="block w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={action}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="px-3 py-1 border border-gray-300 hover:border-red-400 text-gray-500 hover:text-red-700 text-sm rounded"
            onClick={() => {
              if (confirm('Reset all data to initial state?')) state.resetState();
            }}
          >
            Reset
          </button>
          <button
            className="px-3 py-1 border border-gray-300 hover:border-red-400 text-gray-500 hover:text-red-700 text-sm rounded"
            onClick={() => setShowPreview(true)}
          >
            Preview YAML
          </button>
          <button
            className="px-3 py-1 border border-gray-300 hover:border-red-400 text-gray-500 hover:text-red-700 text-sm rounded"
            onClick={() => setShowIntegrationGuide(true)}
          >
            Integration Guide
          </button>
          <button
            className="px-3 py-1 border border-red-300 hover:border-red-500 text-red-700 hover:text-red-900 text-sm rounded"
            onClick={handleDownload}
          >
            Download YAML (ZIP)
          </button>
          <button
            className="px-3 py-1 bg-red-800 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded"
            onClick={() => wasm.generate(state.config, state.blocks)}
            disabled={generateBusy}
          >
            {generateLabel}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {wasm.error && (
        <div className="shrink-0 flex items-start gap-2 px-4 py-2 bg-red-50 border-b border-red-200 text-red-800 text-sm">
          <pre className="flex-1 whitespace-pre-wrap font-mono text-xs">{wasm.error}</pre>
          <button
            className="shrink-0 text-red-400 hover:text-red-700 leading-none text-base"
            onClick={wasm.clearError}
          >×</button>
        </div>
      )}

      {/* Config settings */}
      <div className="shrink-0">
        <ConfigSettings
          config={state.config}
          onChange={state.updateConfig}
          onImport={state.importConfigFile}
          highlightedField={errorLoc?.kind === 'config' ? errorLoc.configField : undefined}
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
          highlightedField={errorLoc?.kind === 'block' && errorLoc.blockId === state.activeBlock.id ? errorLoc.blockProperty : undefined}
        />
      </div>

      {/* Integration Guide modal */}
      {showIntegrationGuide && (
        <IntegrationGuideModal onClose={() => setShowIntegrationGuide(false)} />
      )}

      {/* YAML Preview modal */}
      {showPreview && (
        <YamlPreviewModal
          config={state.config}
          blocks={state.blocks}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Register table */}
      <RegisterTable
        block={state.activeBlock}
        errorLoc={errorLoc}
        onAddRegister={() => state.addRegister(state.activeBlockId)}
        onDeleteRegister={regId => state.deleteRegister(state.activeBlockId, regId)}
        onUpdateRegister={(regId, updates) => state.updateRegister(state.activeBlockId, regId, updates)}
        onToggleExpanded={regId => state.toggleExpanded(state.activeBlockId, regId)}
        onExpandAll={() => state.expandAll(state.activeBlockId)}
        onCollapseAll={() => state.collapseAll(state.activeBlockId)}
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
