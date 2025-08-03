/**
 * Browser IPC Handlers - Web browsing and context extraction
 * Handles browser-related operations and security for the AI browser feature
 */

import { ipcMain, BrowserWindow, session } from 'electron';
import { DependencyContainer } from '../services/DependencyContainer';
import { safeLog, safeError, safeInfo } from '../utils/safeLogger';

// Type definitions for browser security
interface SecurityService {
  sanitizeInput(input: string): string;
  validatePermission(operation: string, context: any): boolean;
  logSecurityEvent(event: string, details: any): void;
}

interface BrowserPermissions {
  media: boolean;
  geolocation: boolean;
  notifications: boolean;
  fullscreen: boolean;
}

interface BrowserContextOptions {
  waitTime?: number;
  maxContentLength?: number;
  includeMetadata?: boolean;
}

export function registerBrowserHandlers(
  container: DependencyContainer,
  security: SecurityService
): void {

  /**
   * Create a new browser session with security restrictions
   */
  ipcMain.handle('browser-create-session', async (_, sessionId: string) => {
    try {
      // Input validation with proper types
      if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
        return { success: false, error: 'Session ID must be a non-empty string' };
      }

      // Security validation
      if (!security.validatePermission('browser:create-session', { sessionId })) {
        security.logSecurityEvent('unauthorized_browser_session', { sessionId });
        return { success: false, error: 'Permission denied' };
      }

      const sanitizedSessionId = security.sanitizeInput(sessionId.trim());
      
      // Create a persistent session for the browser
      const browserSession = session.fromPartition(`persist:browser-${sanitizedSessionId}`);
      
      // Set security policies for the browser session with proper typing
      browserSession.setPermissionRequestHandler((webContents, permission, callback) => {
        // Define allowed permissions with type safety
        const allowedPermissions: string[] = [
          'media',
          'geolocation', 
          'notifications',
          'fullscreen'
        ];
        
        const isAllowed = allowedPermissions.includes(permission);
        security.logSecurityEvent('browser_permission_request', { 
          permission, 
          allowed: isAllowed,
          sessionId: sanitizedSessionId 
        });
        
        callback(isAllowed);
      });

      // Block dangerous protocols
      browserSession.protocol.interceptHttpProtocol('file', (request, callback) => {
        callback({ error: -3 }); // Block file:// protocol
      });

      // Set user agent
      browserSession.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 PufferBrowser/1.0'
      );

      safeInfo(`Browser session created: ${sanitizedSessionId}`);
      
      return { success: true, sessionId: sanitizedSessionId };
    } catch (error: any) {
      safeError('❌ browser-create-session error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Extract context from a webpage URL
   */
  ipcMain.handle('browser-extract-context', async (_, url: string, options: BrowserContextOptions = {}) => {
    try {
      // Enhanced input validation
      if (!url || typeof url !== 'string' || !url.trim()) {
        return { success: false, error: 'URL must be a non-empty string' };
      }

      // Security validation
      if (!security.validatePermission('browser:extract-context', { url })) {
        security.logSecurityEvent('unauthorized_context_extraction', { url });
        return { success: false, error: 'Permission denied' };
      }

      // Validate URL format with proper error handling
      let validUrl: URL;
      try {
        validUrl = new URL(url);
      } catch (urlError) {
        security.logSecurityEvent('invalid_url_attempt', { url, error: String(urlError) });
        return { success: false, error: 'Invalid URL format' };
      }

      // Security check - only allow http/https
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        security.logSecurityEvent('blocked_protocol', { url, protocol: validUrl.protocol });
        return { success: false, error: 'Only HTTP and HTTPS URLs are allowed' };
      }

      safeInfo(`Extracting context from: ${validUrl.href}`);
      security.logSecurityEvent('context_extraction_started', { domain: validUrl.hostname });

      // Create a temporary browser window for context extraction
      const extractorWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true,
          allowRunningInsecureContent: false,
          experimentalFeatures: false,
          partition: 'persist:context-extractor',
          sandbox: true // Enhanced security
        }
      });

      try {
        // Set timeout for page loading
        const loadTimeout = options.waitTime || 3000;
        const maxTimeout = 10000; // Maximum allowed timeout
        const safeTimeout = Math.min(loadTimeout, maxTimeout);

        // Load the URL with timeout
        await Promise.race([
          extractorWindow.loadURL(validUrl.href),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Page load timeout')), safeTimeout))
        ]);

        // Wait a bit for dynamic content to load
        await new Promise(resolve => setTimeout(resolve, Math.min(safeTimeout / 3, 2000)));

        // Enhanced context extraction with security
        const contextData = await extractorWindow.webContents.executeJavaScript(`
          (function() {
            // Helper function to check if element is visible
            const isVisible = (element) => {
              const style = window.getComputedStyle(element);
              return style.display !== 'none' && 
                     style.visibility !== 'hidden' && 
                     style.opacity !== '0' &&
                     element.offsetWidth > 0 && 
                     element.offsetHeight > 0;
            };

            // Extract main content text
            const extractMainContent = () => {
              // Try to find main content area
              const contentSelectors = [
                'main',
                '[role="main"]',
                'article',
                '.content',
                '.main-content',
                '#content',
                '#main'
              ];

              let mainElement = document.body;
              for (const selector of contentSelectors) {
                const element = document.querySelector(selector);
                if (element && isVisible(element)) {
                  mainElement = element;
                  break;
                }
              }

              // Extract text while preserving structure
              const extractText = (element, depth = 0) => {
                if (depth > 10 || !element) return ''; // Prevent infinite recursion
                
                // Skip non-content elements
                const tagName = element.tagName?.toLowerCase();
                if (['script', 'style', 'nav', 'header', 'footer', 'aside', 'advertisement'].includes(tagName)) {
                  return '';
                }

                let text = '';
                for (const child of element.childNodes) {
                  if (child.nodeType === Node.TEXT_NODE) {
                    const textContent = child.textContent.trim();
                    if (textContent.length > 0) {
                      text += textContent + ' ';
                    }
                  } else if (child.nodeType === Node.ELEMENT_NODE && isVisible(child)) {
                    // Add spacing for block elements
                    const childTag = child.tagName.toLowerCase();
                    if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'].includes(childTag)) {
                      text += extractText(child, depth + 1) + '\\n';
                    } else {
                      text += extractText(child, depth + 1);
                    }
                  }
                }
                return text;
              };

              return extractText(mainElement).replace(/\\s+/g, ' ').trim();
            };

            // Extract metadata
            const extractMetadata = () => {
              const metadata = {};
              
              // Get meta tags
              const metaTags = document.querySelectorAll('meta');
              metaTags.forEach(meta => {
                const name = meta.getAttribute('name') || meta.getAttribute('property');
                const content = meta.getAttribute('content');
                if (name && content) {
                  metadata[name] = content;
                }
              });

              return metadata;
            };

            // Extract headings for structure
            const extractHeadings = () => {
              const headings = [];
              const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
              
              headingElements.forEach(heading => {
                if (isVisible(heading) && heading.textContent.trim()) {
                  headings.push({
                    level: parseInt(heading.tagName.charAt(1)),
                    text: heading.textContent.trim()
                  });
                }
              });

              return headings.slice(0, 20); // Limit to first 20 headings
            };

            // Extract key links
            const extractLinks = () => {
              const links = [];
              const linkElements = document.querySelectorAll('a[href]');
              
              linkElements.forEach(link => {
                if (isVisible(link) && link.textContent.trim() && link.href) {
                  links.push({
                    text: link.textContent.trim(),
                    href: link.href
                  });
                }
              });

              return links.slice(0, 15); // Limit to first 15 links
            };

            // Compile all extracted data with size limits
            const maxContentLength = ${options.maxContentLength || 8000};
            return {
              title: (document.title || '').slice(0, 200),
              url: window.location.href,
              content: extractMainContent().slice(0, maxContentLength),
              metadata: extractMetadata(),
              headings: extractHeadings(),
              links: extractLinks(),
              lang: document.documentElement.lang || 'en',
              charset: document.characterSet || 'UTF-8',
              lastModified: document.lastModified,
              timestamp: new Date().toISOString()
            };
          })();
        `);

        // Format the extracted context for AI consumption
        const formattedContext = {
          source: {
            title: contextData.title,
            url: contextData.url,
            domain: validUrl.hostname,
            extractedAt: contextData.timestamp
          },
          content: {
            mainText: contextData.content,
            summary: contextData.metadata.description || '',
            keywords: contextData.metadata.keywords || '',
            author: contextData.metadata.author || '',
            language: contextData.lang
          },
          structure: {
            headings: contextData.headings,
            keyLinks: contextData.links.slice(0, 5)
          },
          metadata: contextData.metadata
        };

        // Create AI-friendly context string
        const aiContext = `
**Website Information:**
Title: ${formattedContext.source.title}
URL: ${formattedContext.source.url}
Domain: ${formattedContext.source.domain}
Language: ${formattedContext.content.language}

**Page Summary:**
${formattedContext.content.summary}

**Main Content:**
${formattedContext.content.mainText}

**Page Structure:**
${formattedContext.structure.headings.map(h => `${'#'.repeat(h.level)} ${h.text}`).join('\\n')}

**Key Links:**
${formattedContext.structure.keyLinks.map(link => `- [${link.text}](${link.href})`).join('\\n')}

**Keywords:** ${formattedContext.content.keywords}
**Author:** ${formattedContext.content.author}
        `.trim();

        safeInfo(`Context extracted successfully from ${validUrl.hostname}`);

        return {
          success: true,
          context: aiContext,
          rawData: formattedContext,
          wordCount: formattedContext.content.mainText.split(' ').length,
          extractedAt: contextData.timestamp
        };

      } finally {
        // Always close the extractor window
        extractorWindow.close();
      }

    } catch (error: any) {
      safeError('❌ browser-extract-context error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get browser security settings
   */
  ipcMain.handle('browser-get-security-info', async (_, sessionId: string) => {
    try {
      if (typeof sessionId !== 'string' || !sessionId.trim()) {
        return { success: false, error: 'Session ID must be a non-empty string' };
      }

      const sanitizedSessionId = security.sanitizeInput(sessionId.trim());
      
      return {
        success: true,
        security: {
          sessionId: sanitizedSessionId,
          webSecurity: true,
          contextIsolation: true,
          nodeIntegration: false,
          allowedProtocols: ['http:', 'https:'],
          blockedProtocols: ['file:', 'ftp:', 'data:'],
          permissions: {
            media: 'ask',
            geolocation: 'ask',
            notifications: 'ask',
            fullscreen: 'allow'
          }
        }
      };
    } catch (error: any) {
      safeError('❌ browser-get-security-info error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Clear browser data for a session
   */
  ipcMain.handle('browser-clear-data', async (_, sessionId: string, dataTypes: string[] = []) => {
    try {
      if (typeof sessionId !== 'string' || !sessionId.trim()) {
        return { success: false, error: 'Session ID must be a non-empty string' };
      }

      const sanitizedSessionId = security.sanitizeInput(sessionId.trim());
      const browserSession = session.fromPartition(`persist:browser-${sanitizedSessionId}`);

      // Default data types to clear - use proper Electron storage types
      const defaultDataTypes: ("cookies" | "filesystem" | "indexdb" | "localstorage" | "shadercache" | "websql" | "serviceworkers" | "cachestorage")[] = 
        ['cookies', 'localstorage', 'cachestorage', 'serviceworkers'];
      
      // Map input types to valid Electron storage types
      const validStorageTypes = new Set(['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']);
      const typesToClear = dataTypes.length > 0 
        ? dataTypes.filter(type => validStorageTypes.has(type as any)) as ("cookies" | "filesystem" | "indexdb" | "localstorage" | "shadercache" | "websql" | "serviceworkers" | "cachestorage")[]
        : defaultDataTypes;

      // Clear specified data types
      await browserSession.clearStorageData({
        storages: typesToClear
      });

      safeInfo(`Browser data cleared for session: ${sanitizedSessionId}`);
      
      return { success: true, clearedTypes: typesToClear };
    } catch (error: any) {
      safeError('❌ browser-clear-data error:', error);
      return { success: false, error: error.message };
    }
  });

  safeLog('✅ Browser handlers registered');
}
