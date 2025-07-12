import React, { useState, useEffect } from 'react'
import ModelAvatar from '@/components/ui/model-avatar'

const DEFAULT_WIDTH = 260

interface ModelData {
  value: string
  label: string
  avatar: string
  character: string
  downloadDate: string
  conversations: number
  accuracy: number
  strengths?: string[]
  weaknesses?: string[]
  trainingData: string
  description: string
}

interface ModelCardProps {
  model?: ModelData
  isOpen: boolean
  onClose: () => void
}

const ModelCard: React.FC<ModelCardProps> = ({ model, isOpen, onClose }) => {
  // Early return if no model provided
  if (!model) {
    return null
  }

  const [cardWidth, setCardWidth] = useState(400)
  const [isResizing, setIsResizing] = useState(false)

  // Cleanup resize listeners on unmount
  useEffect(() => {
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)

    const startX = e.clientX
    const startWidth = cardWidth

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const newWidth = Math.max(350, Math.min(800, startWidth + deltaX))
      setCardWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center"
      style={{
        left: '256px',
        top: '0',
        right: '0',
        bottom: '0'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      {/* Pokemon Card Container - Centered in chat area */}
      <div
        className="relative h-[550px] rounded-3xl overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-all duration-500 z-[10000]"
        style={{ width: cardWidth }}
      >
        {/* ULTRA HOLOGRAPHIC Background - Slower animations */}
        <div className="absolute inset-0">
          {/* Base holographic layer */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500"></div>

          {/* High contrast gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-tl from-blue-600/60 via-purple-600/50 to-pink-600/60"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/40 via-transparent to-yellow-500/40"></div>

          {/* Slow rainbow shimmer effect */}
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,rgba(255,0,0,0.4),rgba(255,255,0,0.4),rgba(0,255,0,0.4),rgba(0,255,255,0.4),rgba(0,0,255,0.4),rgba(255,0,255,0.4),rgba(255,0,0,0.4))] animate-[spin_8s_linear_infinite]"></div>

          {/* Slower moving light rays */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent transform -skew-x-12 animate-[pulse_3s_ease-in-out_infinite]"></div>

          {/* High contrast holographic spots */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.7)_0%,transparent_30%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(0,255,255,0.5)_0%,transparent_40%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,0,255,0.4)_0%,transparent_35%)]"></div>
        </div>

        {/* Glass Card Overlay */}
        <div className="relative h-full bg-white/20 backdrop-blur-xl border-2 border-white/50 shadow-inner">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-10 w-10 h-10 bg-white/40 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-white/60 transition-all duration-300 border-2 border-white/60"
          >
            <span className="text-white font-bold text-lg">×</span>
          </button>

          {/* Header */}
          <div className="p-6 pb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-base font-bold text-gray-800 bg-white/30 px-3 py-2 rounded-full backdrop-blur-sm border border-white/40">
                AI MODEL
              </span>
              <span className="text-base text-gray-700 bg-white/30 px-3 py-2 rounded-full backdrop-blur-sm border border-white/40">
                Level {model.label.match(/\d+[A-Z]/)?.[0] || '1B'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900 drop-shadow-lg">
                {model.label.split(' ')[0]}
              </h1>
              <div className="flex items-center gap-2 bg-white/30 px-4 py-2 rounded-full backdrop-blur-sm border border-white/40">
                <span className="text-xl font-bold text-gray-900">Fast</span>
                <span className="text-xl">⚡</span>
              </div>
            </div>
          </div>

          {/* Main Image Area - EXPANDED */}
          <div className="px-6 mb-6">
            <div className="relative h-64 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/40">
              {/* Image background effects */}
              <div className="absolute inset-0 bg-gradient-to-tl from-yellow-400/50 via-transparent to-orange-400/40"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-pink-400/30 via-transparent to-cyan-400/40"></div>

              {/* Moving holographic effects */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse"></div>
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-cyan-300/30 to-transparent animate-ping"></div>

              {/* TinyDolphin Image */}
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src="./tinydolphin.png"
                  alt="TinyDolphin"
                  className="w-40 h-40 object-contain filter drop-shadow-2xl transform rotate-12 hover:rotate-0 transition-transform duration-500"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement
                    target.style.display = 'none'
                    const fallback = target.nextElementSibling as HTMLElement
                    if (fallback) fallback.style.display = 'block'
                  }}
                />
                <div className="text-9xl filter drop-shadow-2xl transform rotate-12 hidden">
                  <ModelAvatar modelName={model.label} size="lg" className="w-32 h-32" />
                </div>
              </div>

              {/* Floating energy effects */}
              <div className="absolute top-6 left-6 w-20 h-10 bg-white/50 rounded-full blur-sm animate-pulse"></div>
              <div className="absolute bottom-8 right-8 w-16 h-8 bg-yellow-300/60 rounded-full blur-sm animate-bounce"></div>
              <div className="absolute top-1/2 right-10 w-10 h-20 bg-cyan-300/50 rounded-full blur-sm animate-pulse"></div>
            </div>

            {/* Pokemon Info */}
            <div className="text-center mt-3 text-base text-gray-700 bg-white/30 rounded-full py-2 backdrop-blur-sm border border-white/40">
              <span>
                NO. 001 AI Pokémon HT: {model.label.match(/\d+[A-Z]/)?.[0]} WT: {model.trainingData}
              </span>
            </div>
          </div>

          <div className="px-4 mb-4">
            <div className="bg-white/25 backdrop-blur-lg rounded-xl p-3 border border-white/40 shadow-inner">
              <h3 className="text-blue-800 font-bold mb-1 flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                Ability: Quick Response
              </h3>
              <p className="text-sm text-gray-800">
                All queries are processed with lightning speed for instant results.
              </p>
            </div>
          </div>

          {/* Attack/Move Section */}
          <div className="px-4 mb-4">
            <div className="bg-white/25 backdrop-blur-lg rounded-xl p-3 border border-white/40 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-4 h-4 bg-gradient-to-r from-orange-400 to-red-500 rounded-full shadow-lg animate-pulse"
                      ></div>
                    ))}
                  </div>
                  <span className="font-bold text-gray-900">Quick Generate</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">{model.accuracy}</span>
              </div>
              <p className="text-sm text-gray-800">
                Process any coding or text task instantly with high accuracy.
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="px-4 mb-4 grid grid-cols-2 gap-3">
            <div className="bg-white/25 backdrop-blur-lg rounded-xl p-3 border border-white/40 text-center shadow-inner">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-xs">💬</span>
                <span className="text-xs font-medium text-gray-700">Conversations</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{model.conversations}</div>
            </div>

            <div className="bg-white/25 backdrop-blur-lg rounded-xl p-3 border border-white/40 text-center shadow-inner">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-xs">🎯</span>
                <span className="text-xs font-medium text-gray-700">Accuracy</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{model.accuracy}%</div>
            </div>
          </div>

          {/* Weakness/Resistance Section */}
          <div className="px-4 mb-4">
            <div className="bg-white/25 backdrop-blur-lg rounded-xl p-3 border border-white/40 shadow-inner">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold text-green-700 mb-1 flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-xs">Strengths</span>
                  </h4>
                  <div className="space-y-1">
                    {(model.strengths || []).slice(0, 2).map((strength, i) => (
                      <div
                        key={i}
                        className="text-xs bg-green-100/60 backdrop-blur-sm text-green-800 px-2 py-1 rounded-full border border-green-200/50"
                      >
                        {strength}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-red-700 mb-1 flex items-center gap-1">
                    <span className="text-xs">Limitations</span>
                  </h4>
                  <div className="space-y-1">
                    {(model.weaknesses || []).slice(0, 2).map((weakness, i) => (
                      <div
                        key={i}
                        className="text-xs bg-red-100/60 backdrop-blur-sm text-red-800 px-2 py-1 rounded-full border border-red-200/50"
                      >
                        {weakness}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="text-center bg-white/20 backdrop-blur-lg rounded-xl py-2 border border-white/30">
              <div className="text-xs text-gray-600 mb-1">Illus. AI Training Data</div>
              <div className="text-xs text-gray-500">
                ©2024 Puffer • {model.character}/001 ★
              </div>
            </div>
          </div>
        </div>

        {/* Ultra Holographic Border Effects */}
        <div className="absolute inset-0 rounded-3xl border-2 border-white/60 pointer-events-none"></div>
        <div className="absolute inset-0 rounded-3xl border border-yellow-300/70 pointer-events-none"></div>
        <div className="absolute inset-0 rounded-3xl border border-cyan-300/50 pointer-events-none animate-pulse"></div>

        <div
          onMouseDown={handleMouseDown}
          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize transition ${
            isResizing ? 'bg-blue-500/60' : 'bg-transparent hover:bg-zinc-700/40'
          }`}
        />
      </div>
    </div>
  )
}

export default ModelCard
