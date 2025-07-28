import React, { useState, useRef } from 'react'
import {
  PaperPlaneTilt,
  Plus,
  X,
  CheckCircle,
  Warning,
  Activity,
  Info,
  Lightning,
  Sparkle,
  Gear,
  Code,
  Database,
  HardDrive,
  Cpu,
  Thermometer,
  Star,
  Circle,
  User,
  ChatCircle
} from 'phosphor-react'

// Magic UI components matching the existing Puffer style
const DotPattern = ({ className, ...props }) => (
  <div className={`absolute inset-0 ${className}`} {...props}>
    <svg className="w-full h-full opacity-30" viewBox="0 0 400 400">
      <defs>
        <pattern id="dot-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="rgb(125, 235, 255)" opacity="0.3" />
        </pattern>
        <radialGradient id="dot-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgb(125, 235, 255)" stopOpacity="0.4" />
          <stop offset="50%" stopColor="rgb(125, 235, 255)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#dot-pattern)" />
      <rect width="100%" height="100%" fill="url(#dot-glow)" />
    </svg>
  </div>
)

// FloatingCard component matching Puffer's design
const FloatingCard = ({ children, className = "", delay = 0, ...props }) => (
  <div
    className={`relative bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl ${className}`}
    style={{ animationDelay: `${delay}ms` }}
    {...props}
  >
    {children}
  </div>
)

export default function EnhancedFileDemo() {
  const [inputValue, setInputValue] = useState('')
  const [attachedFiles, setAttachedFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showBatchProcessor, setShowBatchProcessor] = useState(false)
  const fileInputRef = useRef(null)

  // Mock enhanced files with processing states
  const mockFiles = [
    {
      id: '1',
      name: 'project-analysis.pdf',
      type: 'pdf',
      size: 2547891,
      status: 'processed',
      progress: 100,
      metadata: { pages: 15, hasText: true },
      processingResult: { pageCount: 15, textLength: 45231, wordCount: 7842 },
      securityInfo: { riskLevel: 'low', warnings: [] }
    },
    {
      id: '2', 
      name: 'source-code.zip',
      type: 'zip',
      size: 15678934,
      status: 'processing',
      progress: 67,
      securityInfo: { 
        riskLevel: 'medium', 
        warnings: ['Large archive file'],
        requiresConfirmation: true
      }
    },
    {
      id: '3',
      name: 'app.tsx',
      type: 'code',
      size: 8547,
      status: 'processed',
      progress: 100,
      processingResult: { lineCount: 234, language: 'typescript', functions: 12, imports: 8 }
    }
  ]

  const [displayFiles, setDisplayFiles] = useState(mockFiles)

  const handleFileSelect = (files) => {
    console.log('Processing files:', files)
    // Mock file addition
    const newFiles = Array.from(files).map((file, index) => ({
      id: `file_${Date.now()}_${index}`,
      name: file.name,
      type: getFileType(file),
      size: file.size,
      status: 'pending',
      progress: 0,
      securityInfo: { riskLevel: 'low', warnings: [] }
    }))
    setDisplayFiles(prev => [...prev, ...newFiles])
  }

  const handleSend = () => {
    if (inputValue.trim() || displayFiles.length > 0) {
      setIsLoading(true)
      setTimeout(() => {
        setIsLoading(false)
        setInputValue('')
        setDisplayFiles([])
      }, 2000)
    }
  }

  const getFileType = (file) => {
    if (file.type === 'application/pdf') return 'pdf'
    if (file.type === 'application/zip') return 'zip'
    if (file.type.startsWith('image/')) return 'image'
    if (file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.py')) return 'code'
    return 'other'
  }

  const getFileIcon = (type, status) => {
    const iconProps = { size: 18 }
    const getColor = () => {
      if (status === 'error') return 'text-red-500'
      if (status === 'processing') return 'text-blue-500'
      if (status === 'processed') return 'text-green-500'
      return 'text-gray-500'
    }

    const iconClass = getColor()
    
    // Using only verified phosphor icons
    switch (type) {
      case 'pdf': return <Code {...iconProps} className={iconClass} />  // Using Code as PDF substitute
      case 'zip': return <Database {...iconProps} className={iconClass} />  // Using Database as Archive substitute
      case 'code': return <Code {...iconProps} className={iconClass} />
      case 'image': return <Star {...iconProps} className={iconClass} />  // Using Star as Image substitute
      default: return <Circle {...iconProps} className={iconClass} />  // Using Circle as generic File
    }
  }

  const formatFileSize = (bytes) => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const getStatusBadge = (file) => {
    const badgeClasses = {
      pending: 'bg-gray-100 text-gray-600 border-gray-200',
      processing: 'bg-blue-100 text-blue-700 border-blue-200',
      processed: 'bg-green-100 text-green-700 border-green-200',
      error: 'bg-red-100 text-red-700 border-red-200'
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${badgeClasses[file.status]}`}>
        {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
      </span>
    )
  }

  const removeFile = (id) => {
    setDisplayFiles(prev => prev.filter(f => f.id !== id))
  }

  const processBatch = () => {
    setShowBatchProcessor(true)
    // Mock batch processing
    setTimeout(() => {
      setDisplayFiles(prev => prev.map(f => ({ ...f, status: 'processed', progress: 100 })))
      setShowBatchProcessor(false)
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 relative overflow-hidden">
      {/* Background Dot Pattern - ChatGPT Style */}
      <DotPattern className="fixed inset-0 -z-10" />
      
      <div className="max-w-4xl mx-auto p-6 space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4 pt-12">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7DEBFF]/20 to-[#FF3B47]/20 border border-gray-200 flex items-center justify-center mx-auto">
            <User size={32} className="text-[#1A1A1A]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Enhanced File Processing</h1>
            <p className="text-[#63666A] max-w-lg mx-auto">
              Upload and process PDFs, ZIP archives, code files, and more with AI-powered analysis
            </p>
          </div>
        </div>

        {/* Enhanced File Attachments */}
        {displayFiles.length > 0 && (
          <FloatingCard className="overflow-hidden" delay={100}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#7DEBFF]/5 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database size={20} className="text-[#7DEBFF]" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#1A1A1A]">
                      Enhanced Files ({displayFiles.length})
                    </h3>
                    <p className="text-xs text-[#63666A]">
                      {displayFiles.filter(f => f.status === 'processed').length} processed, 
                      {displayFiles.filter(f => f.status === 'processing').length} processing
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {displayFiles.length > 1 && (
                    <button 
                      onClick={processBatch}
                      className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-[#7DEBFF]/10 to-[#7DEBFF]/5 text-[#7DEBFF] border border-[#7DEBFF]/20 rounded-lg hover:bg-[#7DEBFF]/20 transition-all duration-200 flex items-center gap-1"
                    >
                      <Lightning size={12} />
                      Batch Process
                    </button>
                  )}
                  <button 
                    onClick={() => setDisplayFiles([])}
                    className="text-xs text-[#63666A] hover:text-[#1A1A1A] transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {/* File List */}
            <div className="p-6 space-y-4 max-h-64 overflow-y-auto">
              {displayFiles.map((file, index) => (
                <div 
                  key={file.id} 
                  className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white/50 hover:bg-white/80 transition-all duration-200 group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* File Icon with Progress */}
                  <div className="relative flex-shrink-0">
                    {getFileIcon(file.type, file.status)}
                    {file.status === 'processing' && (
                      <div className="absolute -inset-1">
                        <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">
                        {file.name}
                      </p>
                      {getStatusBadge(file)}
                      {file.securityInfo?.riskLevel === 'high' && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-700 border border-red-200 rounded-full flex items-center gap-1">
                          <Warning size={10} />
                          High Risk
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-[#63666A] mb-2">
                      <span>{formatFileSize(file.size)}</span>
                      {file.estimatedTime && file.status === 'pending' && (
                        <span className="flex items-center gap-1">
                          <Activity size={10} />
                          ~{Math.round(file.estimatedTime / 1000)}s
                        </span>
                      )}
                      {file.processingResult && (
                        <span className="text-[#7DEBFF]">
                          {file.type === 'pdf' && `${file.processingResult.pageCount} pages`}
                          {file.type === 'code' && `${file.processingResult.lineCount} lines`}
                          {file.type === 'zip' && `${file.processingResult?.fileCount || 'Unknown'} files`}
                        </span>
                      )}
                    </div>

                    {/* Processing Progress */}
                    {file.status === 'processing' && (
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#7DEBFF] to-blue-500 transition-all duration-300 rounded-full"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}

                    {/* Security Warnings */}
                    {file.securityInfo?.warnings?.length > 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-1 text-xs text-yellow-700">
                          <Warning size={12} />
                          {file.securityInfo.warnings[0]}
                          {file.securityInfo.warnings.length > 1 && 
                            ` (+${file.securityInfo.warnings.length - 1} more)`
                          }
                        </div>
                      </div>
                    )}

                    {/* Processing Results */}
                    {file.status === 'processed' && file.processingResult && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-xs text-green-700">
                          ✓ {file.type === 'pdf' && `Extracted ${file.processingResult.wordCount} words from ${file.processingResult.pageCount} pages`}
                          {file.type === 'code' && `Analyzed ${file.processingResult.lineCount} lines, found ${file.processingResult.functions} functions`}
                          {file.type === 'zip' && `Archive contains ${file.processingResult?.fileCount || 'multiple'} files`}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {file.status === 'processed' && (
                      <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="px-2 py-1 text-xs bg-[#7DEBFF]/10 text-[#7DEBFF] rounded-md hover:bg-[#7DEBFF]/20 transition-colors flex items-center gap-1">
                          <Info size={10} />
                          Preview
                        </button>
                        {file.type === 'pdf' && (
                          <button className="px-2 py-1 text-xs bg-[#7DEBFF]/10 text-[#7DEBFF] rounded-md hover:bg-[#7DEBFF]/20 transition-colors flex items-center gap-1">
                            <Lightning size={10} />
                            Search
                          </button>
                        )}
                        {file.type === 'zip' && (
                          <button className="px-2 py-1 text-xs bg-[#7DEBFF]/10 text-[#7DEBFF] rounded-md hover:bg-[#7DEBFF]/20 transition-colors flex items-center gap-1">
                            <Database size={10} />
                            Extract
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded-md"
                  >
                    <X size={14} className="text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </FloatingCard>
        )}

        {/* Main Input Area - ChatGPT Style */}
        <FloatingCard 
          className={`transition-all duration-300 ${dragOver ? 'border-[#7DEBFF] bg-[#7DEBFF]/5' : ''}`}
          delay={200}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setDragOver(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const files = e.dataTransfer.files
            if (files.length > 0) {
              handleFileSelect(files)
            }
          }}
        >
          <div className="p-6">
            <div className="flex gap-4 items-end">
              {/* Enhanced File Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex-shrink-0 w-12 h-12 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#7DEBFF] hover:bg-[#7DEBFF]/5 transition-all duration-200 flex items-center justify-center group disabled:opacity-50"
                title="Attach files with enhanced processing"
              >
                <Plus size={18} className="text-gray-400 group-hover:text-[#7DEBFF] transition-colors" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                accept="*/*"
              />

              {/* Text Input */}
              <div className="flex-1">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={dragOver ? 'Drop enhanced files here...' : 'Message with enhanced file support...'}
                  disabled={isLoading}
                  className="w-full min-h-[48px] max-h-32 resize-none bg-transparent border-none outline-none text-[#1A1A1A] placeholder-[#63666A] text-sm leading-relaxed"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                />
              </div>

              {/* Enhanced Send Button */}
              <button
                onClick={handleSend}
                disabled={(!inputValue.trim() && displayFiles.length === 0) || isLoading}
                className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-r from-[#7DEBFF] to-blue-500 hover:from-[#7DEBFF]/90 hover:to-blue-500/90 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl group"
              >
                {isLoading ? (
                  <X size={18} className="text-white" />
                ) : (
                  <PaperPlaneTilt size={18} className="text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                )}
              </button>
            </div>

            {/* Input Footer */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-4 text-xs text-[#63666A]">
                <span>Enhanced file processing enabled</span>
                {displayFiles.length > 0 && (
                  <span className="text-[#7DEBFF]">
                    {displayFiles.length} file{displayFiles.length !== 1 ? 's' : ''} attached
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-[#63666A]">
                <span>PDF • ZIP • Code • Images</span>
              </div>
            </div>
          </div>
        </FloatingCard>

        {/* Batch Processing Modal */}
        {showBatchProcessor && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <FloatingCard className="w-full max-w-md">
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#7DEBFF]/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkle size={24} className="text-[#7DEBFF]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Processing Files</h3>
                <p className="text-sm text-[#63666A] mb-4">
                  Analyzing {displayFiles.length} files with enhanced AI processing...
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#7DEBFF] to-blue-500 animate-pulse rounded-full" style={{ width: '67%' }} />
                </div>
              </div>
            </FloatingCard>
          </div>
        )}

        {/* Features showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <FloatingCard className="p-4 text-center" delay={300}>
            <Code size={24} className="text-red-500 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-[#1A1A1A] mb-1">PDF Processing</h4>
            <p className="text-xs text-[#63666A]">Extract text, search content, analyze pages</p>
          </FloatingCard>
          <FloatingCard className="p-4 text-center" delay={350}>
            <Database size={24} className="text-yellow-500 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-[#1A1A1A] mb-1">ZIP Archives</h4>
            <p className="text-xs text-[#63666A]">Secure extraction with safety validation</p>
          </FloatingCard>
          <FloatingCard className="p-4 text-center" delay={400}>
            <Lightning size={24} className="text-[#7DEBFF] mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-[#1A1A1A] mb-1">Batch Processing</h4>
            <p className="text-xs text-[#63666A]">Multi-file analysis with relationships</p>
          </FloatingCard>
        </div>
      </div>
    </div>
  )
}