import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs/promises'

export interface ModelAvatar {
  modelName: string
  avatarPath?: string
  initials: string
  uploadedAt?: Date
}

class AvatarService {
  private avatarsDir: string
  private avatarsConfig: ModelAvatar[]

  constructor() {
    this.avatarsDir = path.join(app.getPath('userData'), 'avatars')
    this.avatarsConfig = []
    this.init()
  }

  private async init() {
    try {
      // Ensure avatars directory exists
      await fs.mkdir(this.avatarsDir, { recursive: true })

      // Load existing avatar configuration
      await this.loadAvatarConfig()
    } catch (error) {
      console.error('Failed to initialize avatar service:', error)
    }
  }

  private async loadAvatarConfig() {
    try {
      const configPath = path.join(app.getPath('userData'), 'avatars-config.json')
      const configData = await fs.readFile(configPath, 'utf-8')
      this.avatarsConfig = JSON.parse(configData)
    } catch (error) {
      // Config doesn't exist yet, start with empty array
      this.avatarsConfig = []
    }
  }

  private async saveAvatarConfig() {
    try {
      const configPath = path.join(app.getPath('userData'), 'avatars-config.json')
      await fs.writeFile(configPath, JSON.stringify(this.avatarsConfig, null, 2))
    } catch (error) {
      console.error('Failed to save avatar config:', error)
    }
  }

  private generateInitials(modelName: string): string {
    // Handle common model names
    const cleanName = modelName.replace(':latest', '').toLowerCase()

    if (cleanName.includes('tinydolphin') || cleanName.includes('tiny-dolphin')) return 'TD'
    if (cleanName.includes('deepseek')) return 'DS'
    if (cleanName.includes('openchat')) return 'OC'
    if (cleanName.includes('phi4') || cleanName.includes('phi-4')) return 'P4'
    if (cleanName.includes('phi3') || cleanName.includes('phi-3')) return 'P3'
    if (cleanName.includes('llama3') || cleanName.includes('llama-3')) return 'L3'
    if (cleanName.includes('llama2') || cleanName.includes('llama-2')) return 'L2'
    if (cleanName.includes('codellama')) return 'CL'
    if (cleanName.includes('mistral')) return 'MS'
    if (cleanName.includes('gemma')) return 'GM'
    if (cleanName.includes('qwen')) return 'QW'
    if (cleanName.includes('solar')) return 'SL'
    if (cleanName.includes('wizard')) return 'WZ'
    if (cleanName.includes('orca')) return 'OR'
    if (cleanName.includes('vicuna')) return 'VC'

    // Generate initials from model name
    const words = cleanName.split(/[-_\s]+/).filter((word) => word.length > 0)
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    } else if (words.length === 1 && words[0].length >= 2) {
      return words[0].substring(0, 2).toUpperCase()
    }

    return 'AI'
  }

  public getModelAvatar(modelName: string): ModelAvatar {
    const existing = this.avatarsConfig.find((config) => config.modelName === modelName)

    if (existing) {
      return existing
    }

    // Create new avatar config
    const newAvatar: ModelAvatar = {
      modelName,
      initials: this.generateInitials(modelName)
    }

    this.avatarsConfig.push(newAvatar)
    this.saveAvatarConfig()

    return newAvatar
  }

  public async uploadAvatar(
    modelName: string,
    imageBuffer: Buffer,
    originalName: string
  ): Promise<string> {
    try {
      const fileExtension = path.extname(originalName).toLowerCase()
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

      if (!allowedExtensions.includes(fileExtension)) {
        throw new Error('Invalid file type. Please use JPG, PNG, GIF, or WebP.')
      }

      // Generate unique filename
      const fileName = `${modelName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}${fileExtension}`
      const avatarPath = path.join(this.avatarsDir, fileName)

      // Save the file
      await fs.writeFile(avatarPath, new Uint8Array(imageBuffer))

      // Update avatar config
      const existingIndex = this.avatarsConfig.findIndex((config) => config.modelName === modelName)
      const avatarConfig: ModelAvatar = {
        modelName,
        avatarPath,
        initials: this.generateInitials(modelName),
        uploadedAt: new Date()
      }

      if (existingIndex >= 0) {
        // Remove old avatar file if it exists
        const oldConfig = this.avatarsConfig[existingIndex]
        if (oldConfig.avatarPath) {
          try {
            await fs.unlink(oldConfig.avatarPath)
          } catch (error) {
            // File might not exist, ignore error
          }
        }
        this.avatarsConfig[existingIndex] = avatarConfig
      } else {
        this.avatarsConfig.push(avatarConfig)
      }

      await this.saveAvatarConfig()
      return avatarPath
    } catch (error) {
      console.error('Failed to upload avatar:', error)
      throw error
    }
  }

  public async removeAvatar(modelName: string): Promise<void> {
    try {
      const configIndex = this.avatarsConfig.findIndex((config) => config.modelName === modelName)

      if (configIndex >= 0) {
        const config = this.avatarsConfig[configIndex]

        // Remove file if it exists
        if (config.avatarPath) {
          try {
            await fs.unlink(config.avatarPath)
          } catch (error) {
            // File might not exist, ignore error
          }
        }

        // Update config - keep entry but remove avatar path
        this.avatarsConfig[configIndex] = {
          modelName: config.modelName,
          initials: config.initials
        }

        await this.saveAvatarConfig()
      }
    } catch (error) {
      console.error('Failed to remove avatar:', error)
      throw error
    }
  }

  public getAllAvatars(): ModelAvatar[] {
    return [...this.avatarsConfig]
  }

  public getAvatarPath(modelName: string): string | null {
    const config = this.avatarsConfig.find((c) => c.modelName === modelName)
    return config?.avatarPath || null
  }
}

export const avatarService = new AvatarService()
