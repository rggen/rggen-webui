import { useState, useRef } from 'react';
import JSZip from 'jszip';
import type { ProjectConfig, RegisterBlock } from '../types/rggen';
import { generateConfigYaml, generateBlockYaml } from '../utils/yamlGenerator';

type WasmStatus = 'idle' | 'loading' | 'ready' | 'running';

export interface ErrorLocation {
  kind: 'config' | 'block';
  blockName?: string;
  line: number;
  approximate?: boolean;
}

export function useRgGenWasm() {
  const [status, setStatus] = useState<WasmStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [errorLocation, setErrorLocation] = useState<ErrorLocation | null>(null);
  // Cache VM — module compilation and Ruby initialization (including plugin loading) are done once
  const vmRef = useRef<{ eval(code: string): unknown } | null>(null);

  const ensureVM = async () => {
    if (vmRef.current) return vmRef.current;
    setStatus('loading');
    const mod = await WebAssembly.compileStreaming(fetch(`${import.meta.env.BASE_URL}rggen.wasm`));
    const { DefaultRubyVM } = await import('@ruby/wasm-wasi/dist/browser');
    const { vm } = await DefaultRubyVM(mod);
    vm.eval(`require '/src/rggen-wasm.rb'`);  // calls RgGen::WASM.init internally
    vmRef.current = vm;
    return vm;
  };

  const generate = async (config: ProjectConfig, blocks: RegisterBlock[]) => {
    setError(null);
    setErrorLocation(null);
    setStatus('loading');
    try {
      const vm = await ensureVM();
      setStatus('running');
      await new Promise<void>(resolve => setTimeout(resolve, 0));

      const inputObj = {
        config: generateConfigYaml(config),
        register_maps: blocks.map(b => ({
          name: b.name || 'block',
          yaml: generateBlockYaml(b),
        })),
      };
      const inputB64 = btoa(unescape(encodeURIComponent(JSON.stringify(inputObj))));

      const result = vm.eval(`RgGen::WASM.run('/work', '${inputB64}')`);
      const msg = result?.toString();
      if (msg && msg !== 'nil') throw new Error(msg);

      const outputsRbValue = vm.eval("RgGen::WASM.collect_outputs('/work')");
      const outputsB64 = outputsRbValue!.toString();
      const outputs: Record<string, string> = JSON.parse(atob(outputsB64));

      const versionsText = Object.entries(__RGGEN_VERSIONS__)
        .map(([name, version]) => `${name}: ${version}`)
        .join('\n');

      const zip = new JSZip();
      for (const [filename, content] of Object.entries(outputs)) {
        zip.file(filename, content);
      }
      zip.file('config.yaml', generateConfigYaml(config));
      for (const block of blocks) {
        zip.file(`${block.name || 'block'}.yaml`, generateBlockYaml(block));
      }
      zip.file('VERSIONS', versionsText);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rggen_output.zip';
      a.click();
      URL.revokeObjectURL(url);

      setStatus('ready');
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      const displayMsg = raw.split('\n')[0].trim();
      setError(displayMsg);

      // Error format: "-- filename: /work/<name>.yaml line N column M"
      const fileMatch = displayMsg.match(/-- filename:\s+\/work\/([^\s/]+)\.yaml\s+line\s+(\d+)/);
      if (fileMatch) {
        const fileName   = fileMatch[1];
        const line       = Number(fileMatch[2]);
        const approximate = displayMsg.includes('(approximately)');
        if (fileName === 'config') {
          setErrorLocation({ kind: 'config', line, approximate });
        } else {
          setErrorLocation({ kind: 'block', blockName: fileName, line, approximate });
        }
      } else {
        setErrorLocation(null);
      }

      setStatus(vmRef.current ? 'ready' : 'idle');
    }
  };

  const clearError = () => {
    setError(null);
    setErrorLocation(null);
  };

  return { status, error, errorLocation, clearError, generate };
}
