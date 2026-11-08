import React, { useState } from 'react';
import { Check, ChevronDown, ChevronRight, Code2, Copy, Terminal } from 'lucide-react';

interface SQLViewerProps {
  sql?: string;
  method?: string;
  executionTimeMs?: number;
}

export const SQLViewer: React.FC<SQLViewerProps> = ({ sql, method, executionTimeMs }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!sql) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between bg-slate-900/80 px-3.5 py-2 text-left font-medium text-slate-300 transition-colors hover:bg-slate-800/80"
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
          <Code2 className="h-3.5 w-3.5 text-blue-400" />
          <span className="font-semibold text-slate-200">Analytical Operation</span>
          {method && (
            <span className="rounded bg-blue-950/70 border border-blue-800/60 px-2 py-0.5 text-[10px] text-blue-300">
              {method}
            </span>
          )}
        </div>
        {executionTimeMs !== undefined && (
          <span className="text-[11px] text-slate-400 font-mono">
            {executionTimeMs}ms
          </span>
        )}
      </button>

      {isOpen && (
        <div className="relative border-t border-slate-800 p-3 bg-slate-950 font-mono text-slate-300">
          <div className="absolute right-2 top-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? 'Copied' : 'Copy SQL'}</span>
            </button>
          </div>
          <div className="flex items-start gap-2 pr-16 overflow-x-auto">
            <Terminal className="h-3.5 w-3.5 mt-0.5 text-slate-500 shrink-0" />
            <pre className="text-blue-300 whitespace-pre-wrap">{sql}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
