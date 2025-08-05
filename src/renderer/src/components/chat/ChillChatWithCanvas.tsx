import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Plus, Settings, ChevronDown, Mic, ArrowUp, Volleyball, Crown, Wrench, Brain, Zap,
  MoreHorizontal, Upload, Code, FileText
} from 'lucide-react';
import { BlurFade } from '@/components/ui/blur-fade';
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar';
import { useModelStore } from '@/stores/useModelStore';
import { useMessageStore } from '@/stores/useMessageStore';
import { useMemoryStore } from '@/stores/useMemoryStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { usePredictiveTextStore } from '@/stores/usePredictiveTextStore';
import { cn } from '@/lib/utils';
import PredictiveSuggestionBar from '@/components/chat/PredictiveSuggestionBar';
import AnthropicStructureBar from '@/components/chat/AnthropicStructureBar';
import FileList from './FileList';
import FilePreviewModal from './FilePreviewModal';
import SimpleCanvasPanel from '@/components/canvas/SimpleCanvasPanel';

interface Message { 
  id: string; 
  role: 'user' | 'assistant' | 'system'; 
  content: string; 
  timestamp: Date; 
  memoryContext?: string[]; 
}

interface ContextFile { 
  id: string; 
  name: string; 
  content: string; 
  summary: string; 
  source: 'upload' | 'filesystem'; 
  size: number; 
  selected?: boolean; 
}

interface Props { 
  className?: string; 
}

const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
const formatModelName = (m: string) => m.replace(/[:\-\.]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const SafeContent: React.FC<{ content: string }> = ({ content }) => (
  <div className="text-[#E5E5E5] text-sm whitespace-pre-wrap leading-relaxed">
    {content.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|^#{1,3}\s.*$)/gm).map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
      if (p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>;
      if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="bg-[#404040] px-1 rounded text-xs">{p.slice(1, -1)}</code>;
      if (/^#{1,3}\s/.test(p)) { 
        const l = p.match(/^#{1,3}/)![0].length; 
        const Tag = `h${l}` as keyof JSX.IntrinsicElements; 
        return <Tag key={i} className="font-semibold mt-2 mb-1">{p.replace(/^#{1,3}\s/, '')}</Tag>; 
      }
      return <span key={i}>{p}</span>;
    })}
  </div>
);

const MessageBubble: React.FC<{ 
  m: Message; 
  onRetry?: () => void; 

}> = React.memo(({ m, onRetry }) => {
  const { role, content, timestamp, memoryContext } = m;
  
  // ✅ REMOVED: No more fake canvas activation from text parsing

  return (
    <BlurFade delay={0.1} className="mb-8">
      <div className={cn('flex gap-3', role === 'user' ? 'justify-end' : 'items-start')}>
        {role !== 'user' && (
          <div className="w-8 h-8 rounded-full bg-[#93b3f3] flex justify-center items-center mt-1">
            <Crown size={18} />
          </div>
        )}
        <div className="flex flex-col max-w-[80%]">
          <div className={cn(
            'rounded-2xl px-4 py-3 stream-in', 
            role === 'user' ? 'bg-[#303030]' : 'bg-[#232c3d]'
          )}>
            {role === 'user' ? (
              <div className="text-white text-sm">{content}</div>
            ) : (
              <SafeContent content={content} />
            )}
          </div>
          <div className="text-xs text-white/40 mt-1 flex gap-2 items-center">
            {formatTime(timestamp)}
            {memoryContext?.length ? <Brain size={10} className="text-[#93b3f3]" /> : null}
            
            {/* ✅ SECURITY FIX: Removed fake canvas activation button */}
            
            {role === 'user' && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <button 
                  onClick={onRetry} 
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="Retry"
                >
                  <ArrowUp size={12} />
                </button>
                <button 
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="More options"
                >
                  <MoreHorizontal size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </BlurFade>
  );
});

const readFiles = async (fileList: File[], existing: ContextFile[], setFiles: React.Dispatch<React.SetStateAction<ContextFile[]>>) => {
  for (const file of fileList) {
    if (existing.some(f => f.name === file.name && f.size === file.size)) continue;
    const content = await file.text();
    setFiles(prev => [...prev, { 
      id: `upload-${Date.now()}-${Math.random()}`, 
      name: file.name, 
      content, 
      summary: `${file.name} (${Math.round(file.size / 1024)}KB)`, 
      source: 'upload', 
      size: file.size, 
      selected: true 
    }]);
  }
};

const ChillChatWithCanvas: React.FC<Props> = ({ className = '' }) => {
  const { activeModel, availableModels, setActiveModel, isOnline } = useModelStore();
  const { messages, sendMessage, isLoading, streamingMessage, clearMessages, retryMessage } = useMessageStore();
  const { memoryHealth, memoryEnabled, setMemoryEnabled } = useMemoryStore();
  const { canvasOpen, closeCanvas, currentFile, openScratchpad, setCurrentFile, setCanvasOpen } = useCanvasStore();
  const { fetchSuggestions, clearSuggestions } = usePredictiveTextStore();

  const [input, setInput] = useState('');
  const [files, setFiles] = useState<ContextFile[]>([]);
  const [preview, setPreview] = useState<ContextFile | null>(null);
  const [showModels, setShowModels] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [structureUsed, setStructureUsed] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => { 
    endRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, streamingMessage]);

  // Auto-resize textarea
  useEffect(() => { 
    if (textareaRef.current) {
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { 
        e.preventDefault(); 
        textareaRef.current?.focus(); 
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') { 
        e.preventDefault(); 
        clearMessages(); 
        setInput(''); 
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [clearMessages]);

  // ✅ SECURITY FIX: Real Canvas Event Listener - ONLY responds to actual tool calls
  useEffect(() => {
    const handleCanvasUpdate = (event: any, data: any) => {
      console.log('[Canvas] REAL tool update received:', data);
      
      if (data.success && (data.action === 'create' || data.action === 'update')) {
        // ONLY open canvas when REAL tool call succeeds
        setCurrentFile({
          path: data.filePath,
          content: data.content || '',
          language: data.language || 'plaintext'
        });
        
        if (!canvasOpen) {
          setCanvasOpen(true);
        }
      }
    };

    // Listen for REAL canvas updates from backend
    window.electronAPI?.on?.('canvas:contentUpdated', handleCanvasUpdate);
    
    return () => {
      window.electronAPI?.off?.('canvas:contentUpdated', handleCanvasUpdate);
    };
  }, [canvasOpen, setCanvasOpen, setCurrentFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setInput(v);
    v.trim() ? fetchSuggestions(v) : (clearSuggestions(), setStructureUsed(false));
  }, [fetchSuggestions, clearSuggestions]);

  const buildContextMessage = useCallback((msg: string) => {
    const selected = files.filter(f => f.selected !== false);
    let contextualMessage = msg;
    
    // Add file context if any
    if (selected.length > 0) {
      const ctx = selected.map((f, i) => 
        `<source id="${i}"><title>${f.summary}</title><content>${f.content}</content></source>`
      ).join('\n');
      contextualMessage = `Answer with context:\n<context>\n${ctx}</context>\n\nQ:${msg}\nA:`;
    }
    
    // Add canvas context if canvas is open
    if (canvasOpen && currentFile) {
      const fileName = currentFile.path.split('/').pop() || 'scratchpad';
      const fileContent = currentFile.content.slice(0, 5000); // Limit content size
      contextualMessage = `[Current Canvas File: ${fileName}]
\`\`\`${currentFile.language}
${fileContent}
\`\`\`

[Canvas Tool Available]: You can use the canvas_update tool to write code directly to the canvas. Use actions: "create", "update", "append", or "replace".

[User Request]: ${contextualMessage}`;
    }
    
    return contextualMessage;
  }, [files, canvasOpen, currentFile]);

  const handleSend = useCallback(async () => {
    const msg = input.trim(); 
    if (!msg || isLoading) return;
    
    const contextualMessage = buildContextMessage(msg);
    
    try {
      await sendMessage({ 
        content: contextualMessage, 
        model: activeModel, 
        files: [], 
        memoryEnabled, 
        options: { temperature: 0.7 } 
      });
    } catch (err) {
      console.error('Send message failed:', err);
    } finally {
      setInput(''); 
      setStructureUsed(false); 
      clearSuggestions();
    }
  }, [input, isLoading, sendMessage, activeModel, memoryEnabled, buildContextMessage, clearSuggestions]);

  const handleStructureApply = useCallback((enhanced: string) => {
    setInput(enhanced); 
    setStructureUsed(true); 
    if (enhanced.trim()) fetchSuggestions(enhanced);
  }, [fetchSuggestions]);

  const handleDrop = (e: React.DragEvent) => { 
    e.preventDefault(); 
    readFiles(Array.from(e.dataTransfer.files), files, setFiles); 
  };

  // ✅ SECURITY FIX: Removed handleOpenInCanvas - no more fake canvas activation

  const memoryColor = { good: '#22c55e', warning: '#f59e0b', full: '#ef4444' }[memoryHealth] || '#6b7280';

  return (
    <div className={cn('h-screen bg-[#1A1A1A] text-white flex', className)}>
      {/* Main Chat Area */}
      <div className={cn('flex flex-col transition-all duration-300', canvasOpen ? 'w-1/2' : 'w-full max-w-[830px] mx-auto')}>
        {/* Header */}
        <header className="flex justify-between p-3 border-b border-white/10">
          <div className="flex gap-3 items-center">
            <button 
              onClick={() => { clearMessages(); setInput(''); }} 
              className="w-7 h-7 border border-white/20 rounded-full hover:bg-[#303030] flex justify-center items-center transition-colors"
              title="New chat"
            >
              <Plus size={14} />
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowModels(!showModels)} 
                className="px-2 py-1 rounded-full hover:bg-[#303030] flex items-center gap-2 transition-colors"
              >
                {formatModelName(activeModel)} 
                <ChevronDown size={14} /> 
                {!isOnline && <div className="w-2 h-2 bg-red-500 rounded-full" />}
              </button>
              
              {showModels && (
                <div className="absolute top-full mt-1 bg-[#303030] border border-white/10 rounded-lg min-w-[200px] z-50">
                  {availableModels.map(m => (
                    <button 
                      key={m} 
                      onClick={() => { setActiveModel(m); setShowModels(false); }} 
                      className="block w-full px-3 py-2 text-left hover:bg-white/10 transition-colors first:rounded-t-lg last:rounded-b-lg"
                    >
                      {formatModelName(m)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setMemoryEnabled(!memoryEnabled)} 
              className={cn(
                'p-2 rounded-full hover:bg-[#303030] flex items-center gap-1 transition-colors', 
                memoryEnabled ? 'text-[#93b3f3]' : 'text-white/50'
              )}
              title="Memory"
            >
              <Brain size={16} />
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: memoryColor }} />
            </button>
            
            <button 
              className="p-2 rounded-full hover:bg-[#303030] transition-colors"
              title="Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4">
          {!messages.length ? (
            <div className="h-full flex flex-col justify-center items-center">
              <Volleyball size={72} className="text-[#93b3f3]" />
              <h1 className="text-4xl font-bold mt-4">Welcome to Puffin AI</h1>
              <p className="text-white/60 mt-2 text-center max-w-md">
                Start a conversation or open code in Canvas for AI-powered development.
              </p>
              {!canvasOpen && (
                <button
                  onClick={() => openScratchpad()}
                  className="mt-6 px-4 py-2 bg-[#93b3f3] hover:bg-[#7da3f3] text-black rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Code size={16} />
                  Open Canvas
                </button>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto p-4">
              {messages.map(m => (
                <MessageBubble 
                  key={m.id} 
                  m={m} 
                  onRetry={() => retryMessage(m.id)} 

                />
              ))}
              {streamingMessage && (
                <MessageBubble m={streamingMessage} />
              )}
              {isLoading && (
                <div className="flex items-center gap-3 mb-4 text-white/40">
                  {memoryEnabled && <Brain size={14} className="text-[#93b3f3]" />}
                  <AnimatedCircularProgressBar 
                    max={100} 
                    min={0} 
                    value={40} 
                    gaugePrimaryColor="#fff" 
                    gaugeSecondaryColor="rgba(255,255,255,0.3)" 
                    className="w-6 h-6" 
                  />
                  <span>Thinking...</span>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Files */}
        {files.length > 0 && (
          <div className="px-4" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
            <FileList files={files} setFiles={setFiles} setPreview={setPreview} />
          </div>
        )}
        {preview && <FilePreviewModal file={preview} onClose={() => setPreview(null)} />}

        {/* Input */}
        <div className="px-4 pb-4">
          <div 
            className="bg-[#303030] rounded-2xl border border-white/10 flex flex-col max-w-3xl mx-auto" 
            onDrop={handleDrop} 
            onDragOver={e => e.preventDefault()}
          >
            {!structureUsed && (
              <div className="px-4 pt-3">
                <AnthropicStructureBar 
                  setInput={setInput} 
                  currentInput={input} 
                  onStructureApplied={handleStructureApply} 
                />
              </div>
            )}
            
            <div className="px-4">
              <PredictiveSuggestionBar setInput={setInput} currentInput={input} />
            </div>
            
            <textarea 
              ref={textareaRef} 
              value={input} 
              onChange={handleInputChange} 
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
              placeholder="Message Puffin AI" 
              className="w-full bg-transparent p-4 resize-none min-h-[50px] text-white border-b border-white/10 focus:outline-none" 
              disabled={isLoading} 
            />
            
            <div className="flex justify-between items-center px-3 py-2">
              <div className="flex gap-2 items-center">
                <input 
                  type="file" 
                  id="context-file-input" 
                  multiple 
                  className="hidden" 
                  onChange={e => readFiles(Array.from(e.target.files || []), files, setFiles)} 
                />
                <button 
                  onClick={() => document.getElementById('context-file-input')?.click()} 
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                  title="Upload files"
                >
                  <Upload size={18} />
                </button>
                
                <div className="relative">
                  <button 
                    onClick={() => setShowTools(!showTools)} 
                    className="px-3 py-2 hover:bg-white/10 rounded flex items-center gap-2 transition-colors"
                  >
                    <Wrench size={16} />
                    Tools
                  </button>
                  {showTools && (
                    <BlurFade className="absolute bottom-full mb-2 bg-[#303030] border border-white/10 rounded-lg">
                      <button 
                        onClick={() => openScratchpad()}
                        className="block px-3 py-2 text-sm hover:bg-white/10 flex items-center gap-2 transition-colors"
                      >
                        <Code size={14} />
                        Open Canvas
                      </button>
                      <button className="block px-3 py-2 text-sm hover:bg-white/10 flex items-center gap-2 transition-colors">
                        <Zap size={14} />
                        Code Generator
                      </button>
                      <button className="block px-3 py-2 text-sm hover:bg-white/10 flex items-center gap-2 transition-colors">
                        <Brain size={14} />
                        Memory Search
                      </button>
                    </BlurFade>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 items-center">
                <button 
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                  title="Voice input"
                >
                  <Mic size={18} />
                </button>
                <button 
                  onClick={handleSend} 
                  disabled={!input.trim() || isLoading} 
                  className="w-8 h-8 rounded-full bg-[#93b3f3] hover:bg-[#7da3f3] flex items-center justify-center disabled:opacity-50 transition-colors"
                  title="Send message"
                >
                  <ArrowUp size={16} className="text-black" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Panel */}
      {canvasOpen && (
        <div className="relative w-1/2 border-l border-white/10">
          <button
            onClick={closeCanvas}
            className="absolute top-3 right-3 z-50 bg-[#303030] hover:bg-[#404040] text-white px-2 py-1 rounded transition-colors"
            title="Close Canvas"
          >
            ✕
          </button>
          <SimpleCanvasPanel />
        </div>
      )}
    </div>
  );
};

export default ChillChatWithCanvas;