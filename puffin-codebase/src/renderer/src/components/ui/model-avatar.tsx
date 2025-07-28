import React, { useState, useRef } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Upload, Trash, User } from 'phosphor-react'
import { cn } from '@/lib/utils'

interface ModelAvatarProps {
  modelName: string
  size?: 'sm' | 'md' | 'lg'
  editable?: boolean
  className?: string
}

interface ModelAvatarData {
  modelName: string
  avatarPath?: string
  initials: string
  uploadedAt?: Date
}

const ModelAvatar: React.FC<ModelAvatarProps> = ({
  modelName,
  size = 'md',
  editable = false,
  className
}) => {
  const [avatarData, setAvatarData] = useState<ModelAvatarData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load avatar data on mount
  React.useEffect(() => {
    loadAvatarData()
  }, [modelName])

  const loadAvatarData = async () => {
    try {
      const data = await window.api.getModelAvatar(modelName)
      setAvatarData(data)
    } catch (error) {
      console.error('Failed to load avatar data:', error)
      // Fallback to generated initials
      setAvatarData({
        modelName,
        initials: generateInitials(modelName)
      })
    }
  }

  const generateInitials = (name: string): string => {
    const cleanName = name.replace(':latest', '').toLowerCase()

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

    const words = cleanName.split(/[-_\s]+/).filter((word) => word.length > 0)
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    } else if (words.length === 1 && words[0].length >= 2) {
      return words[0].substring(0, 2).toUpperCase()
    }

    return 'AI'
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)

      await window.api.uploadModelAvatar(modelName, buffer, file.name)
      await loadAvatarData() // Reload to get new avatar
    } catch (error) {
      console.error('Failed to upload avatar:', error)
    } finally {
      setIsLoading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    setIsLoading(true)
    try {
      await window.api.removeModelAvatar(modelName)
      await loadAvatarData() // Reload to show initials fallback
    } catch (error) {
      console.error('Failed to remove avatar:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getAvatarSrc = (): string | undefined => {
    if (avatarData?.avatarPath) {
      // Convert file path to file:// URL for Electron
      return `file://${avatarData.avatarPath}`
    }
    return undefined
  }

  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base'
  }

  const AvatarComponent = (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={getAvatarSrc()} alt={`${modelName} avatar`} className="object-cover" />
      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
        {avatarData?.initials || generateInitials(modelName)}
      </AvatarFallback>
    </Avatar>
  )

  if (!editable) {
    return AvatarComponent
  }

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto w-auto p-0 hover:bg-transparent"
            disabled={isLoading}
          >
            {AvatarComponent}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Avatar
          </DropdownMenuItem>
          {avatarData?.avatarPath && (
            <DropdownMenuItem
              onClick={handleRemoveAvatar}
              className="cursor-pointer text-red-600 hover:text-red-700"
            >
              <Trash className="w-4 h-4 mr-2" />
              Remove Avatar
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            Initials: {avatarData?.initials || generateInitials(modelName)}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  )
}

export default ModelAvatar
