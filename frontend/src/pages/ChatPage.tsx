import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bot,
  Send,
  Sparkles,
  Database,
  Plus,
  Trash2,
  Table as TableIcon,
  Lightbulb,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { analystService, datasetService } from '../services/api';
import { ChatMessage, ColumnProfile, Dataset, SessionSummary } from '../types';
import { DynamicChart } from '../components/charts/DynamicChart';
import { SQLViewer } from '../components/analyst/SQLViewer';
import { DataTable } from '../components/analyst/DataTable';

const SUGGESTED_QUESTIONS = [
  'What were my top five selling products by total revenue?',
  'Show monthly sales trends and overall trajectory.',
  'Which region generated the highest profit margin?',
  'Calculate the average order value and summary metrics.',
  'What are the top 5 customers by revenue?',
  'Identify unusual sales patterns or potential outliers.',
];

export const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialDatasetId = searchParams.get('dataset');

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(initialDatasetId || '');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [datasetColumns, setDatasetColumns] = useState<ColumnProfile[]>([]);
  const [activeTableMessageId, setActiveTableMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load datasets & conversation history
  useEffect(() => {
    const init = async () => {
      try {
        const [dList, hList] = await Promise.all([
          datasetService.list(),
          analystService.getHistory(),
        ]);
        setDatasets(dList);
        setSessions(hList);

        if (!selectedDatasetId && dList.length > 0) {
          setSelectedDatasetId(dList[0].id);
        }
      } catch (err) {
        console.error('Failed to initialize chat interface', err);
      }
    };
    init();
  }, []);

  // When selected dataset changes, load its columns for right pane
  useEffect(() => {
    if (!selectedDatasetId) return;
    const fetchColumns = async () => {
      try {
        const profile = await datasetService.getProfile(selectedDatasetId);
        setDatasetColumns(profile.columns || []);
      } catch (err) {
        console.error('Failed to fetch dataset schema', err);
      }
    };
    fetchColumns();
  }, [selectedDatasetId]);

  // When session changes, load messages
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }
    const loadSession = async () => {
      try {
        const detail = await analystService.getSession(currentSessionId);
        setMessages(detail.messages);
      } catch (err) {
        console.error('Failed to load session messages', err);
      }
    };
    loadSession();
  }, [currentSessionId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSendMessage = async (text?: string) => {
    const questionText = text || inputPrompt;
    if (!questionText.trim() || !selectedDatasetId || isSending) return;

    setInputPrompt('');
    setIsSending(true);

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: questionText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const assistantMsg = await analystService.chat(
        selectedDatasetId,
        questionText,
        currentSessionId || undefined
      );

      // Append assistant message
      setMessages((prev) => [...prev, assistantMsg]);

      // Refresh session history list
      const updatedHistory = await analystService.getHistory();
      setSessions(updatedHistory);
      if (!currentSessionId && updatedHistory.length > 0) {
        setCurrentSessionId(updatedHistory[0].id);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error executing analysis: ${err.response?.data?.detail || err.message}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const handleDeleteSession = async (sId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await analystService.deleteSession(sId);
      setSessions((prev) => prev.filter((s) => s.id !== sId));
      if (currentSessionId === sId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  const activeDataset = datasets.find((d) => d.id === selectedDatasetId);

  return (
    <div className="flex h-[calc(100vh-6.5rem)] gap-4 overflow-hidden -m-4 md:-m-6 p-4 md:p-6">
      {/* ================= LEFT PANE: Dataset & Session Manager ================= */}
      <div className="hidden lg:flex w-64 flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shrink-0 overflow-hidden">
        <div className="space-y-3 pb-3 border-b border-slate-800">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Active Dataset
          </label>
          <select
            value={selectedDatasetId}
            onChange={(e) => {
              setSelectedDatasetId(e.target.value);
              handleStartNewSession();
            }}
            className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.file_type.toUpperCase()})
              </option>
            ))}
          </select>

          <button
            onClick={handleStartNewSession}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600/20 border border-blue-500/30 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Chat Session</span>
          </button>
        </div>

        {/* Previous Sessions */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-1 pr-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1 block">
            Conversation History
          </span>
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => setCurrentSessionId(s.id)}
              className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs cursor-pointer transition-colors ${
                currentSessionId === s.id
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <div className="truncate pr-2">
                <p className="font-medium truncate">{s.title}</p>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </div>
              <button
                onClick={(e) => handleDeleteSession(s.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-center py-8 text-[11px] text-slate-500">
              No previous sessions recorded.
            </div>
          )}
        </div>
      </div>

      {/* ================= CENTER PANE: Conversational Stream ================= */}
      <div className="flex flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        {/* Messages Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400 mb-4 border border-blue-500/20 shadow-md">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-white">InsightIQ Autonomous Analyst</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Ask analytical questions in natural English. The agent inspects schema, generates verifiable DuckDB SQL, renders dynamic visuals, and highlights business recommendations.
              </p>

              {/* Suggested Questions */}
              <div className="mt-6 w-full space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Suggested Prompts
                </span>
                <div className="grid grid-cols-1 gap-2 text-left">
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 text-xs text-slate-300 hover:border-blue-500/40 hover:text-white transition-all flex items-center justify-between"
                    >
                      <span>{q}</span>
                      <Sparkles className="h-3 w-3 text-blue-400 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 text-xs ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 shrink-0 border border-blue-500/30">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-3xl space-y-3 rounded-2xl p-4 sm:p-5 ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'border border-slate-800 bg-slate-900/90 text-slate-200'
                  }`}
                >
                  {/* Message Prose */}
                  <div className="prose prose-invert prose-xs leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </div>

                  {/* SQL Viewer */}
                  {m.query_sql && (
                    <SQLViewer
                      sql={m.query_sql}
                      method={m.analytical_method}
                      executionTimeMs={m.result?.summary_metrics?.execution_time_ms}
                    />
                  )}

                  {/* Interactive Dynamic Chart */}
                  {m.chart_config && (
                    <div className="mt-3">
                      <DynamicChart
                        config={m.chart_config}
                        onViewData={() =>
                          setActiveTableMessageId(activeTableMessageId === m.id ? null : m.id)
                        }
                      />
                    </div>
                  )}

                  {/* Expandable Result Data Table */}
                  {activeTableMessageId === m.id && m.result?.raw_data && (
                    <div className="mt-3">
                      <DataTable
                        data={m.result.raw_data}
                        columns={m.result.summary_metrics?.columns}
                        title="Query Output"
                      />
                    </div>
                  )}

                  {/* Recommendations */}
                  {m.result?.recommendations && m.result.recommendations.length > 0 && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                        <Lightbulb className="h-3.5 w-3.5" />
                        <span>Actionable Business Insights</span>
                      </div>
                      <ul className="space-y-1 text-slate-300 pl-4 list-disc text-[11px]">
                        {m.result.recommendations.map((rec, rIdx) => (
                          <li key={rIdx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isSending && (
            <div className="flex gap-3 text-xs items-center text-slate-400">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 shrink-0 border border-blue-500/30 animate-pulse">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5 flex items-center gap-2">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                <span className="font-mono text-[11px]">Executing LangGraph Multi-Agent Pipeline...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-800 bg-slate-950 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder={
                activeDataset
                  ? `Ask a question about ${activeDataset.name}...`
                  : 'Select a dataset to begin...'
              }
              disabled={!selectedDatasetId || isSending}
              className="h-11 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || !selectedDatasetId || isSending}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* ================= RIGHT PANE: Dataset Schema Context ================= */}
      <div className="hidden xl:flex w-72 flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shrink-0 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-semibold text-slate-200">Schema Context</h3>
          </div>
          <span className="text-[10px] text-slate-500">{datasetColumns.length} cols</span>
        </div>

        {activeDataset && (
          <div className="my-3 rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-[11px] font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Records:</span>
              <span className="text-blue-300">{activeDataset.row_count.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Format:</span>
              <span className="text-slate-300 uppercase">{activeDataset.file_type}</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {datasetColumns.map((c) => (
            <div
              key={c.column_name}
              className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-2 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-200 font-semibold truncate max-w-[140px]">
                  {c.column_name}
                </span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400 capitalize">
                  {c.data_type}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Unique: {c.unique_count}</span>
                <span>Nulls: {c.null_count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
