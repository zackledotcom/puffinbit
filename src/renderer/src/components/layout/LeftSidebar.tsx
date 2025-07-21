import React, { useRef } from 'react'
import { Plus, Gear, Sun, Moon, Monitor, ChatCircle, UserCircle, UploadSimple } from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LeftSidebarProps {
  onNewChat: () => void
  onOpenSettings: () => void
  theme: 'light' | 'dark' | 'system'
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
  user?: { name: string; avatarUrl?: string }
  recentChats?: Array<{ id: string; title: string; timestamp: Date; messageCount: number }>
  selectedModel: string
  onModelChange: (model: string) => void
  availableModels: string[]
}

const formatModelName = (modelName: string) => {
  return modelName
    .replace(':latest', '')
    .replace('tinydolphin', 'TinyDolphin')
    .replace('openchat', 'OpenChat')
    .replace('phi4-mini-reasoning', 'Phi4 Mini')
    .replace('deepseek-coder', 'DeepSeek Coder')
}

const formatRelativeTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString()
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onNewChat,
  onOpenSettings,
  theme,
  onThemeChange,
  user = { name: 'Headphones', avatarUrl: undefined },
  recentChats = [
    { id: '1', title: 'Python Data Analysis', timestamp: new Date(), messageCount: 15 },
    { id: '2', title: 'React Component Help', timestamp: new Date(Date.now() - 86400000), messageCount: 8 },
    { id: '3', title: 'API Documentation', timestamp: new Date(Date.now() - 172800000), messageCount: 23 }
  ],
  selectedModel,
  onModelChange,
  availableModels
}) => {
  // Profile picture upload
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const handleAvatarClick = () => {
    if (fileInputRef.current) fileInputRef.current.click()
  }
  // For demo, does not actually upload
  const handleFileChange = () => {}

  return (
    <aside className="w-72 min-w-[288px] max-w-xs h-full bg-black flex flex-col border-r border-gray-800">
      {/* Top section: Avatar + Name */}
      <div className="flex items-center gap-3 px-6 py-5 bg-gray-900">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <UserCircle size={38} className="text-gray-300" weight="thin" />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute -bottom-1 -right-1 p-1 h-5 w-5 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            aria-label="Change profile picture"
            onClick={handleAvatarClick}
            tabIndex={0}
          >
            <UploadSimple size={14} className="text-gray-400" weight="thin" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-base font-medium text-white leading-tight tracking-tight">
            {user.name}
          </span>
        </div>
      </div>

      {/* Flat, stacked sections */}
      <div className="flex-1 flex flex-col overflow-y-auto px-4 py-4 space-y-6">
        {/* Model Selector */}
        <section className="px-6 pt-8 pb-0">
          <div>
            <div className="text-xs font-medium text-gray-400 mb-2">Model</div>
            <div className="rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors flex items-center px-3 py-2 gap-2">
              <Monitor size={16} className="text-gray-400" weight="light" />
              <select
                value={selectedModel}
                onChange={e => onModelChange(e.target.value)}
                className="flex-1 bg-transparent focus:outline-none text-sm text-white py-1 pr-2 appearance-none"
                aria-label="Select model"
              >
                {availableModels.map(model =>
                  <option key={model} value={model} className="bg-gray-900 text-white">
                    {formatModelName(model)}
                  </option>
                )}
              </select>
            </div>
          </div>
        </section>

        {/* Recent Chats */}
        <section className="px-6 pt-8 pb-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400">Recent Chats</span>
            <button
              onClick={onNewChat}
              className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              aria-label="New chat"
            >
              <Plus size={16} weight="light" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {recentChats.map(chat => (
              <div
                key={chat.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <ChatCircle size={16} className="text-gray-400 flex-shrink-0" weight="light" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{chat.title}</div>
                  <div className="text-xs text-gray-400">
                    {formatRelativeTime(chat.timestamp)} &middot; {chat.messageCount} messages
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Memory Tools (Placeholder for future, minimal) */}
        <section>
          <div className="text-xs font-medium text-gray-400 mb-2">Memory</div>
          <div className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-gray-400">
            Coming soon
          </div>
        </section>
      </div>

      {/* Footer: Settings, Theme */}
      <footer className="px-4 py-3 border-t border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between">
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            aria-label="Settings"
          >
            <Gear size={18} weight="light" />
          </button>
          <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-md">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => onThemeChange(t)}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  theme === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                )}
                aria-label={`${t} theme`}
              >
                {t === 'light' && <Sun size={14} weight="light" />}
                {t === 'dark' && <Moon size={14} weight="light" />}
                {t === 'system' && <Monitor size={14} weight="light" />}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </aside>
  )
}

export default LeftSidebar
