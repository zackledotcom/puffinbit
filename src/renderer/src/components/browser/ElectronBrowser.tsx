/**
 * Electron Web Browser Component
 * Integrates with Electron's webview for full browser functionality
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  Shield, 
  ShieldWarning,
  Globe,
  Lightning
} from 'phosphor-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { safeLog, safeError } from '../../../utils/safeLogger';

interface ElectronBrowserProps {
  initialUrl?: string;
  onContextExtracted?: (context: string) => void;
  onNavigate?: (url: string, title: string) => void;
  className?: string;
}

interface PageContext {
  title: string;
  url: string;
  content: string;
  images: string[];
  links: string[];
  metadata: Record<string, string>;
}

const ElectronBrowser: React.FC<ElectronBrowserProps> = ({
  initialUrl = 'https://www.google.com',
  onContextExtracted,
  onNavigate,
  className = ''
}) => {
  const webviewRef = useRef<any>(null);
  const [url, setUrl] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [pageTitle, setPageTitle] = useState('Loading...');
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isSecure, setIsSecure] = useState(false);
  const [extracting, setExtracting] = useState(false);

  // Initialize webview event listeners
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleLoadStop = () => {
      setIsLoading(false);
      setCanGoBack(webview.canGoBack());
      setCanGoForward(webview.canGoForward());
    };

    const handlePageTitleUpdated = (event: any) => {
      const title = event.title;
      setPageTitle(title);
      onNavigate?.(currentUrl, title);
    };

    const handleUrlChange = (event: any) => {
      const newUrl = event.url;
      setCurrentUrl(newUrl);
      setIsSecure(newUrl.startsWith('https://'));
      onNavigate?.(newUrl, pageTitle);
    };

    const handleConsoleMessage = (event: any) => {
      // Log webview console messages for debugging
      safeLog('Webview Console:', event.message);
    };

    const handleNewWindow = (event: any) => {
      // Handle new window requests - open in same webview
      event.preventDefault();
      webview.loadURL(event.url);
    };

    // Add event listeners
    webview.addEventListener('did-start-loading', handleLoadStart);
    webview.addEventListener('did-stop-loading', handleLoadStop);
    webview.addEventListener('page-title-updated', handlePageTitleUpdated);
    webview.addEventListener('did-navigate', handleUrlChange);
    webview.addEventListener('did-navigate-in-page', handleUrlChange);
    webview.addEventListener('console-message', handleConsoleMessage);
    webview.addEventListener('new-window', handleNewWindow);

    // Cleanup
    return () => {
      webview.removeEventListener('did-start-loading', handleLoadStart);
      webview.removeEventListener('did-stop-loading', handleLoadStop);
      webview.removeEventListener('page-title-updated', handlePageTitleUpdated);
      webview.removeEventListener('did-navigate', handleUrlChange);
      webview.removeEventListener('did-navigate-in-page', handleUrlChange);
      webview.removeEventListener('console-message', handleConsoleMessage);
      webview.removeEventListener('new-window', handleNewWindow);
    };
  }, [currentUrl, pageTitle, onNavigate]);

  // Navigation handlers
  const handleNavigate = useCallback((targetUrl: string) => {
    if (!targetUrl.trim()) return;
    
    let formattedUrl = targetUrl.trim();
    
    // Add protocol if missing
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      // Check if it's a search query or domain
      if (formattedUrl.includes(' ') || (!formattedUrl.includes('.') && !formattedUrl.includes('localhost'))) {
        // Treat as search query
        formattedUrl = `https://www.google.com/search?q=${encodeURIComponent(formattedUrl)}`;
      } else {
        // Treat as domain
        formattedUrl = `https://${formattedUrl}`;
      }
    }

    setUrl(formattedUrl);
    setCurrentUrl(formattedUrl);
    
    if (webviewRef.current) {
      webviewRef.current.loadURL(formattedUrl);
    }
  }, []);

  const handleGoBack = () => {
    if (webviewRef.current && canGoBack) {
      webviewRef.current.goBack();
    }
  };

  const handleGoForward = () => {
    if (webviewRef.current && canGoForward) {
      webviewRef.current.goForward();
    }
  };

  const handleRefresh = () => {
    if (webviewRef.current) {
      webviewRef.current.reload();
    }
  };

  // Context extraction
  const extractPageContext = useCallback(async () => {
    if (!webviewRef.current) return;

    setExtracting(true);

    try {
      // Execute JavaScript in the webview to extract content
      const contextScript = `
        (function() {
          const getVisibleText = (element) => {
            const style = window.getComputedStyle(element);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   style.opacity !== '0';
          };

          const extractText = (element) => {
            if (!getVisibleText(element)) return '';
            
            // Skip script, style, and other non-content elements
            const tagName = element.tagName.toLowerCase();
            if (['script', 'style', 'nav', 'header', 'footer', 'aside'].includes(tagName)) {
              return '';
            }

            let text = '';
            for (const child of element.childNodes) {
              if (child.nodeType === Node.TEXT_NODE) {
                text += child.textContent.trim() + ' ';
              } else if (child.nodeType === Node.ELEMENT_NODE) {
                text += extractText(child);
              }
            }
            return text;
          };

          // Extract main content
          const mainContent = document.querySelector('main') || 
                            document.querySelector('[role="main"]') ||
                            document.querySelector('article') ||
                            document.body;

          const content = extractText(mainContent).replace(/\\s+/g, ' ').trim();

          // Extract metadata
          const metaTags = Array.from(document.querySelectorAll('meta'));
          const metadata = {};
          metaTags.forEach(meta => {
            const name = meta.getAttribute('name') || meta.getAttribute('property');
            const content = meta.getAttribute('content');
            if (name && content) {
              metadata[name] = content;
            }
          });

          // Extract images and links
          const images = Array.from(document.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => src && !src.startsWith('data:'))
            .slice(0, 10); // Limit to first 10 images

          const links = Array.from(document.querySelectorAll('a[href]'))
            .map(link => ({
              text: link.textContent.trim(),
              href: link.href
            }))
            .filter(link => link.text && link.href)
            .slice(0, 20); // Limit to first 20 links

          return {
            title: document.title,
            url: window.location.href,
            content: content.slice(0, 5000), // Limit content length
            images: images,
            links: links,
            metadata: metadata
          };
        })();
      `;

      const result = await webviewRef.current.executeJavaScript(contextScript);
      
      // Format the context for AI consumption
      const formattedContext = `
**Page Information:**
Title: ${result.title}
URL: ${result.url}

**Content Summary:**
${result.content}

**Key Links:**
${result.links.slice(0, 5).map(link => `- ${link.text}: ${link.href}`).join('\n')}

**Images:**
${result.images.slice(0, 3).join('\n')}

**Metadata:**
${Object.entries(result.metadata)
  .filter(([key]) => ['description', 'keywords', 'author'].includes(key))
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n')}
      `.trim();

      onContextExtracted?.(formattedContext);
      safeLog('Context extracted successfully:', result);

    } catch (error) {
      safeError('Failed to extract page context:', error);
    } finally {
      setExtracting(false);
    }
  }, [onContextExtracted]);

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Browser Controls */}
      <div className="flex items-center space-x-2 p-2 bg-gray-50 border-b border-gray-200">
        {/* Navigation Buttons */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGoBack}
          disabled={!canGoBack}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGoForward}
          disabled={!canGoForward}
          className="p-2"
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-2"
        >
          <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>

        {/* URL Bar */}
        <div className="flex-1 flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            {isSecure ? (
              <Shield className="w-4 h-4 text-green-600" />
            ) : (
              <ShieldWarning className="w-4 h-4 text-yellow-600" />
            )}
          </div>
          
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleNavigate(url)}
            placeholder="Enter URL or search..."
            className="flex-1 text-sm"
          />
          
          <Button
            onClick={() => handleNavigate(url)}
            disabled={isLoading}
            size="sm"
          >
            Go
          </Button>
        </div>

        {/* Context Extract Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={extractPageContext}
          disabled={extracting || isLoading}
          className="flex items-center space-x-1"
        >
          {extracting ? (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Lightning className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Extract</span>
        </Button>
      </div>

      {/* Loading Bar */}
      {isLoading && (
        <div className="h-1 bg-gray-200">
          <motion.div
            className="h-full bg-blue-600"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Page Info Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
        <div className="flex items-center space-x-2">
          <Globe className="w-3 h-3" />
          <span className="truncate max-w-xs">{pageTitle}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {isSecure && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              Secure
            </Badge>
          )}
          <span>{isLoading ? 'Loading...' : 'Ready'}</span>
        </div>
      </div>

      {/* Webview Container */}
      <div className="flex-1 relative">
        <webview
          ref={webviewRef}
          src={initialUrl}
          className="w-full h-full"
          nodeintegration="false"
          webpreferences="contextIsolation=true"
          allowpopups="false"
          // Security settings
          disablewebsecurity="false"
          partition="persist:browser-session"
        />
      </div>
    </div>
  );
};

export default ElectronBrowser;