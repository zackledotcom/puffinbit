import { ipcMain } from 'electron'
import { avatarService } from '@services/avatarService'

export function registerAvatarHandlers() {
  // Get model avatar data
  ipcMain.handle('get-model-avatar', async (event, modelName: string) => {
    try {
      return avatarService.getModelAvatar(modelName)
    } catch (error) {
      console.error('Failed to get model avatar:', error)
      throw error
    }
  })

  // Upload model avatar
  ipcMain.handle(
    'upload-model-avatar',
    async (event, modelName: string, imageBuffer: Uint8Array, originalName: string) => {
      try {
        const buffer = Buffer.from(imageBuffer)
        const avatarPath = await avatarService.uploadAvatar(modelName, buffer, originalName)
        return { success: true, avatarPath }
      } catch (error) {
        console.error('Failed to upload model avatar:', error)
        throw error
      }
    }
  )

  // Remove model avatar
  ipcMain.handle('remove-model-avatar', async (event, modelName: string) => {
    try {
      await avatarService.removeAvatar(modelName)
      return { success: true }
    } catch (error) {
      console.error('Failed to remove model avatar:', error)
      throw error
    }
  })

  // Get all avatars
  ipcMain.handle('get-all-avatars', async () => {
    try {
      return avatarService.getAllAvatars()
    } catch (error) {
      console.error('Failed to get all avatars:', error)
      throw error
    }
  })

  console.log('✅ Avatar handlers registered successfully')
}
