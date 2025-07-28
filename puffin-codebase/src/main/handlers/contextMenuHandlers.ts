import { ipcMain, Menu, BrowserWindow, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs/promises'

interface ContextMenuData {
  x: number
  y: number
  filePath: string
  isDirectory: boolean
  fileName: string
}

// File operations service
class FileOperationsService {
  async createFile(dirPath: string, fileName: string, content: string = ''): Promise<{ success: boolean; error?: string }> {
    try {
      const filePath = path.join(dirPath, fileName)
      await fs.writeFile(filePath, content, 'utf8')
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async createFolder(dirPath: string, folderName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const folderPath = path.join(dirPath, folderName)
      await fs.mkdir(folderPath, { recursive: true })
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async deleteItem(itemPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const stats = await fs.stat(itemPath)
      if (stats.isDirectory()) {
        await fs.rmdir(itemPath, { recursive: true })
      } else {
        await fs.unlink(itemPath)
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async renameItem(oldPath: string, newPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      await fs.rename(oldPath, newPath)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async copyItem(sourcePath: string, destPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const stats = await fs.stat(sourcePath)
      if (stats.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath)
      } else {
        await fs.copyFile(sourcePath, destPath)
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath)
      } else {
        await fs.copyFile(srcPath, destPath)
      }
    }
  }
}

const fileOperationsService = new FileOperationsService()

// Clipboard for file operations
interface ClipboardItem {
  path: string
  operation: 'cut' | 'copy'
}

let clipboard: ClipboardItem[] = []

export function registerContextMenuHandlers() {
  // Handle context menu requests from renderer
  ipcMain.on('show-context-menu', (event, data: ContextMenuData) => {
    const { x, y, filePath, isDirectory, fileName } = data
    
    const template = isDirectory ? getFolderMenuTemplate(event, filePath, fileName) : getFileMenuTemplate(event, filePath, fileName)
    
    const menu = Menu.buildFromTemplate(template)
    const window = BrowserWindow.fromWebContents(event.sender)
    
    if (window) {
      menu.popup({ window, x, y })
    }
  })

  // File operations IPC handlers
  ipcMain.handle('file-operations:create-file', async (event, dirPath: string, fileName: string, content?: string) => {
    return await fileOperationsService.createFile(dirPath, fileName, content)
  })

  ipcMain.handle('file-operations:create-folder', async (event, dirPath: string, folderName: string) => {
    return await fileOperationsService.createFolder(dirPath, folderName)
  })

  ipcMain.handle('file-operations:delete', async (event, itemPath: string) => {
    return await fileOperationsService.deleteItem(itemPath)
  })

  ipcMain.handle('file-operations:rename', async (event, oldPath: string, newPath: string) => {
    return await fileOperationsService.renameItem(oldPath, newPath)
  })

  ipcMain.handle('file-operations:copy', async (event, sourcePath: string, destPath: string) => {
    return await fileOperationsService.copyItem(sourcePath, destPath)
  })

  // Clipboard operations
  ipcMain.handle('clipboard:cut', async (event, paths: string[]) => {
    clipboard = paths.map(path => ({ path, operation: 'cut' }))
    return { success: true }
  })

  ipcMain.handle('clipboard:copy', async (event, paths: string[]) => {
    clipboard = paths.map(path => ({ path, operation: 'copy' }))
    return { success: true }
  })

  ipcMain.handle('clipboard:paste', async (event, destPath: string) => {
    try {
      for (const item of clipboard) {
        const fileName = path.basename(item.path)
        const targetPath = path.join(destPath, fileName)
        
        if (item.operation === 'copy') {
          await fileOperationsService.copyItem(item.path, targetPath)
        } else if (item.operation === 'cut') {
          await fileOperationsService.renameItem(item.path, targetPath)
        }
      }
      
      // Clear clipboard after paste
      if (clipboard.some(item => item.operation === 'cut')) {
        clipboard = []
      }
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('clipboard:can-paste', async (event) => {
    return { canPaste: clipboard.length > 0 }
  })
}

function getFileMenuTemplate(event: Electron.IpcMainEvent, filePath: string, fileName: string): Electron.MenuItemConstructorOptions[] {
  const parentDir = path.dirname(filePath)
  
  return [
    {
      label: 'Open',
      accelerator: 'Enter',
      click: () => {
        event.sender.send('context-menu-command', 'open-file', { filePath })
      }
    },
    {
      label: 'Open With...',
      submenu: [
        {
          label: 'System Default',
          click: () => {
            shell.openPath(filePath)
          }
        },
        {
          label: 'External Editor',
          click: () => {
            event.sender.send('context-menu-command', 'open-external', { filePath })
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Cut',
      accelerator: process.platform === 'darwin' ? 'Cmd+X' : 'Ctrl+X',
      click: () => {
        event.sender.send('context-menu-command', 'cut', { paths: [filePath] })
      }
    },
    {
      label: 'Copy',
      accelerator: process.platform === 'darwin' ? 'Cmd+C' : 'Ctrl+C',
      click: () => {
        event.sender.send('context-menu-command', 'copy', { paths: [filePath] })
      }
    },
    {
      label: 'Paste',
      accelerator: process.platform === 'darwin' ? 'Cmd+V' : 'Ctrl+V',
      enabled: clipboard.length > 0,
      click: () => {
        event.sender.send('context-menu-command', 'paste', { destPath: parentDir })
      }
    },
    { type: 'separator' },
    {
      label: 'Rename',
      accelerator: 'F2',
      click: () => {
        event.sender.send('context-menu-command', 'rename', { filePath, fileName })
      }
    },
    {
      label: 'Delete',
      accelerator: 'Delete',
      click: async () => {
        const window = BrowserWindow.fromWebContents(event.sender)
        if (window) {
          const result = await dialog.showMessageBox(window, {
            type: 'warning',
            title: 'Delete File',
            message: `Are you sure you want to delete "${fileName}"?`,
            detail: 'This action cannot be undone.',
            buttons: ['Delete', 'Cancel'],
            defaultId: 1,
            cancelId: 1
          })
          
          if (result.response === 0) {
            event.sender.send('context-menu-command', 'delete', { filePath })
          }
        }
      }
    },
    { type: 'separator' },
    {
      label: '🤖 Add to AI Context',
      sublabel: 'Send file to AI assistant',
      click: () => {
        event.sender.send('context-menu-command', 'add-to-ai-context', { 
          filePath, 
          fileName,
          type: 'file'
        })
      }
    },
    { type: 'separator' },
    {
      label: 'Properties',
      click: () => {
        event.sender.send('context-menu-command', 'show-properties', { filePath })
      }
    }
  ]
}

function getFolderMenuTemplate(event: Electron.IpcMainEvent, folderPath: string, folderName: string): Electron.MenuItemConstructorOptions[] {
  return [
    {
      label: 'Open',
      accelerator: 'Enter',
      click: () => {
        event.sender.send('context-menu-command', 'open-folder', { folderPath })
      }
    },
    {
      label: 'Open in System Explorer',
      click: () => {
        shell.openPath(folderPath)
      }
    },
    {
      label: 'Open in Terminal',
      accelerator: process.platform === 'darwin' ? 'Cmd+T' : 'Ctrl+Shift+`',
      click: () => {
        event.sender.send('context-menu-command', 'open-terminal', { folderPath })
      }
    },
    { type: 'separator' },
    {
      label: 'New File',
      accelerator: process.platform === 'darwin' ? 'Cmd+N' : 'Ctrl+N',
      click: () => {
        event.sender.send('context-menu-command', 'new-file', { parentPath: folderPath })
      }
    },
    {
      label: 'New Folder',
      accelerator: process.platform === 'darwin' ? 'Cmd+Shift+N' : 'Ctrl+Shift+N',
      click: () => {
        event.sender.send('context-menu-command', 'new-folder', { parentPath: folderPath })
      }
    },
    { type: 'separator' },
    {
      label: 'Cut',
      accelerator: process.platform === 'darwin' ? 'Cmd+X' : 'Ctrl+X',
      click: () => {
        event.sender.send('context-menu-command', 'cut', { paths: [folderPath] })
      }
    },
    {
      label: 'Copy',
      accelerator: process.platform === 'darwin' ? 'Cmd+C' : 'Ctrl+C',
      click: () => {
        event.sender.send('context-menu-command', 'copy', { paths: [folderPath] })
      }
    },
    {
      label: 'Paste',
      accelerator: process.platform === 'darwin' ? 'Cmd+V' : 'Ctrl+V',
      enabled: clipboard.length > 0,
      click: () => {
        event.sender.send('context-menu-command', 'paste', { destPath: folderPath })
      }
    },
    { type: 'separator' },
    {
      label: 'Rename',
      accelerator: 'F2',
      click: () => {
        event.sender.send('context-menu-command', 'rename', { filePath: folderPath, fileName: folderName })
      }
    },
    {
      label: 'Delete',
      accelerator: 'Delete',
      click: async () => {
        const window = BrowserWindow.fromWebContents(event.sender)
        if (window) {
          const result = await dialog.showMessageBox(window, {
            type: 'warning',
            title: 'Delete Folder',
            message: `Are you sure you want to delete "${folderName}" and all its contents?`,
            detail: 'This action cannot be undone.',
            buttons: ['Delete', 'Cancel'],
            defaultId: 1,
            cancelId: 1
          })
          
          if (result.response === 0) {
            event.sender.send('context-menu-command', 'delete', { filePath: folderPath })
          }
        }
      }
    },
    { type: 'separator' },
    {
      label: '🤖 Scan Folder for AI',
      sublabel: 'Add relevant files to AI context',
      click: () => {
        event.sender.send('context-menu-command', 'scan-for-ai', { 
          folderPath, 
          folderName,
          type: 'folder'
        })
      }
    },
    { type: 'separator' },
    {
      label: 'Properties',
      click: () => {
        event.sender.send('context-menu-command', 'show-properties', { filePath: folderPath })
      }
    }
  ]
}
