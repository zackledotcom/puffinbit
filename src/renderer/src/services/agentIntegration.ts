import { ipcRenderer } from 'electron';
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Interface for IPC communication results
interface IPCResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * File System Tool Integration
 * Connects to the main process file-system-handlers
 */
export const createFileSystemTool = () => {
  return tool(
    async ({ action, path, content, query }: { 
      action: string; 
      path?: string; 
      content?: string; 
      query?: string; 
    }) => {
      try {
        let result: IPCResult;
        
        switch (action) {
          case "read":
            if (!path) throw new Error("Path is required for read operation");
            result = await ipcRenderer.invoke('file:read', { path });
            break;
            
          case "write":
            if (!path || content === undefined) {
              throw new Error("Path and content are required for write operation");
            }
            result = await ipcRenderer.invoke('file:write', { path, content });
            break;
            
          case "list":
            if (!path) throw new Error("Path is required for list operation");
            result = await ipcRenderer.invoke('file:list', { path });
            break;
            
          case "search":
            if (!path || !query) {
              throw new Error("Path and query are required for search operation");
            }
            result = await ipcRenderer.invoke('file:search', { path, query });
            break;
            
          case "move":
            if (!path || !content) {
              throw new Error("Source path and destination path are required for move operation");
            }
            result = await ipcRenderer.invoke('file:move', { 
              source: path, 
              destination: content 
            });
            break;
            
          default:
            throw new Error(`Unsupported file operation: ${action}`);
        }
        
        if (result.success) {
          return typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);
        } else {
          return `Error: ${result.error || 'Unknown error occurred'}`;
        }
      } catch (error) {
        return `File operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "file_system",
      description: "Perform file system operations. Actions: 'read' (requires path), 'write' (requires path and content), 'list' (requires path), 'search' (requires path and query), 'move' (requires path as source and content as destination).",
      schema: z.object({
        action: z.enum(["read", "write", "list", "search", "move"]),
        path: z.string().optional(),
        content: z.string().optional(),
        query: z.string().optional(),
      }),
    }
  );
};

/**
 * Code Generation Tool Integration  
 * Connects to the main process code-generation-handlers
 */
export const createCodeGenerationTool = () => {
  return tool(
    async ({ language, description, complexity, type }: { 
      language: string; 
      description: string; 
      complexity?: string; 
      type?: string; 
    }) => {
      try {
        const result: IPCResult = await ipcRenderer.invoke('code:generate', {
          language,
          description,
          complexity: complexity || 'medium',
          type: type || 'function'
        });
        
        if (result.success) {
          return result.data || 'Code generated successfully';
        } else {
          return `Code generation failed: ${result.error || 'Unknown error'}`;
        }
      } catch (error) {
        return `Code generation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "code_generator",
      description: "Generate code in various programming languages. Specify language, description of what to create, complexity level, and type of code.",
      schema: z.object({
        language: z.string().describe("Programming language (e.g., javascript, python, rust, etc.)"),
        description: z.string().describe("Detailed description of what code to generate"),
        complexity: z.enum(["simple", "medium", "complex"]).optional(),
        type: z.enum(["function", "class", "module", "script", "component"]).optional(),
      }),
    }
  );
};

/**
 * Ollama Model Management Tool Integration
 * Connects to the main process ollama handlers
 */
export const createOllamaModelTool = () => {
  return tool(
    async ({ action, modelName, prompt }: { 
      action: string; 
      modelName?: string; 
      prompt?: string; 
    }) => {
      try {
        let result: IPCResult;
        
        switch (action) {
          case "list":
            result = await ipcRenderer.invoke('ollama:list-models');
            break;
            
          case "pull":
            if (!modelName) throw new Error("Model name is required for pull operation");
            result = await ipcRenderer.invoke('ollama:pull-model', { modelName });
            break;
            
          case "info":
            if (!modelName) throw new Error("Model name is required for info operation");
            result = await ipcRenderer.invoke('ollama:model-info', { modelName });
            break;
            
          case "generate":
            if (!modelName || !prompt) {
              throw new Error("Model name and prompt are required for generate operation");
            }
            result = await ipcRenderer.invoke('ollama:generate', { 
              model: modelName, 
              prompt 
            });
            break;
            
          case "status":
            result = await ipcRenderer.invoke('ollama:status');
            break;
            
          default:
            throw new Error(`Unsupported Ollama operation: ${action}`);
        }
        
        if (result.success) {
          return typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);
        } else {
          return `Ollama operation failed: ${result.error || 'Unknown error'}`;
        }
      } catch (error) {
        return `Ollama error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "ollama_models",
      description: "Manage Ollama models and generate text. Actions: 'list' (show available models), 'pull' (download model), 'info' (model details), 'generate' (generate text), 'status' (check Ollama status).",
      schema: z.object({
        action: z.enum(["list", "pull", "info", "generate", "status"]),
        modelName: z.string().optional(),
        prompt: z.string().optional(),
      }),
    }
  );
};

/**
 * ChromaDB Integration Tool
 * Connects to the main process chroma handlers
 */
export const createChromaTool = () => {
  return tool(
    async ({ action, query, documents, collectionName }: { 
      action: string; 
      query?: string; 
      documents?: string[]; 
      collectionName?: string; 
    }) => {
      try {
        let result: IPCResult;
        
        switch (action) {
          case "query":
            if (!query) throw new Error("Query is required for search operation");
            result = await ipcRenderer.invoke('chroma:query', { 
              query,
              collectionName: collectionName || 'default'
            });
            break;
            
          case "add":
            if (!documents || documents.length === 0) {
              throw new Error("Documents are required for add operation");
            }
            result = await ipcRenderer.invoke('chroma:add', { 
              documents,
              collectionName: collectionName || 'default'
            });
            break;
            
          case "collections":
            result = await ipcRenderer.invoke('chroma:list-collections');
            break;
            
          case "delete":
            if (!collectionName) {
              throw new Error("Collection name is required for delete operation");
            }
            result = await ipcRenderer.invoke('chroma:delete-collection', { collectionName });
            break;
            
          case "status":
            result = await ipcRenderer.invoke('chroma:status');
            break;
            
          default:
            throw new Error(`Unsupported ChromaDB operation: ${action}`);
        }
        
        if (result.success) {
          return typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);
        } else {
          return `ChromaDB operation failed: ${result.error || 'Unknown error'}`;
        }
      } catch (error) {
        return `ChromaDB error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "chroma_db",
      description: "Interact with ChromaDB vector database. Actions: 'query' (search documents), 'add' (add documents), 'collections' (list collections), 'delete' (delete collection), 'status' (check ChromaDB status).",
      schema: z.object({
        action: z.enum(["query", "add", "collections", "delete", "status"]),
        query: z.string().optional(),
        documents: z.array(z.string()).optional(),
        collectionName: z.string().optional(),
      }),
    }
  );
};

/**
 * System Information Tool
 * Gets system information and running processes
 */
export const createSystemInfoTool = () => {
  return tool(
    async ({ action, processName }: { action: string; processName?: string }) => {
      try {
        let result: IPCResult;
        
        switch (action) {
          case "processes":
            result = await ipcRenderer.invoke('system:get-processes');
            break;
            
          case "info":
            result = await ipcRenderer.invoke('system:get-info');
            break;
            
          case "memory":
            result = await ipcRenderer.invoke('system:get-memory');
            break;
            
          case "find-process":
            if (!processName) throw new Error("Process name is required for find operation");
            result = await ipcRenderer.invoke('system:find-process', { processName });
            break;
            
          default:
            throw new Error(`Unsupported system operation: ${action}`);
        }
        
        if (result.success) {
          return typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);
        } else {
          return `System operation failed: ${result.error || 'Unknown error'}`;
        }
      } catch (error) {
        return `System error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "system_info",
      description: "Get system information and process details. Actions: 'processes' (list running processes), 'info' (system information), 'memory' (memory usage), 'find-process' (find specific process).",
      schema: z.object({
        action: z.enum(["processes", "info", "memory", "find-process"]),
        processName: z.string().optional(),
      }),
    }
  );
};

/**
 * Canvas/Drawing Tool Integration
 * Connects to canvas handlers for drawing operations
 */
export const createCanvasTool = () => {
  return tool(
    async ({ action, data }: { action: string; data?: any }) => {
      try {
        let result: IPCResult;
        
        switch (action) {
          case "create":
            result = await ipcRenderer.invoke('canvas:create', data);
            break;
            
          case "save":
            result = await ipcRenderer.invoke('canvas:save', data);
            break;
            
          case "load":
            result = await ipcRenderer.invoke('canvas:load', data);
            break;
            
          case "export":
            result = await ipcRenderer.invoke('canvas:export', data);
            break;
            
          default:
            throw new Error(`Unsupported canvas operation: ${action}`);
        }
        
        if (result.success) {
          return typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);
        } else {
          return `Canvas operation failed: ${result.error || 'Unknown error'}`;
        }
      } catch (error) {
        return `Canvas error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "canvas_tool",
      description: "Interact with canvas/drawing functionality. Actions: 'create' (new canvas), 'save' (save canvas), 'load' (load canvas), 'export' (export canvas).",
      schema: z.object({
        action: z.enum(["create", "save", "load", "export"]),
        data: z.any().optional(),
      }),
    }
  );
};

/**
 * Create all available tools
 */
export const createAllIntegratedTools = () => {
  return [
    createFileSystemTool(),
    createCodeGenerationTool(),
    createOllamaModelTool(),
    createChromaTool(),
    createSystemInfoTool(),
    createCanvasTool(),
  ];
};

/**
 * Test IPC connectivity
 */
export async function testIPCConnectivity(): Promise<{
  available: string[];
  unavailable: string[];
  errors: Record<string, string>;
}> {
  const tests = [
    { name: 'file', handler: 'file:list', data: { path: '.' } },
    { name: 'ollama', handler: 'ollama:status', data: {} },
    { name: 'chroma', handler: 'chroma:status', data: {} },
    { name: 'code', handler: 'code:status', data: {} },
    { name: 'system', handler: 'system:get-info', data: {} },
    { name: 'canvas', handler: 'canvas:status', data: {} },
  ];

  const available: string[] = [];
  const unavailable: string[] = [];
  const errors: Record<string, string> = {};

  for (const test of tests) {
    try {
      const result: IPCResult = await ipcRenderer.invoke(test.handler, test.data);
      if (result.success || result.data) {
        available.push(test.name);
      } else {
        unavailable.push(test.name);
        errors[test.name] = result.error || 'Unknown error';
      }
    } catch (error) {
      unavailable.push(test.name);
      errors[test.name] = error instanceof Error ? error.message : 'Connection failed';
    }
  }

  return { available, unavailable, errors };
}
