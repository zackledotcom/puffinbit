// Avatar service types
export interface ModelAvatar {
  modelName: string
  avatarPath?: string
  initials: string
  uploadedAt?: Date
}

export interface AvatarUploadResponse {
  success: boolean
  avatarPath: string
}

export interface AvatarRemoveResponse {
  success: boolean
}
