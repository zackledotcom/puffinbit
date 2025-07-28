/**
 * Agent IPC Handlers - Agent runtime management
 * Uses dependency injection for AgentRuntime
 */

import { ipcMain } from 'electron';
import { DependencyContainer } from '../services/DependencyContainer';
import { safeLog, safeError } from '../utils/safeLogger';

export function registerAgentHandlers(
  container: DependencyContainer,
  Security: any
): void {

  /**
   * Create a new agent
   */
  ipcMain.handle('agent-create', async (_, config: any) => {
    try {
      // Basic config validation
      if (!config || typeof config !== 'object') {
        return { success: false, error: 'Config must be a valid object' };
      }

      if (!config.name || typeof config.name !== 'string') {
        return { success: false, error: 'Agent name is required and must be a string' };
      }

      // Sanitize config inputs
      const sanitizedConfig = {
        ...config,
        name: Security.sanitizeInput(config.name),
        description: config.description ? Security.sanitizeInput(config.description) : ''
      };

      const agentRuntime = container.get('agentRuntime');
      const agent = await agentRuntime.createAgent(sanitizedConfig);
      
      return {
        success: true,
        agentId: agent.config.id,
        config: agent.config
      };
    } catch (error: any) {
      safeError('❌ agent-create error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Start an agent
   */
  ipcMain.handle('agent-start', async (_, agentId: string) => {
    try {
      if (typeof agentId !== 'string' || !agentId.trim()) {
        return { success: false, error: 'Agent ID must be a non-empty string' };
      }

      const agentRuntime = container.get('agentRuntime');
      await agentRuntime.startAgent(agentId.trim());
      
      return { success: true };
    } catch (error: any) {
      safeError('❌ agent-start error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Stop an agent
   */
  ipcMain.handle('agent-stop', async (_, agentId: string) => {
    try {
      if (typeof agentId !== 'string' || !agentId.trim()) {
        return { success: false, error: 'Agent ID must be a non-empty string' };
      }

      const agentRuntime = container.get('agentRuntime');
      await agentRuntime.stopAgent(agentId.trim());
      
      return { success: true };
    } catch (error: any) {
      safeError('❌ agent-stop error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Delete an agent
   */
  ipcMain.handle('agent-delete', async (_, agentId: string) => {
    try {
      if (typeof agentId !== 'string' || !agentId.trim()) {
        return { success: false, error: 'Agent ID must be a non-empty string' };
      }

      const agentRuntime = container.get('agentRuntime');
      await agentRuntime.deleteAgent(agentId.trim());
      
      return { success: true };
    } catch (error: any) {
      safeError('❌ agent-delete error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get agent details
   */
  ipcMain.handle('agent-get', async (_, agentId: string) => {
    try {
      if (typeof agentId !== 'string' || !agentId.trim()) {
        return { success: false, error: 'Agent ID must be a non-empty string' };
      }

      const agentRuntime = container.get('agentRuntime');
      const agent = agentRuntime.getAgent(agentId.trim());
      
      if (!agent) {
        return { success: false, error: 'Agent not found' };
      }
      
      return { success: true, agent: agent.config };
    } catch (error: any) {
      safeError('❌ agent-get error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * List all agents
   */
  ipcMain.handle('agent-list', async () => {
    try {
      const agentRuntime = container.get('agentRuntime');
      const agents = agentRuntime.getAllAgents().map(agent => agent.config);
      
      return { success: true, agents };
    } catch (error: any) {
      safeError('❌ agent-list error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get agent status
   */
  ipcMain.handle('agent-get-status', async (_, agentId: string) => {
    try {
      if (typeof agentId !== 'string' || !agentId.trim()) {
        return { success: false, error: 'Agent ID must be a non-empty string' };
      }

      const agentRuntime = container.get('agentRuntime');
      const status = agentRuntime.getAgentStatus(agentId.trim());
      
      if (!status) {
        return { success: false, error: 'Agent not found' };
      }
      
      return { success: true, status };
    } catch (error: any) {
      safeError('❌ agent-get-status error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Execute task with agent
   */
  ipcMain.handle('agent-execute-task', async (_, agentId: string, task: any) => {
    try {
      if (typeof agentId !== 'string' || !agentId.trim()) {
        return { success: false, error: 'Agent ID must be a non-empty string' };
      }

      if (!task || typeof task !== 'object') {
        return { success: false, error: 'Task must be a valid object' };
      }

      // Sanitize task inputs if they contain strings
      const sanitizedTask = { ...task };
      if (task.description && typeof task.description === 'string') {
        sanitizedTask.description = Security.sanitizeInput(task.description);
      }
      if (task.input && typeof task.input === 'string') {
        sanitizedTask.input = Security.sanitizeInput(task.input);
      }

      const agentRuntime = container.get('agentRuntime');
      const result = await agentRuntime.executeTask(agentId.trim(), sanitizedTask);
      
      return { success: true, result };
    } catch (error: any) {
      safeError('❌ agent-execute-task error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get agent system status
   */
  ipcMain.handle('agent-get-system-status', async () => {
    try {
      const agentRuntime = container.get('agentRuntime');
      const status = agentRuntime.getSystemStatus();
      
      return { success: true, status };
    } catch (error: any) {
      safeError('❌ agent-get-system-status error:', error);
      return { success: false, error: error.message };
    }
  });

  safeLog('✅ Agent handlers registered');
}
