/**
 * Language Detection Utility for Monaco Editor
 * Detects programming language based on file extensions
 */

export const detectLanguageFromExtension = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop();
  
  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    'js': 'javascript',
    'jsx': 'javascript', 
    'ts': 'typescript',
    'tsx': 'typescript',
    'mjs': 'javascript',
    'cjs': 'javascript',
    
    // Web Technologies
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'scss',
    'less': 'less',
    
    // Data formats
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'ini',
    'ini': 'ini',
    'csv': 'csv',
    
    // Documentation
    'md': 'markdown',
    'markdown': 'markdown',
    'txt': 'plaintext',
    'readme': 'markdown',
    
    // Programming Languages
    'py': 'python',
    'pyw': 'python',
    'go': 'go',
    'rs': 'rust',
    'cpp': 'cpp',
    'cxx': 'cpp',
    'cc': 'cpp',
    'c': 'c',
    'h': 'c',
    'hpp': 'cpp',
    'java': 'java',
    'kt': 'kotlin',
    'kts': 'kotlin',
    'scala': 'scala',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'dart': 'dart',
    'lua': 'lua',
    'r': 'r',
    'R': 'r',
    'pl': 'perl',
    'pm': 'perl',
    
    // Shell scripts
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    'ps1': 'powershell',
    'psm1': 'powershell',
    'bat': 'bat',
    'cmd': 'bat',
    
    // Database
    'sql': 'sql',
    'mysql': 'sql',
    'pgsql': 'sql',
    'sqlite': 'sql',
    
    // Configuration
    'dockerfile': 'dockerfile',
    'docker': 'dockerfile',
    'env': 'shell',
    'gitignore': 'ignore',
    'gitattributes': 'ignore',
    
    // Logs
    'log': 'log',
    'logs': 'log',
    
    // Other formats
    'graphql': 'graphql',
    'gql': 'graphql',
    'proto': 'protobuf'
  };
  
  return languageMap[ext] || 'plaintext';
};

/**
 * Get Monaco theme based on current theme preference
 */
export const getMonacoTheme = (isDark: boolean): string => {
  return isDark ? 'vs-dark' : 'light';
};

/**
 * Get file icon based on language (for UI display)
 */
export const getLanguageIcon = (language: string): string => {
  const iconMap: Record<string, string> = {
    'javascript': '🟨',
    'typescript': '🔷',
    'python': '🐍',
    'html': '🌐',
    'css': '🎨',
    'json': '📋',
    'markdown': '📝',
    'shell': '⚡',
    'sql': '🗃️',
    'go': '🐹',
    'rust': '🦀',
    'java': '☕',
    'cpp': '⚙️',
    'c': '🔧',
    'php': '🐘',
    'ruby': '💎',
    'swift': '🍎',
    'dart': '🎯',
    'dockerfile': '🐳',
    'yaml': '📄',
    'xml': '📊',
    'log': '📜'
  };
  
  return iconMap[language] || '📄';
};