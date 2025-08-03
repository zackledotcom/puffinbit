import React from 'react'
import { Upload, Code, Gear, Users } from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { useCanvasStore } from '@/stores/canvasStore'
import { cn } from '@/lib/utils'

interface TopBarProps {
  onExportChat?: () => void
  hasMessages?: boolean
  className?: string
}

const TopBar: React.FC<TopBarProps> = ({
  onExportChat,
  hasMessages = false,
  className
}) => {
  const { canvasOpen, setCanvasOpen } = useCanvasStore()

  const handleCanvasToggle = () => {
    setCanvasOpen(!canvasOpen)
  }

  return (
    <header
      className={cn(
        'h-[60px] bg-background border-b border-border flex items-center justify-between px-4',
        className
      )}
    >
      {/* Left Section - App Title */}
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-semibold text-foreground">Puffin AI</h1>
      </div>

      {/* Center Section - Status/Info */}
      <div className="flex items-center space-x-2">
        {canvasOpen && (
          <div className="flex items-center space-x-2 px-2 py-1 bg-purple-50 rounded-md">
            <Code size={14} className="text-purple-600" />
            <span className="text-sm text-purple-700 font-medium">Canvas Active</span>
          </div>
        )}
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center space-x-2">
        {/* Export Button - only show if there are messages */}
        {hasMessages && onExportChat && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onExportChat}
            className="flex items-center space-x-2 hover:bg-gray-100"
            title="Export Chat"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Export</span>
          </Button>
        )}

        {/* Canvas Button */}
        <Button
          variant={canvasOpen ? "default" : "ghost"}
          size="sm"
          onClick={handleCanvasToggle}
          className={cn(
            "flex items-center space-x-2 transition-all duration-200",
            canvasOpen 
              ? "bg-purple-600 hover:bg-purple-700 text-white" 
              : "hover:bg-purple-50 hover:text-purple-700"
          )}
          title={canvasOpen ? "Close Canvas" : "Open Canvas"}
        >
          <Code size={16} />
          <span className="hidden sm:inline">Canvas</span>
        </Button>

        {/* Settings Gear */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-gray-100"
          title="Settings"
        >
          <Gear size={16} />
        </Button>
      </div>
    </header>
  )
}

export default TopBar