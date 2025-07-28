import React, { useRef, useEffect, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { detectLanguageFromExtension, getMonacoTheme, getLanguageIcon } from '../../utils/languageDetection';
import '../../config/monaco-config';

interface MonacoCanvasEditorProps {
  filename: string;
  content: string;
  onContentChange: (content: string) => void;
  height?: string;
  width?: string;
  theme?: 'vs-dark' | 'light' | 'auto';
  readOnly?: boolean;
  minimap?: boolean;
  className?: string;
}

export const MonacoCanvasEditor: React.FC<MonacoCanvasEditorProps> = ({
  filename,
  content,
  onContentChange,
  height = '400px',
  width = '100%',
  theme = 'auto',
  readOnly = false,
  minimap = true,
  className = ''
}) => {
  const editorRef = useRef(null);
  const [language, setLanguage] = useState('plaintext');
  const [editorTheme, setEditorTheme] = useState('vs-dark');

  // Detect language from filename
  useEffect(() => {
    const detectedLang = detectLanguageFromExtension(filename);
    setLanguage(detectedLang);
  }, [filename]);

  // Set theme based on system preference or manual setting
  useEffect(() => {
    if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setEditorTheme(getMonacoTheme(isDark));
    } else {
      setEditorTheme(theme);
    }
  }, [theme]);

  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    
    // Configure editor options for Canvas mode
    editor.updateOptions({
      minimap: { enabled: minimap },
      wordWrap: 'on',
      automaticLayout: true,
      scrollBeyondLastLine: false,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Monaco, Menlo, "Ubuntu Mono", monospace',
      lineHeight: 1.6,
      tabSize: 2,
      insertSpaces: true,
      bracketPairColorization: { enabled: true },
      suggest: {
        showInlineDetails: true
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false
      },
      readOnly
    });

    // Add custom keybindings for Canvas mode
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Trigger save - could emit an event or call a callback
      console.log('Save triggered in Canvas Editor');
    });

    // Add context menu items
    editor.addAction({
      id: 'canvas-format-document',
      label: 'Format Document',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF
      ],
      run: () => {
        editor.getAction('editor.action.formatDocument').run();
      }
    });

  }, [minimap, readOnly]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      onContentChange(value);
    }
  }, [onContentChange]);

  const getEditorValue = useCallback(() => {
    return editorRef.current?.getValue() || '';
  }, []);

  // Focus editor method (useful for Canvas integration)
  const focusEditor = useCallback(() => {
    editorRef.current?.focus();
  }, []);

  return (
    <div className={`monaco-canvas-editor ${className}`} style={{ width, height }}>
      {/* File info header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700 text-sm">
        <span className="text-lg">{getLanguageIcon(language)}</span>
        <span className="text-gray-300">{filename}</span>
        <span className="text-gray-500">•</span>
        <span className="text-gray-400 capitalize">{language}</span>
        {readOnly && (
          <>
            <span className="text-gray-500">•</span>
            <span className="text-orange-400 text-xs">READ ONLY</span>
          </>
        )}
      </div>

      {/* Monaco Editor */}
      <div style={{ height: `calc(${height} - 40px)` }}>
        <Editor
          height="100%"
          language={language}
          value={content}
          theme={editorTheme}
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
          options={{
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            renderLineHighlight: 'all',
            renderWhitespace: 'selection',
            contextmenu: true,
            mouseWheelZoom: true,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: true
          }}
          loading={
            <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
              <div className="text-center">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p>Loading Monaco Editor...</p>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
};

// Export utilities for external use
export { getEditorValue, focusEditor } from './MonacoCanvasEditor';

export default MonacoCanvasEditor;