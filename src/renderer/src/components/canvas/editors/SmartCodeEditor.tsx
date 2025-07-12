)}
              className="w-full h-full bg-transparent text-green-400 font-mono text-sm resize-none outline-none"
              style={{
                fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
                lineHeight: '1.5',
                tabSize: 2,
              }}
              placeholder="Write your code here..."
            />
          </div>

          {/* Status Bar */}
          <div className="bg-gray-800 px-4 py-1 text-xs text-gray-400 border-t border-gray-700 flex justify-between">
            <div>Line 1, Col 1</div>
            <div className="flex items-center gap-4">
              <span className="text-green-400">TypeScript</span>
              <span>UTF-8</span>
              <span>LF</span>
            </div>
          </div>
        </div>
      </Html>

      {/* Floating Code Suggestions */}
      <Html
        position={[6, 2, 0]}
        distanceFactor={12}
      >
        <div className="bg-black/80 p-3 rounded-lg backdrop-blur-md border border-green-500/30 max-w-xs">
          <div className="text-green-400 text-sm font-medium mb-2">AI Suggestions</div>
          <div className="space-y-2 text-xs text-white/80">
            <div className="p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20 transition-colors">
              Add error boundary
            </div>
            <div className="p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20 transition-colors">
              Optimize performance
            </div>
            <div className="p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20 transition-colors">
              Add TypeScript types
            </div>
          </div>
        </div>
      </Html>

      {/* Floating Action Buttons */}
      <Html
        position={[0, -4.5, 0]}
        center
        distanceFactor={10}
      >
        <div className="flex gap-2">
          <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium">
            Run Code
          </button>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium">
            Save
          </button>
          <button className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium">
            AI Assist
          </button>
        </div>
      </Html>

      {/* Code Execution Indicator */}
      <Box args={[0.5, 0.5, 0.5]} position={[5, 3.5, 0]}>
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={0.5}
        />
      </Box>
    </group>
  );
};
