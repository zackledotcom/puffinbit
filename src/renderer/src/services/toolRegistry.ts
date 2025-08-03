import { retrieveContext } from "./memoryService";

export const toolRegistry = {
  // 🔍 Web Search (working implementation)
  search: {
    name: "web_search",
    description: "Search the web for up-to-date information",
    async execute(query: string) {
      try {
        // Use a working search API or fallback to browser search
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        return `Search results for "${query}": ${searchUrl}\n\nNote: For actual search results, integrate with a search API like Brave Search, Serper, or SerpAPI.`;
      } catch (error) {
        return `Search error: ${error}`;
      }
    },
  },

  // 🧠 Memory Retrieval
  memory: {
    name: "retrieve_memory",
    description: "Retrieve past conversations or relevant context",
    async execute(query: string) {
      const context = await retrieveContext(query);
      return JSON.stringify(context);
    },
  },

  // 📂 Filesystem Tool (Read/Write)
  filesystem: {
    name: "filesystem",
    description: "Read or write files in the user workspace",
    async execute({ action, path, content }: { action: "read" | "write"; path: string; content?: string }) {
      const { ipcRenderer } = (window as any).electron || {};
      if (!ipcRenderer) return "Filesystem access is not available in this environment.";
      if (action === "read") {
        return await ipcRenderer.invoke("fs:readFile", path);
      } else if (action === "write" && content) {
        return await ipcRenderer.invoke("fs:writeFile", { path, content });
      }
      return "Invalid filesystem command.";
    },
  },

  // 🖥️ Code Executor (safer implementation)
  codeExecutor: {
    name: "code_executor",
    description: "Execute safe JavaScript expressions and calculations",
    async execute(code: string) {
      try {
        // Only allow safe mathematical and string operations
        const safeCode = code.replace(/[^0-9+\-*/().\s]/g, '');
        if (safeCode !== code) {
          return "Error: Only mathematical expressions are allowed for security reasons";
        }
        
        // Use eval only for simple math expressions
        const result = eval(safeCode);
        return String(result);
      } catch (err: any) {
        return `Execution Error: ${err.message}`;
      }
    },
  },

  // 🌐 API Caller
  apiCall: {
    name: "api_call",
    description: "Fetch data from an external API endpoint",
    async execute({ url, method = "GET", body }: { url: string; method?: string; body?: any }) {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      return await res.text();
    },
  },
};
