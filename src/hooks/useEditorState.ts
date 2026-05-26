import { useState, useEffect } from 'react';
import type { RegisterBlock, Register, BitField, IndirectQualifier, ProjectConfig } from '../types/rggen';
import { NO_INITIAL_VALUE_TYPES } from '../types/rggen';
import { parseBlockYaml, parseConfigYaml } from '../utils/yamlParser';
import { createSampleBlocks, createUartCsrBlocks } from '../utils/sampleData';

const STORAGE_KEY = 'rggen-webui-state';

export function defaultInitialValue(type: BitField['type']): string {
  return NO_INITIAL_VALUE_TYPES.has(type) ? '' : '0';
}

export function newBitField(): BitField {
  return {
    id: crypto.randomUUID(),
    name: '',
    lsb: '',
    width: '1',
    type: 'rw',
    initialValue: '0',
    parameterize: false,
    comment: '',
    reference: '',
    sequenceSize: '',
    sequenceStep: '',
    customSwRead: 'default',
    customSwWrite: 'default',
    customSwWriteOnce: false,
    customHwWrite: false,
    customHwSet: false,
    customHwClear: false,
    customReadTrigger: false,
    customWriteTrigger: false,
    showAdvanced: false,
  };
}

export function newRegister(): Register {
  return {
    id: crypto.randomUUID(),
    name: '',
    offsetAddress: '',
    type: 'default',
    comment: '',
    bitFields: [newBitField()],
    expanded: true,
    arraySize: '',
    arrayStep: '',
    indirectQualifiers: [],
    showAdvanced: false,
  };
}

export function newBlock(index: number = 0): RegisterBlock {
  return {
    id: crypto.randomUUID(),
    name: `block_${index}`,
    busWidth: '',
    byteSize: '256',
    comment: '',
    registers: [newRegister()],
  };
}

const DEFAULT_CONFIG: ProjectConfig = {
  busWidth: 32,
  addressWidth: '16',
  protocol: 'apb',
};

function loadState(): { blocks: RegisterBlock[]; activeBlockId: string; config: ProjectConfig } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const blocks: RegisterBlock[] = parsed.blocks ?? [];
      if (blocks.length === 0) blocks.push(newBlock(0));
      const activeBlockId: string = parsed.activeBlockId ?? blocks[0].id;
      const config: ProjectConfig = { ...DEFAULT_CONFIG, ...(parsed.config ?? {}) };
      return { blocks, activeBlockId, config };
    }
  } catch { /* ignore */ }
  const initial = newBlock(0);
  return { blocks: [initial], activeBlockId: initial.id, config: DEFAULT_CONFIG };
}

export function useEditorState() {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const { blocks, activeBlockId, config } = state;
  const activeBlock = blocks.find(b => b.id === activeBlockId) ?? blocks[0];

  const setActiveBlockId = (id: string) =>
    setState(s => ({ ...s, activeBlockId: id }));

  const updateConfig = (updates: Partial<ProjectConfig>) =>
    setState(s => ({ ...s, config: { ...s.config, ...updates } }));

  const setBlocks = (fn: (prev: RegisterBlock[]) => RegisterBlock[]) =>
    setState(s => ({ ...s, blocks: fn(s.blocks) }));

  // Block CRUD
  const addBlock = () => {
    setState(s => {
      const block = newBlock(s.blocks.length);
      return { ...s, blocks: [...s.blocks, block], activeBlockId: block.id };
    });
  };

  const deleteBlock = (id: string) => {
    setState(s => {
      const next = s.blocks.filter(b => b.id !== id);
      if (next.length === 0) {
        const b = newBlock(0);
        return { ...s, blocks: [b], activeBlockId: b.id };
      }
      return { ...s, blocks: next, activeBlockId: s.activeBlockId === id ? next[0].id : s.activeBlockId };
    });
  };

  const updateBlock = (id: string, updates: Partial<RegisterBlock>) =>
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));

  // Register CRUD
  const addRegister = (blockId: string) => {
    const reg = newRegister();
    setBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, registers: [...b.registers, reg] } : b
    ));
  };

  const deleteRegister = (blockId: string, regId: string) =>
    setBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, registers: b.registers.filter(r => r.id !== regId) } : b
    ));

  const updateRegister = (blockId: string, regId: string, updates: Partial<Register>) =>
    setBlocks(prev => prev.map(b =>
      b.id === blockId
        ? { ...b, registers: b.registers.map(r => r.id === regId ? { ...r, ...updates } : r) }
        : b
    ));

  const toggleExpanded = (blockId: string, regId: string) =>
    setBlocks(prev => prev.map(b =>
      b.id === blockId
        ? { ...b, registers: b.registers.map(r => r.id === regId ? { ...r, expanded: !r.expanded } : r) }
        : b
    ));

  const expandRegister = (blockId: string, regId: string) =>
    setBlocks(prev => prev.map(b =>
      b.id === blockId
        ? { ...b, registers: b.registers.map(r => r.id === regId ? { ...r, expanded: true } : r) }
        : b
    ));

  const expandAll = (blockId: string) =>
    setBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, registers: b.registers.map(r => ({ ...r, expanded: true })) } : b
    ));

  const collapseAll = (blockId: string) =>
    setBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, registers: b.registers.map(r => ({
        ...r,
        expanded: false,
        showAdvanced: false,
        bitFields: r.bitFields.map(bf => ({ ...bf, showAdvanced: false })),
      }))} : b
    ));

  // BitField CRUD
  const addBitField = (blockId: string, regId: string) => {
    const bf = newBitField();
    setBlocks(prev => prev.map(b =>
      b.id === blockId
        ? { ...b, registers: b.registers.map(r =>
            r.id === regId ? { ...r, bitFields: [...r.bitFields, bf] } : r
          )}
        : b
    ));
  };

  const deleteBitField = (blockId: string, regId: string, bfId: string) =>
    setBlocks(prev => prev.map(b =>
      b.id === blockId
        ? { ...b, registers: b.registers.map(r =>
            r.id === regId ? { ...r, bitFields: r.bitFields.filter(bf => bf.id !== bfId) } : r
          )}
        : b
    ));

  const updateBitField = (blockId: string, regId: string, bfId: string, updates: Partial<BitField>) =>
    setBlocks(prev => prev.map(b =>
      b.id === blockId
        ? { ...b, registers: b.registers.map(r =>
            r.id === regId
              ? { ...r, bitFields: r.bitFields.map(bf => bf.id === bfId ? { ...bf, ...updates } : bf) }
              : r
          )}
        : b
    ));

  // IndirectQualifier CRUD
  const addQualifier = (blockId: string, regId: string) => {
    const q: IndirectQualifier = { id: crypto.randomUUID(), bitFieldRef: '', fixedValue: '' };
    setBlocks(prev => prev.map(b =>
      b.id === blockId
        ? { ...b, registers: b.registers.map(r =>
            r.id === regId ? { ...r, indirectQualifiers: [...r.indirectQualifiers, q] } : r
          )}
        : b
    ));
  };

  const deleteQualifier = (blockId: string, regId: string, qId: string) =>
    setBlocks(prev => prev.map(b =>
      b.id === blockId
        ? { ...b, registers: b.registers.map(r =>
            r.id === regId
              ? { ...r, indirectQualifiers: r.indirectQualifiers.filter(q => q.id !== qId) }
              : r
          )}
        : b
    ));

  const updateQualifier = (blockId: string, regId: string, qId: string, updates: Partial<IndirectQualifier>) =>
    setBlocks(prev => prev.map(b =>
      b.id === blockId
        ? { ...b, registers: b.registers.map(r =>
            r.id === regId
              ? { ...r, indirectQualifiers: r.indirectQualifiers.map(q => q.id === qId ? { ...q, ...updates } : q) }
              : r
          )}
        : b
    ));

  const resetState = () => {
    const initial = newBlock(0);
    setState({ blocks: [initial], activeBlockId: initial.id, config: DEFAULT_CONFIG });
  };

  const loadSample = () => {
    const [sample] = createSampleBlocks();
    setBlocks(prev => prev.map(b => b.id === activeBlockId ? { ...sample, id: b.id } : b));
  };

  const loadUartCsr = () => {
    const [sample] = createUartCsrBlocks();
    setBlocks(prev => prev.map(b => b.id === activeBlockId ? { ...sample, id: b.id } : b));
  };

  const importBlockFile = async (files: File | File[]): Promise<void> => {
    const fileList = Array.isArray(files) ? files : [files];
    const allBlocks = (await Promise.all(fileList.map(async f => {
      const content = await f.text();
      return parseBlockYaml(content);
    }))).flat();

    const existingNames = new Set(state.blocks.map(b => b.name));
    const duplicates: string[] = [];
    const seen = new Set<string>();
    for (const b of allBlocks) {
      if (existingNames.has(b.name) || seen.has(b.name)) duplicates.push(b.name);
      seen.add(b.name);
    }
    if (duplicates.length > 0)
      throw new Error(`Duplicate block name(s): ${duplicates.map(n => `'${n}'`).join(', ')}`);

    setState(s => ({
      ...s,
      blocks: [...s.blocks, ...allBlocks],
      activeBlockId: allBlocks[allBlocks.length - 1].id,
    }));
  };

  const importConfigFile = async (file: File): Promise<void> => {
    const content = await file.text();
    const imported = parseConfigYaml(content);
    setState(s => ({ ...s, config: imported }));
  };

  return {
    blocks, activeBlock, activeBlockId, config,
    setActiveBlockId, updateConfig,
    addBlock, deleteBlock, updateBlock,
    addRegister, deleteRegister, updateRegister, toggleExpanded, expandRegister, expandAll, collapseAll,
    addBitField, deleteBitField, updateBitField,
    addQualifier, deleteQualifier, updateQualifier,
    resetState, loadSample, loadUartCsr, importBlockFile, importConfigFile,
  };
}
