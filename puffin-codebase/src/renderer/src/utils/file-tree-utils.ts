import { TreeViewElement } from '@/components/ui/file-tree'

export interface FileSystemItem {
  name: string
  path: string
  isDirectory: boolean
  size?: number
  lastModified?: Date
}

export function convertFileSystemToTree(
  items: FileSystemItem[],
  basePath: string = '',
  maxDepth: number = 3,
  currentDepth: number = 0
): TreeViewElement[] {
  if (currentDepth >= maxDepth) {
    return []
  }

  // Group items by type (directories first, then files)
  const sortedItems = [...items].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })

  return sortedItems.map((item) => {
    const element: TreeViewElement = {
      id: item.path,
      name: item.name,
      isSelectable: true
    }

    // For directories, we'll add children if needed
    if (item.isDirectory) {
      element.children = [] // Will be populated when expanded
    }

    return element
  })
}

export function getFileIcon(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase()
  
  const iconMap: Record<string, string> = {
    // Programming languages
    'js': '📄',
    'jsx': '⚛️',
    'ts': '🔷',
    'tsx': '🔷',
    'py': '🐍',
    'java': '☕',
    'cpp': '⚙️',
    'c': '⚙️',
    'go': '🐹',
    'rs': '🦀',
    'php': '🐘',
    'rb': '💎',
    'swift': '🐦',
    'kt': '🟪',
    
    // Web technologies
    'html': '🌐',
    'css': '🎨',
    'scss': '🎨',
    'sass': '🎨',
    'less': '🎨',
    'vue': '💚',
    
    // Config files
    'json': '📋',
    'yaml': '📋',
    'yml': '📋',
    'xml': '📋',
    'toml': '📋',
    'ini': '⚙️',
    'conf': '⚙️',
    'config': '⚙️',
    
    // Documentation
    'md': '📝',
    'mdx': '📝',
    'txt': '📄',
    'pdf': '📕',
    'doc': '📘',
    'docx': '📘',
    
    // Images
    'png': '🖼️',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'gif': '🖼️',
    'svg': '🖼️',
    'webp': '🖼️',
    'ico': '🖼️',
    
    // Media
    'mp4': '🎬',
    'avi': '🎬',
    'mov': '🎬',
    'mp3': '🎵',
    'wav': '🎵',
    'flac': '🎵',
    
    // Archives
    'zip': '📦',
    'tar': '📦',
    'gz': '📦',
    'rar': '📦',
    '7z': '📦',
    
    // Scripts
    'sh': '📜',
    'bash': '📜',
    'zsh': '📜',
    'fish': '📜',
    'ps1': '📜',
    'bat': '📜',
    'cmd': '📜',
    
    // Database
    'sql': '🗃️',
    'db': '🗃️',
    'sqlite': '🗃️',
    
    // Lock and dependency files
    'lock': '🔒',
    'lockfile': '🔒',
    
    // Git
    'gitignore': '🚫',
    'gitattributes': '🔧',
    
    // Package managers
    'package.json': '📦',
    'yarn.lock': '🧶',
    'pnpm-lock.yaml': '📦',
    'Cargo.toml': '📦',
    'requirements.txt': '📦',
    'Gemfile': '💎',
    'Pipfile': '📦'
  }

  // Special file name handling
  if (fileName === 'package.json') return '📦'
  if (fileName === 'README.md') return '📖'
  if (fileName === 'LICENSE') return '📄'
  if (fileName === 'Dockerfile') return '🐳'
  if (fileName === '.env') return '🔐'
  if (fileName.startsWith('.env.')) return '🔐'
  if (fileName === 'yarn.lock') return '🧶'
  if (fileName === 'pnpm-lock.yaml') return '📦'
  if (fileName === '.gitignore') return '🚫'

  return iconMap[extension || ''] || '📄'
}

export function getLanguageFromExtension(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase()
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'vue': 'vue',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'toml': 'toml',
    'md': 'markdown',
    'mdx': 'markdown',
    'txt': 'text',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'zsh',
    'fish': 'fish',
    'ps1': 'powershell',
    'bat': 'batch',
    'cmd': 'batch',
    'sql': 'sql'
  }

  return languageMap[extension || ''] || 'text'
}
