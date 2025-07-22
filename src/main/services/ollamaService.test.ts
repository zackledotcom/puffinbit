import { ollamaService } from '../services/ollamaService'

// Mock axios for HTTP requests
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
  defaults: {
    timeout: 5000
  }
}))

// Mock child_process for service management
jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn()
}))

describe('ollamaService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkStatus', () => {
    test('should return connected status when Ollama is running', async () => {
      // Mock successful axios response
      const axios = require('axios')
      axios.get.mockResolvedValue({
        status: 200,
        data: { status: 'ok' }
      })

      const status = await ollamaService.checkStatus()
      
      expect(status.connected).toBe(true)
      expect(status.message).toContain('running')
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/tags'),
        expect.any(Object)
      )
    })

    test('should return disconnected status when Ollama is not running', async () => {
      // Mock failed axios response
      const axios = require('axios')
      axios.get.mockRejectedValue(new Error('Connection refused'))

      const status = await ollamaService.checkStatus()
      
      expect(status.connected).toBe(false)
      expect(status.message).toContain('not running')
    })
  })

  describe('getModels', () => {
    test('should return list of models when Ollama is running', async () => {
      const axios = require('axios')
      axios.get.mockResolvedValue({
        data: {
          models: [
            { name: 'llama3.1:8b', size: 4800000000 },
            { name: 'codellama:7b', size: 3900000000 }
          ]
        }
      })

      const result = await ollamaService.getModels()
      
      expect(result.success).toBe(true)
      expect(result.models).toHaveLength(2)
      expect(result.models[0].name).toBe('llama3.1:8b')
    })

    test('should return empty array when no models available', async () => {
      const axios = require('axios')
      axios.get.mockResolvedValue({
        data: { models: [] }
      })

      const result = await ollamaService.getModels()
      
      expect(result.success).toBe(true)
      expect(result.models).toHaveLength(0)
    })
  })

  describe('startService', () => {
    test('should return success when service is already running', async () => {
      // Mock checkStatus to return connected
      jest.spyOn(ollamaService, 'checkStatus').mockResolvedValue({
        connected: true,
        message: 'Ollama is running'
      })

      const result = await ollamaService.startService()
      
      expect(result.success).toBe(true)
      expect(result.message).toContain('running')
    })

    test('should attempt to start service when not running', async () => {
      const { exec } = require('child_process')
      
      // Mock checkStatus to return disconnected initially
      jest.spyOn(ollamaService, 'checkStatus')
        .mockResolvedValueOnce({
          connected: false,
          message: 'Ollama is not running'
        })
        .mockResolvedValueOnce({
          connected: true,
          message: 'Ollama is running'
        })

      // Mock exec to simulate successful start
      exec.mockImplementation((cmd: string, callback: Function) => {
        callback(null, { stdout: 'Ollama started' })
      })

      const result = await ollamaService.startService()
      
      expect(result.success).toBe(true)
      expect(exec).toHaveBeenCalled()
    })
  })

  describe('pullModel', () => {
    test('should successfully pull a model', async () => {
      const axios = require('axios')
      axios.post.mockResolvedValue({
        status: 200,
        data: { status: 'success' }
      })

      const result = await ollamaService.pullModel('llama3.1:8b')
      
      expect(result.success).toBe(true)
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/pull'),
        { name: 'llama3.1:8b' },
        expect.any(Object)
      )
    })

    test('should handle pull errors gracefully', async () => {
      const axios = require('axios')
      axios.post.mockRejectedValue(new Error('Model not found'))

      const result = await ollamaService.pullModel('nonexistent:model')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Model not found')
    })
  })

  describe('generateResponse', () => {
    test('should generate response from model', async () => {
      const axios = require('axios')
      axios.post.mockResolvedValue({
        data: {
          response: 'This is a test response from the AI model.',
          done: true
        }
      })

      const result = await ollamaService.generateResponse(
        'llama3.1:8b',
        'Hello, how are you?'
      )
      
      expect(result.success).toBe(true)
      expect(result.response).toContain('test response')
    })

    test('should handle generation errors', async () => {
      const axios = require('axios')
      axios.post.mockRejectedValue(new Error('Model not loaded'))

      const result = await ollamaService.generateResponse(
        'invalid:model',
        'Test prompt'
      )
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Model not loaded')
    })
  })
})
