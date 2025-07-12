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
    <aside className="w-72 min-w-[288px] max-w-xs h-full bg-white/70 border-r border-muted/40 backdrop-blur-md flex flex-col shadow-sm transition-all duration-300">
      {/* Top section: Avatar + Name */}
      <div className="flex items-center gap-3 px-6 pt-7 pb-5 border-b border-muted/30 bg-white/40 backdrop-blur-md">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border border-muted/50 bg-white/60 flex items-center justify-center overflow-hidden shadow-sm">
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
            className="absolute -bottom-1 -right-1 p-1 h-6 w-6 rounded-full bg-white/80 border border-muted/40 shadow-sm hover:bg-gray-100/70 transition-all"
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
          <span className="text-[1.35rem] font-semibold text-gray-900 leading-tight tracking-tight font-sans" style={{ fontWeight: 600 }}>
            {user.name}
          </span>
        </div>
      </div>

      {/* Flat, stacked sections */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Model Selector */}
        <section className="px-6 pt-8 pb-0">
          <label className="block text-xs font-medium text-gray-500 mb-2 tracking-wide font-sans" style={{ fontWeight: 500 }}>
            Model
          </label>
          <div className="rounded-xl border border-muted/30 bg-white/60 shadow-sm hover:shadow-md transition-all duration-200 flex items-center px-3 py-[13px] gap-3">
            <Monitor size={20} className="text-gray-400" weight="thin" />
            <select
              value={selectedModel}
              onChange={e => onModelChange(e.target.value)}
              className="flex-1 bg-transparent focus:outline-none text-base font-semibold text-gray-900 font-sans pr-2"
              style={{ fontWeight: 600 }}
              aria-label="Select model"
            >
              {availableModels.map(model =>
                <option key={model} value={model}>{formatModelName(model)}</option>
              )}
            </select>
          </div>
        </section>

        {/* Recent Chats */}
        <section className="px-6 pt-8 pb-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 tracking-wide font-sans" style={{ fontWeight: 500 }}>
              Recent Chats
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 p-0 rounded-full hover:bg-gray-100/70 transition-all"
              onClick={onNewChat}
              aria-label="New chat"
            >
              <Plus size={16} className="text-gray-500" weight="thin" />
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {recentChats.map(chat => (
              <div
                key={chat.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all cursor-pointer group"
              >
                <ChatCircle size={18} className="text-gray-300 flex-shrink-0" weight="thin" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-900 truncate font-sans" style={{ fontWeight: 500 }}>
                    {chat.title}
                  </span>
                  <span className="text-xs text-gray-400 font-sans mt-1" style={{ fontWeight: 400 }}>
                    {formatRelativeTime(chat.timestamp)} &middot; {chat.messageCount} messages
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Memory Tools (Placeholder for future, minimal) */}
        <section className="px-6 pt-8 pb-0">
          <span className="block text-xs font-medium text-gray-500 mb-2 tracking-wide font-sans" style={{ fontWeight: 500 }}>
            Memory Tools
          </span>
          <div className="rounded-lg border border-muted/30 bg-white/50 px-3 py-2 text-xs text-gray-400 font-sans">
            <span>Coming soon: persistent memory tools</span>
          </div>
        </section>
      </div>

      {/* Footer: Settings, Theme */}
      <footer className="px-6 pt-8 pb-7 border-t border-muted/30 bg-white/40 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0 rounded-full hover:bg-gray-100/70 transition-all"
            onClick={onOpenSettings}
            aria-label="Settings"
          >
            <Gear size={16} className="text-gray-500" weight="thin" />
          </Button>
          <div className="flex items-center gap-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <Button
                key={t}
                variant="ghost"
                size="icon"
                onClick={() => onThemeChange(t)}
                className={cn(
                  'h-7 w-7 p-0 rounded-full transition-all',
                  theme === t ? 'bg-gray-100 shadow-sm' : 'hover:bg-gray-100/70'
                )}
                aria-label={`${t} theme`}
              >
                {t === 'light' && <Sun size={13} className={theme === t ? "text-yellow-500" : "text-gray-400"} weight="thin" />}
                {t === 'dark' && <Moon size={13} className={theme === t ? "text-blue-600" : "text-gray-400"} weight="thin" />}
                {t === 'system' && <Monitor size={13} className={theme === t ? "text-purple-600" : "text-gray-400"} weight="thin" />}
              </Button>
            ))}
          </div>
        </div>
      </footer>
    </aside>
  )
}

export default LeftSidebar
