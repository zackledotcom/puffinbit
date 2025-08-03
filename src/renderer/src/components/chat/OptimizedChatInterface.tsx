import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Settings, ChevronDown, Mic, ArrowUp, Volleyball, Crown, Wrench, Brain, Zap,
  MoreHorizontal, Upload, FileText, FolderOpen, X, Code
} from 'lucide-react';
import { BlurFade } from '@/components/ui/blur-fade';
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar';
import { useModelStore } from '@/stores/useModelStore';
import { useMessageStore } from '@/stores/useMessageStore';
import { useMemoryStore } from '@/stores/useMemoryStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { CanvasPanel } from '@/components/canvas';
import AIDiffOverlay from '@/components/canvas/AIDiffOverlay';
import { cn } from '@/lib/utils';

interface Message { id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: Date; memoryContext?: string[]; }
interface ContextFile { id: string; name: string; content: string; summary: string; source: 'upload' | 'filesystem'; size: number; selected?: boolean; }
interface Props { className?: string; }

const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
const formatModelName = (m: string) => m.replace(/[:\-\.]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const SafeContent: React.FC<{ content: string }> = ({ content }) => (
  <div className="text-[#E5E5E5] text-sm whitespace-pre-wrap leading-relaxed">
    {content.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|^#{1,3}\s.*$)/gm).map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
      if (p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>;
      if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="bg-[#404040] px-1 rounded text-xs">{p.slice(1, -1)}</code>;
      if (/^#{1,3}\s/.test(p)) { const l = p.match(/^#{1,3}/)![0].length; const Tag = `h${l}` as keyof JSX.IntrinsicElements; return <Tag key={i} className="font-semibold mt-2 mb-1">{p.replace(/^#{1,3}\s/, '')}</Tag>; }
      return <span key={i}>{p}</span>;
    })}
  </div>
);

const MessageBubble: React.FC<{ m: Message; onRetry?: () => void; onOpenInCanvas?: (content: string, language: string) => void }> = React.memo(({ m, onRetry, onOpenInCanvas }) => {
  const { role, content, timestamp, memoryContext } = m;
  const extractCodeFromMessage = useCallback((text: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const match = codeBlockRegex.exec(text);
    if (match) return { language: match[1] || 'javascript', code: match[2] };
    return null;
  }, []);
  const codeBlock = extractCodeFromMessage(content);

  return (
    <BlurFade delay={0.1} className="mb-8">
      <div className={cn('flex gap-3', role === 'user' ? 'justify-end' : 'items-start')}>
        {role !== 'user' && <div className="w-8 h-8 rounded-full bg-[#93b3f3] flex justify-center items-center mt-1"><Crown size={18} /></div>}
        <div className="flex flex-col max-w-[80%]">
          <div className={cn('rounded-2xl px-4 py-3 stream-in', role === 'user' ? 'bg-[#303030]' : 'bg-[#232c3d]')}>
            {role === 'user' ? <div className="text-white text-sm">{content}</div> : <SafeContent content={content} />}
          </div>
          <div className="text-xs text-white/40 mt-1 flex gap-2 items-center">
            {formatTime(timestamp)} {memoryContext?.length ? <Brain size={10} className="text-[#93b3f3]" /> : null}
            {codeBlock && onOpenInCanvas && (
              <button onClick={() => onOpenInCanvas(codeBlock.code, codeBlock.language)} className="p-1 hover:bg-white/10 rounded text-[#93b3f3] flex items-center gap-1" title="Open in Canvas">
                <Code size={12} />
              </button>
            )}
            {role === 'user' && onRetry && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <button onClick={onRetry} className="p-1 hover:bg-white/10 rounded"><ArrowUp size={12} /></button>
                <button className="p-1 hover:bg-white/10 rounded"><MoreHorizontal size={12} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </BlurFade>
  );
});

// --- FILE LIST + PREVIEW MODAL (unchanged) --- //

const OptimizedChatInterface: React.FC<Props> = ({ className = '' }) => {
  const { activeModel, availableModels, setActiveModel, isOnline } = useModelStore();
  const { messages, sendMessage, isLoading, streamingMessage, clearMessages } = useMessageStore();
  const { memoryHealth, memoryEnabled, setMemoryEnabled } = useMemoryStore();
  const { canvasOpen, setCanvasOpen, currentFile, setCurrentFile, openScratchpad, showDiffOverlay, aiSuggestion, showAISuggestion, hideDiffOverlay, acceptAISuggestion } = useCanvasStore();

  const [input, setInput] = useState('');
  const [files, setFiles] = useState<ContextFile[]>([]);
  const [preview, setPreview] = useState<ContextFile | null>(null);
  const [showModels, setShowModels] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [structureButtonsUsed, setStructureButtonsUsed] = useState(false);
  const [isReady, setIsReady] = useState(false); // ✅ startup guard

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastCanvasTrigger = useRef<string>("");

  // ✅ Startup readiness guard
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!activeModel || !availableModels?.length) {
        console.warn("⚠️ Model store failed to init, using fallback.");
        setIsReady(true);
      }
    }, 5000);
    if (activeModel || availableModels?.length) setIsReady(true);
    return () => clearTimeout(timer);
  }, [activeModel, availableModels]);

  useEffect(() => {
    console.log("🔍 Startup Debug:", { activeModel, availableModels, memoryHealth, isOnline });
  }, [activeModel, availableModels, memoryHealth, isOnline]);

  // ✅ Scroll to bottom on message updates
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingMessage]);
  useEffect(() => { if (textareaRef.current) textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`; }, [input]);

  // ✅ Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); textareaRef.current?.focus(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); clearMessages(); setInput(''); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [clearMessages]);

  // ✅ Canvas Auto-Detection (fixed)
  useEffect(() => {
    const detectCodeInput = (text: string) => {
      const hasCodeBlocks = /```[\w]*\n/.test(text);
      const hasLargeCodePaste = text.length > 200 && /\n.*\n.*\n/.test(text) && /[{}();]/.test(text);
      const hasTripleBackticks = text.includes("```");
      if ((hasCodeBlocks || hasLargeCodePaste || hasTripleBackticks) && !canvasOpen && lastCanvasTrigger.current !== text) {
        lastCanvasTrigger.current = text;
        const match = text.match(/```(\w+)?\n([\s\S]*?)```/);
        if (match) openScratchpad(match[2], match[1] || "javascript");
      }
    };
    if (input.length > 10) detectCodeInput(input);
  }, [input, canvasOpen, openScratchpad]);

  // ✅ Cleanup when canvas closes
  useEffect(() => {
    if (!canvasOpen) {
      setCurrentFile(null);
      lastCanvasTrigger.current = "";
    }
  }, [canvasOpen, setCurrentFile]);

  // ✅ Canvas handlers
  const handleOpenInCanvas = useCallback((code: string, language: string) => {
    if (!canvasOpen) openScratchpad(code || "", language || "plaintext");
  }, [canvasOpen, openScratchpad]);

  const buildContextMessage = useCallback((msg: string) => {
    const selected = files.filter(f => f.selected !== false);
    if (!selected.length) return msg;
    const ctx = selected.map((f, i) => `<source id="${i}"><title>${f.summary}</title><content>${f.content}</content></source>`).join('\n');
    return `Answer with context:\n<context>\n${ctx}</context>\n\nQ:${msg}\nA:`;
  }, [files]);

  const handleSend = useCallback(async () => {
    const msg = input.trim(); if (!msg || isLoading) return;
    let contextualMessage = buildContextMessage(msg);
    if (canvasOpen && currentFile) {
      const fileName = currentFile?.path?.split('/').pop() || "scratchpad";
      const fileContent =
        typeof currentFile?.content === "string"
          ? currentFile.content.slice(0, 5000)
          : "";
      contextualMessage = `[Current Canvas File: ${fileName}]\n${fileContent}\n\n[User Request]: ${contextualMessage}`;
    }
    try {
      await sendMessage({ content: contextualMessage, model: activeModel, files: [], memoryEnabled, options: { temperature: 0.7 } });
    } catch (err) {
      console.error("Send message failed:", err);
    } finally {
      setInput(""); setStructureButtonsUsed(false);
    }
  }, [input, isLoading, sendMessage, activeModel, memoryEnabled, buildContextMessage, canvasOpen, currentFile]);

  // ✅ AI Diff Overlay logic stays same but with safe guards
  const handleAISuggestion = useCallback((originalCode: string, suggestedCode: string) => {
    showAISuggestion(originalCode, suggestedCode);
  }, [showAISuggestion]);

  const processAIResponse = useCallback((content: string) => {
    const improvementPattern = /(?:improve|refactor|optimize|fix).*?```(\w+)?\n([\s\S]*?)```/gi;
    const match = improvementPattern.exec(content);
    if (match && currentFile) handleAISuggestion(currentFile.content, match[2]);
  }, [currentFile, handleAISuggestion]);

  useEffect(() => {
    if (streamingMessage?.role === "assistant") processAIResponse(streamingMessage.content);
  }, [streamingMessage, processAIResponse]);

  // ✅ If not ready → fallback loader
  if (!isReady) {
    return (
      <div className="h-screen flex justify-center items-center bg-[#1A1A1A] text-white">
        <AnimatedCircularProgressBar max={100} min={0} value={50} gaugePrimaryColor="#fff" gaugeSecondaryColor="rgba(255,255,255,0.3)" className="w-10 h-10" />
        <span className="ml-3">Initializing Puffin AI...</span>
      </div>
    );
  }

  // ✅ MAIN RENDER stays unchanged (header, messages, files, input, canvas panel, overlay)
  return (
    <div className={cn('h-screen bg-[#1A1A1A] text-white flex transition-all duration-300', className)}>
      {/* ... ENTIRE REST OF YOUR ORIGINAL JSX (unchanged) ... */}
    </div>
  );
};

export default OptimizedChatInterface;
