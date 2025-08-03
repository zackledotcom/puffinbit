/**
 * Advanced code detection and extraction utilities for Puffer Canvas
 * Handles multiple code block formats, languages, and auto-improvement suggestions
 */

export interface DetectedCode {
  code: string
  language: string
  title: string
  fileName: string
  confidence: number
  isExecutable: boolean
  suggestions?: string[]
}

/**
 * Enhanced code block detection with support for multiple formats
 */
export function detectCodeInMessage(content: string): DetectedCode[] {
  const detected: DetectedCode[] = []

  // Pattern 1: Standard markdown code blocks (```language)
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1] || 'text'
    const code = match[2].trim()

    if (code.length > 0) {
      detected.push({
        code,
        language: normalizeLanguage(language),
        title: `${language.toUpperCase()} Code`,
        fileName: `code.${getFileExtension(language)}`,
        confidence: 0.9,
        isExecutable: isExecutableLanguage(language),
        suggestions: analyzeCode(code, language)
      })
    }
  }

  // Pattern 2: Inline code with language hints
  const inlineCodeRegex = /`([^`]+)`(?:\s*\((\w+)\))?/g
  while ((match = inlineCodeRegex.exec(content)) !== null) {
    const code = match[1].trim()
    const hintedLanguage = match[2]

    // Only consider if it looks like code (has certain characteristics)
    if (looksLikeCode(code)) {
      const detectedLang = hintedLanguage || guessLanguage(code)
      detected.push({
        code,
        language: normalizeLanguage(detectedLang),
        title: `Inline ${detectedLang.toUpperCase()}`,
        fileName: `snippet.${getFileExtension(detectedLang)}`,
        confidence: hintedLanguage ? 0.8 : 0.6,
        isExecutable: isExecutableLanguage(detectedLang),
        suggestions: analyzeCode(code, detectedLang)
      })
    }
  }

  // Pattern 3: Detect code-like content without explicit markers
  const lines = content.split('\n')
  let codeCandidate = ''
  let inCodeSection = false

  for (const line of lines) {
    if (looksLikeCodeLine(line)) {
      inCodeSection = true
      codeCandidate += line + '\n'
    } else if (inCodeSection && line.trim() === '') {
      codeCandidate += line + '\n'
    } else if (inCodeSection) {
      // End of code section
      if (codeCandidate.trim().length > 20) {
        const detectedLang = guessLanguage(codeCandidate)
        detected.push({
          code: codeCandidate.trim(),
          language: normalizeLanguage(detectedLang),
          title: `Auto-detected ${detectedLang.toUpperCase()}`,
          fileName: `detected.${getFileExtension(detectedLang)}`,
          confidence: 0.7,
          isExecutable: isExecutableLanguage(detectedLang),
          suggestions: analyzeCode(codeCandidate, detectedLang)
        })
      }
      codeCandidate = ''
      inCodeSection = false
    }
  }

  // Remove duplicates and sort by confidence
  return deduplicateCode(detected).sort((a, b) => b.confidence - a.confidence)
}

/**
 * Normalize language names to standard identifiers
 */
function normalizeLanguage(language: string): string {
  const normalized = language.toLowerCase().trim()

  const aliases: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    jsx: 'react',
    tsx: 'react',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    cmd: 'batch',
    ps1: 'powershell',
    rb: 'ruby',
    cpp: 'c++',
    cxx: 'c++',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    java: 'java',
    kt: 'kotlin',
    go: 'go',
    rs: 'rust',
    swift: 'swift',
    sql: 'sql',
    json: 'json',
    xml: 'xml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    markdown: 'markdown'
  }

  return aliases[normalized] || normalized
}

/**
 * Get appropriate file extension for language
 */
function getFileExtension(language: string): string {
  const extensions: Record<string, string> = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    react: 'jsx',
    html: 'html',
    css: 'css',
    scss: 'scss',
    bash: 'sh',
    json: 'json',
    yaml: 'yaml',
    markdown: 'md',
    java: 'java',
    'c++': 'cpp',
    c: 'c',
    csharp: 'cs',
    go: 'go',
    rust: 'rs',
    php: 'php',
    ruby: 'rb',
    swift: 'swift',
    kotlin: 'kt',
    sql: 'sql',
    xml: 'xml'
  }

  return extensions[language] || 'txt'
}

/**
 * Check if a language can be executed safely
 */
function isExecutableLanguage(language: string): boolean {
  const executableLanguages = [
    'javascript',
    'typescript',
    'json',
    'html',
    'css',
    'markdown',
    'yaml',
    'xml'
  ]

  return executableLanguages.includes(language.toLowerCase())
}

/**
 * Check if text looks like code
 */
function looksLikeCode(text: string): boolean {
  // Check for code-like patterns
  const codePatterns = [
    /function\s+\w+\s*\(/,
    /const\s+\w+\s*=/,
    /let\s+\w+\s*=/,
    /var\s+\w+\s*=/,
    /class\s+\w+/,
    /import\s+.*from/,
    /export\s+(default\s+)?/,
    /if\s*\(/,
    /for\s*\(/,
    /while\s*\(/,
    /<\w+[^>]*>/,
    /\w+\s*\([^)]*\)\s*{/,
    /\w+\.\w+\(/,
    /\/\*.*\*\//,
    /\/\/.*$/m,
    /#.*$/m,
    /\${.*}/,
    /\w+:\s*\w+/,
    /return\s+/
  ]

  return codePatterns.some((pattern) => pattern.test(text))
}

/**
 * Check if a line looks like code
 */
function looksLikeCodeLine(line: string): boolean {
  const trimmed = line.trim()

  // Skip empty lines and common text patterns
  if (!trimmed || /^[A-Z][a-z\s]+[.!?]$/.test(trimmed)) {
    return false
  }

  // Check for code indicators
  return (
    /^(function|const|let|var|class|import|export|if|for|while|return)[\s(]/.test(trimmed) ||
    /[{}();]/.test(trimmed) ||
    /^\s*(\/\/|\/\*|#)/.test(trimmed) ||
    /\w+\.\w+/.test(trimmed) ||
    /\w+\s*=\s*/.test(trimmed) ||
    /<\w+/.test(trimmed) ||
    /^\s*\w+:\s*/.test(trimmed)
  )
}

/**
 * Guess programming language from code content
 */
function guessLanguage(code: string): string {
  // JavaScript/TypeScript patterns
  if (/\b(function|const|let|var|=>\s*{|\bimport\b|\bexport\b)\b/.test(code)) {
    if (/:\s*(string|number|boolean|any)\b/.test(code)) {
      return 'typescript'
    }
    return 'javascript'
  }

  // React/JSX patterns
  if (/<[A-Z]\w*/.test(code) || /jsx?/.test(code)) {
    return 'react'
  }

  // HTML patterns
  if (/<(!DOCTYPE|html|head|body|div|span|p)\b/.test(code)) {
    return 'html'
  }

  // CSS patterns
  if (/\w+\s*{\s*[\w-]+:\s*[^}]+}/.test(code)) {
    return 'css'
  }

  // Python patterns
  if (/\b(def|import|from|class|if __name__)\b/.test(code)) {
    return 'python'
  }

  // JSON patterns
  if (/^\s*[{\[]/.test(code.trim()) && /[}\]]\s*$/.test(code.trim())) {
    try {
      JSON.parse(code)
      return 'json'
    } catch {
      // Fall through
    }
  }

  // Bash/Shell patterns
  if (/^#!/.test(code) || /\b(echo|cd|ls|grep|awk)\b/.test(code)) {
    return 'bash'
  }

  // Default to text
  return 'text'
}

/**
 * Analyze code and provide improvement suggestions
 */
function analyzeCode(code: string, language: string): string[] {
  const suggestions: string[] = []

  switch (language.toLowerCase()) {
    case 'javascript':
    case 'typescript':
      if (!/\bconst\b|\blet\b/.test(code) && /\bvar\b/.test(code)) {
        suggestions.push('Consider using const/let instead of var')
      }
      if (!/\bawait\b/.test(code) && /\.then\(/.test(code)) {
        suggestions.push('Consider using async/await instead of .then()')
      }
      if (!/\btry\b/.test(code) && /\bawait\b/.test(code)) {
        suggestions.push('Add error handling with try/catch for async operations')
      }
      break

    case 'python':
      if (!/^def\s+\w+/.test(code) && code.length > 50) {
        suggestions.push('Consider breaking long code into functions')
      }
      if (!/\btry\b/.test(code) && /\bopen\(|\brequests\./.test(code)) {
        suggestions.push('Add error handling for file/network operations')
      }
      break

    case 'react':
      if (!/\buseState\b|\buseEffect\b/.test(code)) {
        suggestions.push('Consider using React hooks for state management')
      }
      if (!/\bkey=/.test(code) && /\.map\(/.test(code)) {
        suggestions.push('Add key prop when rendering lists')
      }
      break

    case 'css':
      if (!/rem|em/.test(code) && /px/.test(code)) {
        suggestions.push('Consider using rem/em for better accessibility')
      }
      break
  }

  return suggestions
}

/**
 * Remove duplicate code blocks
 */
function deduplicateCode(detected: DetectedCode[]): DetectedCode[] {
  const seen = new Set<string>()
  return detected.filter((item) => {
    const key = `${item.language}:${item.code.slice(0, 100)}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

/**
 * Auto-detect and suggest canvas opening for messages
 */
export function shouldSuggestCanvas(content: string): boolean {
  const detected = detectCodeInMessage(content)
  console.log('🔍 Code detection analysis:', {
    content: content.substring(0, 100) + '...',
    detectedBlocks: detected.length,
    confidences: detected.map(d => ({ lang: d.language, conf: d.confidence })),
    shouldSuggest: detected.length > 0 && detected.some((d) => d.confidence > 0.5)
  })
  return detected.length > 0 && detected.some((d) => d.confidence > 0.5)
}

/**
 * Get the best code block from detected options
 */
export function getBestCodeSuggestion(content: string): DetectedCode | null {
  const detected = detectCodeInMessage(content)
  return detected.length > 0 ? detected[0] : null
}
