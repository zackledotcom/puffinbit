import fs from 'fs/promises'
import { spawn, exec } from 'child_process'
import path from 'path'
import { app, dialog } from 'electron'

// File system IPC handlers for Developer Mode
export function registerFileSystemHandlers(ipcMain: any) {
  // Read file contents
  ipcMain.handle(
    'fs-read-file',
    async (
      _,
      filePath: string
    ): Promise<{ success: boolean; content?: string; error?: string }> => {
      try {
        console.log('📂 Reading file:', filePath)
        const content = await fs.readFile(filePath, 'utf-8')
        return { success: true, content }
      } catch (error) {
        console.error('❌ Failed to read file:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )

  // Write file contents
  ipcMain.handle(
    'fs-write-file',
    async (_, filePath: string, content: string): Promise<{ success: boolean; error?: string }> => {
      try {
        console.log('💾 Writing file:', filePath)
        // Ensure directory exists
        const dir = path.dirname(filePath)
        await fs.mkdir(dir, { recursive: true })
        await fs.writeFile(filePath, content, 'utf-8')
        return { success: true }
      } catch (error) {
        console.error('❌ Failed to write file:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )

  // List directory contents
  ipcMain.handle(
    'fs-list-directory',
    async (_, dirPath: string): Promise<{ success: boolean; files?: any[]; error?: string }> => {
      try {
        console.log('📁 Listing directory:', dirPath)
        const items = await fs.readdir(dirPath, { withFileTypes: true })
        const files = items.map((item) => ({
          name: item.name,
          isDirectory: item.isDirectory(),
          isFile: item.isFile(),
          path: path.join(dirPath, item.name)
        }))
        return { success: true, files }
      } catch (error) {
        console.error('❌ Failed to list directory:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )

  // Create new file
  ipcMain.handle(
    'fs-create-file',
    async (
      _,
      filePath: string,
      content: string = ''
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        console.log('📄 Creating file:', filePath)
        const dir = path.dirname(filePath)
        await fs.mkdir(dir, { recursive: true })
        await fs.writeFile(filePath, content, 'utf-8')
        return { success: true }
      } catch (error) {
        console.error('❌ Failed to create file:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )

  // Create new directory
  ipcMain.handle(
    'fs-create-directory',
    async (_, dirPath: string): Promise<{ success: boolean; error?: string }> => {
      try {
        console.log('📁 Creating directory:', dirPath)
        await fs.mkdir(dirPath, { recursive: true })
        return { success: true }
      } catch (error) {
        console.error('❌ Failed to create directory:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )

  // Rename file or directory
  ipcMain.handle(
    'fs-rename',
    async (_, oldPath: string, newPath: string): Promise<{ success: boolean; error?: string }> => {
      try {
        console.log(`Renaming ${oldPath} to ${newPath}`)
        await fs.rename(oldPath, newPath)
        return { success: true }
      } catch (error) {
        console.error('❌ Failed to rename:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )

  // Copy file or directory
  ipcMain.handle(
    'fs-copy',
    async (_, source: string, destination: string): Promise<{ success: boolean; error?: string }> => {
      try {
        console.log(`Copying ${source} to ${destination}`)
        await fs.cp(source, destination, { recursive: true })
        return { success: true }
      } catch (error) {
        console.error('❌ Failed to copy:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )

  // Delete file or directory
  ipcMain.handle(
    'fs-delete',
    async (_, itemPath: string): Promise<{ success: boolean; error?: string }> => {
      try {
        console.log('🗑️ Deleting:', itemPath)
        const stats = await fs.stat(itemPath)
        if (stats.isDirectory()) {
          await fs.rm(itemPath, { recursive: true, force: true })
        } else {
          await fs.unlink(itemPath)
        }
        return { success: true }
      } catch (error) {
        console.error('❌ Failed to delete:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )

  // Execute terminal command
  ipcMain.handle(
    'fs-execute-command',
    async (
      _,
      command: string,
      cwd?: string
    ): Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }> => {
      try {
        console.log('⚡ Executing command:', command)

        return new Promise((resolve) => {
          const workingDir = cwd || app.getPath('home')

          exec(command, { cwd: workingDir }, (error, stdout, stderr) => {
            if (error) {
              console.error('❌ Command failed:', error)
              resolve({
                success: false,
                error: error.message,
                stderr: stderr
              })
            } else {
              console.log('✅ Command executed successfully')
              resolve({
                success: true,
                stdout: stdout.trim(),
                stderr: stderr.trim()
              })
            }
          })
        })
      } catch (error) {
        console.error('❌ Failed to execute command:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )

  // Open file dialog
  ipcMain.handle(
    'fs-open-file-dialog',
    async (): Promise<{ success: boolean; filePath?: string; error?: string }> => {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openFile'],
          filters: [
            { name: 'All Files', extensions: ['*'] },
            { name: 'JavaScript', extensions: ['js', 'jsx'] },
            { name: 'TypeScript', extensions: ['ts', 'tsx'] },
            { name: 'Python', extensions: ['py'] },
            { name: 'Text Files', extensions: ['txt', 'md'] },
            { name: 'JSON', extensions: ['json'] },
            { name: 'CSS', extensions: ['css'] },
            { name: 'HTML', extensions: ['html'] }
          ]
        })

        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, error: 'File selection cancelled' }
        }

        return { success: true, filePath: result.filePaths[0] }
      } catch (error) {
        console.error('❌ Failed to open file dialog:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )

  // Save file dialog
  ipcMain.handle(
    'fs-save-file-dialog',
    async (
      _,
      defaultName?: string,
      content?: string
    ): Promise<{ success: boolean; filePath?: string; error?: string }> => {
      try {
        const result = await dialog.showSaveDialog({
          defaultPath: defaultName || 'untitled.txt',
          filters: [
            { name: 'All Files', extensions: ['*'] },
            { name: 'JavaScript', extensions: ['js'] },
            { name: 'TypeScript', extensions: ['ts'] },
            { name: 'Python', extensions: ['py'] },
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'JSON', extensions: ['json'] },
            { name: 'CSS', extensions: ['css'] },
            { name: 'HTML', extensions: ['html'] }
          ]
        })

        if (result.canceled || !result.filePath) {
          return { success: false, error: 'Save cancelled' }
        }

        // If content provided, write the file
        if (content !== undefined) {
          await fs.writeFile(result.filePath, content, 'utf-8')
        }

        return { success: true, filePath: result.filePath }
      } catch (error) {
        console.error('❌ Failed to save file:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )

  // Get file info
  ipcMain.handle(
    'fs-get-file-info',
    async (_, filePath: string): Promise<{ success: boolean; info?: any; error?: string }> => {
      try {
        const stats = await fs.stat(filePath)
        const info = {
          size: stats.size,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          created: stats.birthtime,
          modified: stats.mtime,
          path: filePath,
          name: path.basename(filePath),
          extension: path.extname(filePath)
        }
        return { success: true, info }
      } catch (error) {
        console.error('❌ Failed to get file info:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )
}
