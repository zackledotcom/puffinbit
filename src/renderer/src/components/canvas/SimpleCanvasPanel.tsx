import React, { useState, useEffect, useRef } from 'react';
import { X, Code, Save, FileText, Play, Copy } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { cn } from '@/lib/utils';

interface SimpleCanvasProps {
  className?: string;
}

// Sanitize HTML to prevent XSS
const sanitizeHTML = (html: string): string => {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Syntax highlighting utility (with HTML sanitization)
const highlightSyntax = (code: string, language: string): string => {
  // First sanitize the code to prevent XSS
  const sanitizedCode = sanitizeHTML(code);
  
  // Basic syntax highlighting for common languages
  let highlighted = sanitizedCode;
  
  if (language === 'javascript' || language === 'typescript' || language === 'tsx' || language === 'jsx') {
    // Keywords
    highlighted = highlighted.replace(
      /\b(const|let|var|function|return|if|else|for|while|class|extends|import|export|from|default|async|await|try|catch|finally)\b/g,
      '<span style="color: #C586C0;">$1</span>'
    );
    
    // Strings
    highlighted = highlighted.replace(
      /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g,
      '<span style="color: #CE9178;">$1$2$1</span>'
    );
    
    // Comments
    highlighted = highlighted.replace(
      /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
      '<span style="color: #6A9955;">$1</span>'
    );
    
    // Numbers
    highlighted = highlighted.replace(
      /\b(\d+\.?\d*)\b/g,
      '<span style="color: #B5CEA8;">$1</span>'
    );
    
    // React/JSX
    highlighted = highlighted.replace(
      /(<\/?)([A-Z][a-zA-Z0-9]*)/g,
      '$1<span style="color: #4EC9B0;">$2</span>'
    );
  }
  
  if (language === 'css') {
    // CSS properties
    highlighted = highlighted.replace(
      /([a-zA-Z-]+)(\s*:)/g,
      '<span style="color: #9CDCFE;">$1</span>$2'
    );
    
    // CSS values
    highlighted = highlighted.replace(
      /(:\s*)([^;{}\n]+)/g,
      '$1<span style="color: #CE9178;">$2</span>'
    );
  }
  
  return highlighted;
};

const SimpleCanvasPanel: React.FC<SimpleCanvasProps> = ({ className }) => {
  const { currentFile, setCurrentFile, closeCanvas } = useCanvasStore();
  const [content, setContent] = useState(''); // ✅ SECURITY FIX: Never auto-populate content
  const [copied, setCopied] = useState(false);
  const [aiWriting, setAiWriting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ✅ SECURITY FIX: Only load files from REAL tool calls
    if (currentFile && currentFile.content) {
      console.log('Canvas received REAL file from tool call:', currentFile.path);
      setContent(currentFile.content);
    }
    // ✅ SECURITY FIX: Don't auto-populate empty content or log on startup
  }, [currentFile]);

  // ✅ SECURITY FIX: Removed auto-canvas activation listener
  // Canvas updates now ONLY come through the main UI via real tool calls

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (currentFile) {
      setCurrentFile({
        ...currentFile,
        content: newContent
      });
    }
  };

  const handleClose = () => {
    closeCanvas();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const fileName = currentFile?.path?.split('/').pop() || 'scratchpad.tsx';
  const language = currentFile?.language || 'typescript';

  // Sync scroll between textarea and highlight layer
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const highlightedCode = highlightSyntax(content, language);

  return (
    <div className={cn('h-full flex flex-col bg-[#1A1A1A] border-l border-white/10', className)}>
      {/* Canvas Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[#232323]">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">{fileName}</span>
          <span className="text-xs text-white/50">({language})</span>
          {aiWriting && (
            <span className="text-xs text-blue-400 animate-pulse flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
              AI Writing...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleCopy}
            className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-blue-400"
            title="Copy Code"
          >
            <Copy className="w-4 h-4" />
          </button>
          {copied && <span className="text-xs text-blue-400">Copied!</span>}
          <button 
            onClick={handleClose}
            className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white"
            title="Close Canvas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Area with Syntax Highlighting */}
      <div className="flex-1 relative overflow-hidden">
        {/* Syntax highlighting layer */}
        <div 
          ref={highlightRef}
          className="absolute inset-0 p-4 text-sm font-mono leading-6 whitespace-pre pointer-events-none overflow-auto z-0"
          style={{
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            color: 'transparent',
            border: 'none',
            outline: 'none'
          }}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
        
        {/* Textarea overlay */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onScroll={handleScroll}
          className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-white font-mono text-sm resize-none focus:outline-none z-10"
          placeholder="Start coding..."
          style={{
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            lineHeight: '1.5',
            tabSize: 2,
            caretColor: '#3b82f6'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              const start = e.currentTarget.selectionStart;
              const end = e.currentTarget.selectionEnd;
              const newContent = content.substring(0, start) + '  ' + content.substring(end);
              handleContentChange(newContent);
              setTimeout(() => {
                if (textareaRef.current) {
                  textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
                }
              }, 0);
            }
          }}
        />
      </div>

      {/* Canvas Footer */}
      <div className="flex items-center justify-between p-2 border-t border-white/10 bg-[#232323] text-xs text-white/60">
        <div className="flex items-center gap-2">
          <span>Canvas</span>
          <span>•</span>
          <span>{content.split('\n').length} lines</span>
          <span>•</span>
          <span>{content.length} chars</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white"
            title="Run Code"
          >
            <Play className="w-3 h-3" />
          </button>
          <button 
            className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white"
            title="Save File"
          >
            <Save className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleCanvasPanel;
