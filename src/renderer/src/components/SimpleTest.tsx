import React from 'react'

export default function SimpleTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 relative">
      {/* Dot Pattern Background */}
      <div className="fixed inset-0 opacity-30">
        <svg className="w-full h-full" viewBox="0 0 400 400">
          <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="rgb(125, 235, 255)" opacity="0.4" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>
      
      <div className="relative z-10 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎉 Enhanced File UI Demo
          </h1>
          <p className="text-gray-600 mb-8">
            This is the ChatGPT-style interface with dot pattern background
          </p>
          
          {/* Sample File Card */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 shadow-lg max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">📄</span>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">project-analysis.pdf</h3>
                <p className="text-sm text-gray-500">2.5 MB • Processed</p>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-700">
                ✓ Extracted 7,842 words from 15 pages
              </p>
            </div>
          </div>
          
          {/* Input Area */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 shadow-lg max-w-2xl mx-auto mt-8">
            <div className="flex gap-4 items-center">
              <button className="w-12 h-12 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-colors">
                <span className="text-2xl">+</span>
              </button>
              <div className="flex-1">
                <input 
                  type="text" 
                  placeholder="Message with enhanced file support..."
                  className="w-full p-3 bg-transparent border-none outline-none text-gray-900"
                />
              </div>
              <button className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white hover:from-blue-600 hover:to-blue-700 transition-colors">
                <span className="text-xl">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
