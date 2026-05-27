import { useState, useRef, useEffect } from 'react';
import { HELP_CONTENT } from '../utils/helpContent';
import type { HelpLevel, HelpItem } from '../utils/helpContent';

const LEVELS: HelpLevel[] = ['config', 'block', 'register', 'bitfield'];

interface Props {
  level: HelpLevel;
  onLevelChange: (level: HelpLevel) => void;
  onClose: () => void;
}

function Description({ text }: { text: string | string[] }) {
  if (Array.isArray(text)) {
    return (
      <ul className="mt-0.5 flex flex-col gap-0.5 list-disc list-inside">
        {text.map((line, i) => (
          <li key={i} className="text-xs text-gray-600">{line}</li>
        ))}
      </ul>
    );
  }
  return <div className="text-xs text-gray-600 mt-0.5">{text}</div>;
}

function OptionsItem({ item }: { item: Extract<HelpItem, { kind: 'options' }> }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div className="font-semibold text-gray-700 text-xs">{item.label}</div>
      <Description text={item.description} />
      <button
        className="mt-1 flex items-center gap-1 text-xs text-gray-400 hover:text-red-700"
        onClick={() => setExpanded(e => !e)}
      >
        <span>{expanded ? '▲ Hide options' : '▼ Show options'}</span>
      </button>
      {expanded && (
        <div className="mt-1.5 ml-2 flex flex-col gap-1.5 border-l-2 border-gray-200 pl-2">
          {item.options.map(opt => (
            <div key={opt.value}>
              <span className="font-mono text-xs font-medium text-red-800">{opt.value}</span>
              <span className="text-xs text-gray-600"> — {opt.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HelpPanel({ level, onLevelChange, onClose }: Props) {
  const section = HELP_CONTENT[level];
  const [width, setWidth] = useState(320);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = startX.current - e.clientX;
      setWidth(Math.max(240, Math.min(720, startWidth.current + delta)));
    };
    const onMouseUp = () => { isResizing.current = false; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const handleResizeStart = (e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    e.preventDefault();
  };

  return (
    <div
      className="relative shrink-0 border-l border-gray-200 bg-gray-50 flex flex-col overflow-hidden"
      style={{ width }}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-red-300 z-10"
        onMouseDown={handleResizeStart}
      />

      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-white shrink-0 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Help</span>
        {LEVELS.map(l => (
          <button
            key={l}
            className={`px-2 py-0.5 text-xs rounded ${level === l ? 'bg-red-700 text-white' : 'text-gray-500 hover:text-red-700 hover:bg-red-50'}`}
            onClick={() => onLevelChange(l)}
          >
            {l.charAt(0).toUpperCase() + l.slice(1)}
          </button>
        ))}
        <button
          className="ml-auto text-gray-400 hover:text-gray-600 text-base leading-none"
          onClick={onClose}
        >×</button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
        {section.items.map((item, i) =>
          item.kind === 'field' ? (
            <div key={i}>
              <div className="font-semibold text-gray-700 text-xs">{item.label}</div>
              <Description text={item.description} />
            </div>
          ) : (
            <OptionsItem key={i} item={item} />
          )
        )}
      </div>
    </div>
  );
}
