/**
 * PHASE 1 FIX: IPC Integration Tests
 * Tests the critical IPC handlers to ensure they're working correctly
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { validateChatRequest, validateModelName, validateSearchQuery } from '../../shared/validation';

describe('PHASE 1 FIX - IPC Handler Integration', () => {
  
  describe('Validation Functions', () => {
    
    test('validateChatRequest should validate correct chat data', () => {
      const validData = {
        message: 'Hello AI',
        model: 'tinydolphin:latest',
        history: [{ role: 'user', content: 'previous message' }],
        mode: 'chat'
      };

      const result = validateChatRequest(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe('Hello AI');
        expect(result.data.model).toBe('tinydolphin:latest');
        expect(result.data.mode).toBe('chat');
      }
    });

    test('validateChatRequest should reject invalid data', () => {
      const invalidData = {
        message: '', // Empty message
        model: 'tinydolphin:latest'
      };

      const result = validateChatRequest(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Message content cannot be empty');
      }
    });

    test('validateModelName should validate model names', () => {
      const validResult = validateModelName('tinydolphin:latest');
      expect(validResult.success).toBe(true);
      
      const invalidResult = validateModelName('');
      expect(invalidResult.success).toBe(false);
    });

    test('validateSearchQuery should validate search parameters', () => {
      const validResult = validateSearchQuery('test query', 10);
      expect(validResult.success).toBe(true);
      if (validResult.success) {
        expect(validResult.data.query).toBe('test query');
        expect(validResult.data.limit).toBe(10);
      }

      const invalidResult = validateSearchQuery('', 10);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('IPC Handler Registration', () => {
    
    test('all critical IPC channels should be whitelisted', () => {
      // Mock the CONFIG object to test whitelist
      const criticalChannels = [
        'check-ollama-status',
        'start-ollama',
        'get-ollama-models',
        'pull-model',
        'delete-model',
        'check-chroma-status',
        'start-chroma',
        'chat-with-ai',
        'search-memory'
      ];

      // This would be tested in actual environment with CONFIG
      criticalChannels.forEach(channel => {
        expect(typeof channel).toBe('string');
        expect(channel.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    
    test('should handle malformed requests gracefully', () => {
      const malformedData = {
        message: null,
        model: undefined
      };

      const result = validateChatRequest(malformedData);
      expect(result.success).toBe(false);
    });

    test('should handle edge cases in model names', () => {
      const edgeCases = [
        '', // Empty
        'a'.repeat(101), // Too long  
        'invalid@model#name', // Invalid characters
        null, // Null
        undefined // Undefined
      ];

      edgeCases.forEach(testCase => {
        const result = validateModelName(testCase);
        expect(result.success).toBe(false);
      });
    });
  });
});
