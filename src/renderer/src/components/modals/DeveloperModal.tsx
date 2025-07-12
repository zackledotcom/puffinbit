import React, { useState, useEffect } from 'react'
import DeveloperMode from '../chat/DeveloperMode'
import { useAllServices } from '../../hooks/useServices'
import { Message } from '../../../../types/chat'
import { SystemMetrics } from '../../../../types/settings'

interface DeveloperModalProps {
  isOpen: boolean
  onClose: () => void
}

// Mock message data for demo
const generateMockMessages = () => {
  return [
    {
      id: 'msg-1',
      type: 'user' as const,
      content: 'Create a Python function to calculate fibonacci numbers',
      timestamp: new Date(Date.now() - 300000),
      position: { x: 50, y: 50 },
      tags: ['python', 'algorithms']
    },
    {
      id: 'msg-2',
      type: 'ai' as const,
      content: `Here's a Python function to calculate Fibonacci numbers:

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# More efficient iterative version
def fibonacci_iterative(n):
    if n <= 1:
        return n
    
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

# Example usage
print(fibonacci_iterative(10))  # Output: 55
\`\`\`

The recursive version is simple but inefficient for large numbers. The iterative version is much faster.`,
      timestamp: new Date(Date.now() - 280000),
      position: { x: 400, y: 50 },
      tags: ['python', 'code', 'response'],
      attachments: [
        {
          type: 'code' as const,
          name: 'fibonacci.py',
          content: `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def fibonacci_iterative(n):
    if n <= 1:
        return n
    
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

print(fibonacci_iterative(10))`,
          language: 'python',
          executable: true
        }
      ],
      connections: ['msg-1']
    },
    {
      id: 'msg-3',
      type: 'user' as const,
      content: 'Now create a React component that uses this',
      timestamp: new Date(Date.now() - 240000),
      position: { x: 50, y: 300 },
      tags: ['react', 'frontend']
    },
    {
      id: 'msg-4',
      type: 'ai' as const,
      content: `Here's a React component that uses the Fibonacci function:

\`\`\`jsx
import React, { useState } from 'react';

const FibonacciCalculator = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [sequence, setSequence] = useState([]);

  const fibonacci = (n) => {
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  };

  const generateSequence = (n) => {
    const seq = [];
    for (let i = 0; i <= n; i++) {
      seq.push(fibonacci(i));
    }
    return seq;
  };

  const handleCalculate = () => {
    const num = parseInt(input);
    if (num >= 0) {
      setResult(fibonacci(num));
      setSequence(generateSequence(num));
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Fibonacci Calculator</h2>
      
      <div className="mb-4">
        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter a number"
          className="w-full p-2 border rounded"
        />
        <button 
          onClick={handleCalculate}
          className="mt-2 w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Calculate
        </button>
      </div>

      {result !== null && (
        <div className="mb-4">
          <p className="font-semibold">
            Fibonacci({input}) = {result}
          </p>
        </div>
      )}

      {sequence.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Sequence:</h3>
          <div className="flex flex-wrap gap-1">
            {sequence.map((num, index) => (
              <span key={index} className="bg-gray-200 px-2 py-1 rounded text-sm">
                {num}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FibonacciCalculator;
\`\`\`

This component provides an interactive interface to calculate Fibonacci numbers and shows the complete sequence.`,
      timestamp: new Date(Date.now() - 200000),
      position: { x: 400, y: 300 },
      tags: ['react', 'component', 'code'],
      attachments: [
        {
          type: 'code' as const,
          name: 'FibonacciCalculator.jsx',
          content: `import React, { useState } from 'react';

const FibonacciCalculator = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [sequence, setSequence] = useState([]);

  const fibonacci = (n) => {
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  };

  const generateSequence = (n) => {
    const seq = [];
    for (let i = 0; i <= n; i++) {
      seq.push(fibonacci(i));
    }
    return seq;
  };

  const handleCalculate = () => {
    const num = parseInt(input);
    if (num >= 0) {
      setResult(fibonacci(num));
      setSequence(generateSequence(num));
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Fibonacci Calculator</h2>
      
      <div className="mb-4">
        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter a number"
          className="w-full p-2 border rounded"
        />
        <button 
          onClick={handleCalculate}
          className="mt-2 w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Calculate
        </button>
      </div>

      {result !== null && (
        <div className="mb-4">
          <p className="font-semibold">
            Fibonacci({input}) = {result}
          </p>
        </div>
      )}

      {sequence.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Sequence:</h3>
          <div className="flex flex-wrap gap-1">
            {sequence.map((num, index) => (
              <span key={index} className="bg-gray-200 px-2 py-1 rounded text-sm">
                {num}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FibonacciCalculator;`,
          language: 'jsx',
          executable: true
        }
      ],
      connections: ['msg-3', 'msg-2']
    },
    {
      id: 'msg-5',
      type: 'note' as const,
      content: 'TODO: Add memoization to optimize recursive calls',
      timestamp: new Date(Date.now() - 120000),
      position: { x: 750, y: 150 },
      tags: ['todo', 'optimization'],
      isPinned: true
    }
  ]
}

const DeveloperModal: React.FC<DeveloperModalProps> = ({ isOpen, onClose }) => {
  // TODO: Replace mock data with real chat history and system metrics
  // const [messages, setMessages] = useState<Message[]>([])
  // const [systemStats, setSystemStats] = useState<SystemMetrics | null>(null)

  // For now, keep using mock data until backend services are implemented
  const [messages, setMessages] = useState(() => generateMockMessages())
  const services = useAllServices()
  const [systemStats, setSystemStats] = useState({
    cpu: 45.2,
    memory: 67.8,
    gpu: 23.1,
    temperature: 62
  })

  // Mock system stats updates
  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      setSystemStats((prev) => ({
        cpu: Math.max(10, Math.min(90, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(20, Math.min(95, prev.memory + (Math.random() - 0.5) * 5)),
        gpu: Math.max(0, Math.min(100, prev.gpu + (Math.random() - 0.5) * 15)),
        temperature: Math.max(40, Math.min(80, prev.temperature + (Math.random() - 0.5) * 3))
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [isOpen])

  const models = [
    { id: 'tinydolphin:latest', name: 'TinyDolphin', version: '1.0', size: '1.1B' },
    { id: 'openchat:latest', name: 'OpenChat', version: '3.5', size: '7B' },
    { id: 'phi4-mini:latest', name: 'Phi4 Mini', version: '1.0', size: '3.8B' },
    { id: 'deepseek-coder:1.3b', name: 'DeepSeek Coder', version: '1.3', size: '1.3B' }
  ]

  const handleUpdateMessage = (id: string, updates: any) => {
    setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)))
  }

  const handleDeleteMessage = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id))
  }

  const handleCorrectMessage = (id: string, newContent: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, content: newContent } : msg))
    )
  }

  const handleAddMessage = (message: any) => {
    const newMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date()
    }
    setMessages((prev) => [...prev, newMessage])
  }

  if (!isOpen) return null

  return (
    <DeveloperMode
      isOpen={isOpen}
      onClose={onClose}
      messages={messages}
      onUpdateMessage={handleUpdateMessage}
      onDeleteMessage={handleDeleteMessage}
      onCorrectMessage={handleCorrectMessage}
      onAddMessage={handleAddMessage}
      selectedModel={services.ollama.models[0] || 'tinydolphin:latest'}
      systemStats={systemStats}
    />
  )
}

export default DeveloperModal
