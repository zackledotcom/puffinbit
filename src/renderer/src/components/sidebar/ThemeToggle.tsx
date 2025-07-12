import React from 'react'
import { Sun, Moon, Snowflake } from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'ice'

interface ThemeToggleProps {
  currentTheme: Theme
  onThemeChange: (theme: Theme) => void
  className?: string
}

export default function ThemeToggle({ currentTheme, onThemeChange, className }: ThemeToggleProps) {
  const themes: Array<{ value: Theme; icon: React.ReactNode; label: string }> = [
    { value: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
    { value: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
    { value: 'ice', icon: <Snowflake className="w-4 h-4" />, label: 'Ice' }
  ]

  return (
    <Card className={cn('w-fit', className)}>
      <CardContent className="p-2">
        <div className="flex gap-1">
          {themes.map((theme) => (
            <Button
              key={theme.value}
              size="sm"
              variant={currentTheme === theme.value ? 'default' : 'ghost'}
              onClick={() => onThemeChange(theme.value)}
              className="h-8 px-2 gap-1"
              title={`Switch to ${theme.label} theme`}
            >
              {theme.icon}
              <span className="text-xs">{theme.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
