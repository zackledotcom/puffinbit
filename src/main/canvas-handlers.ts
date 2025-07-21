
import { ipcMain, dialog } from 'electron';
import fs from 'fs-extra';
import path from 'path';

const listFilesRecursive = async (dir: string): Promise<any> => {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map(async (dirent) => {
      const res = path.resolve(dir, dirent.name);
      if (dirent.isDirectory()) {
        return { name: dirent.name, type: 'folder', children: await listFilesRecursive(res) };
      } else {
        return { name: dirent.name, type: 'file' };
      }
    })
  );
  return files;
};

ipcMain.handle('canvas:listFiles', async (event, dirPath) => {
  try {
    // Basic validation to prevent listing sensitive directories
    if (!dirPath || !path.isAbsolute(dirPath)) {
      throw new Error('Invalid path provided for listFiles.');
    }
    // Further security: ensure path is within a designated project directory if applicable
    // For now, assuming dirPath is safe as it comes from renderer
    return await listFilesRecursive(dirPath);
  } catch (error) {
    console.error('Failed to list files:', error);
    return null;
  }
});

ipcMain.handle('canvas:readFile', async (event, filePath) => {
  try {
    if (!filePath || !path.isAbsolute(filePath)) {
      throw new Error('Invalid path provided for readFile.');
    }
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to read file: ${filePath}`, error);
    return null;
  }
});

ipcMain.handle('canvas:writeFile', async (event, filePath, content) => {
  try {
    if (!filePath || !path.isAbsolute(filePath)) {
      throw new Error('Invalid path provided for writeFile.');
    }
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    console.error(`Failed to write file: ${filePath}`, error);
  }
});

ipcMain.handle('canvas:createFile', async (event, filePath) => {
  try {
    if (!filePath || !path.isAbsolute(filePath)) {
      throw new Error('Invalid path provided for createFile.');
    }
    await fs.createFile(filePath);
  } catch (error) {
    console.error(`Failed to create file: ${filePath}`, error);
  }
});

ipcMain.handle('canvas:createFolder', async (event, folderPath) => {
  try {
    if (!folderPath || !path.isAbsolute(folderPath)) {
      throw new Error('Invalid path provided for createFolder.');
    }
    await fs.ensureDir(folderPath);
  } catch (error) {
    console.error(`Failed to create folder: ${folderPath}`, error);
  }
});

ipcMain.handle('canvas:delete', async (event, itemPath) => {
  try {
    if (!itemPath || !path.isAbsolute(itemPath)) {
      throw new Error('Invalid path provided for delete.');
    }
    await fs.remove(itemPath);
  } catch (error) {
    console.error(`Failed to delete: ${itemPath}`, error);
  }
});

ipcMain.handle('canvas:rename', async (event, oldPath, newName) => {
  try {
    if (!oldPath || !path.isAbsolute(oldPath) || !newName) {
      throw new Error('Invalid paths provided for rename.');
    }
    const newPath = path.join(path.dirname(oldPath), newName);
    await fs.rename(oldPath, newPath);
  } catch (error) {
    console.error(`Failed to rename: ${oldPath}`, error);
  }
});

ipcMain.handle('canvas:uploadFiles', async (event) => {
    const { filePaths } = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections']
    });

    return filePaths;
});
