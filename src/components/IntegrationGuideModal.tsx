import { generateIntegrationGuide } from '../utils/integrationGuide';

const RGGEN_VERSIONS = __RGGEN_VERSIONS__;

interface Props {
  onClose: () => void;
}

export function IntegrationGuideModal({ onClose }: Props) {
  const content = generateIntegrationGuide(RGGEN_VERSIONS);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
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
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 shrink-0">
          <span className="text-sm font-medium text-gray-700">Integration Guide</span>
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
        <div className="flex-1 overflow-auto bg-gray-50 p-4">
          <pre className="text-xs font-mono text-gray-800 whitespace-pre">{content}</pre>
        </div>
      </div>
    </div>
  );
}
