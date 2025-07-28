import React from 'react'
import { Moon, Sun, Gear, Activity } from 'phosphor-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface BottomBarProps {
  onOpenSettings: () => void
  onOpenAnalytics: () => void
  className?: string
}

/**
 * Enhanced BottomBar Component - Apple-level design standards
 * Follows project design principles with proper accessibility and consistency
 */
export default function BottomBar({ 
  onOpenSettings, 
  onOpenAnalytics, 
  className 
}: BottomBarProps) {
  const { theme, setTheme } = useTheme()

  const handleThemeToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <TooltipProvider>
      <footer 
        className={cn(
          "flex justify-end items-center gap-2 px-4 py-3",
          "border-t border-border/50 bg-background/80 backdrop-blur-sm",
          "transition-all duration-300",
          className
        )}
        role="toolbar"
        aria-label="Application controls"
      >
        {/* Theme Toggle Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleThemeToggle}
              className={cn(
                "h-9 w-9 p-0 rounded-lg",
                "hover:bg-muted/80 transition-colors duration-200",
                "focus:ring-2 focus:ring-primary/20 focus:outline-none"
              )}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? (
                <Moon size={18} className="text-muted-foreground" weight="regular" />
              ) : (
                <Sun size={18} className="text-muted-foreground" weight="regular" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <p>Toggle theme ({theme === 'light' ? 'dark' : 'light'})</p>
          </TooltipContent>
        </Tooltip>

        {/* Analytics Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenAnalytics}
              className={cn(
                "h-9 w-9 p-0 rounded-lg",
                "hover:bg-muted/80 transition-colors duration-200",
                "focus:ring-2 focus:ring-primary/20 focus:outline-none"
              )}
              aria-label="Open analytics panel"
            >
              <Activity size={18} className="text-muted-foreground" weight="regular" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <p>Analytics & Performance</p>
          </TooltipContent>
        </Tooltip>

        {/* Settings Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSettings}
              className={cn(
                "h-9 w-9 p-0 rounded-lg",
                "hover:bg-muted/80 transition-colors duration-200",
                "focus:ring-2 focus:ring-primary/20 focus:outline-none"
              )}
              aria-label="Open settings"
            >
              <Gear size={18} className="text-muted-foreground" weight="regular" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <p>Settings</p>
          </TooltipContent>
        </Tooltip>
      </footer>
    </TooltipProvider>
  )
}