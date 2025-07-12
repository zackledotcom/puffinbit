// Note: @radix-ui/react-tooltip not installed
// Simple tooltip alternative using title attribute for now
import * as React from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  children: React.ReactNode
  content: string
  className?: string
}

export function Tooltip({ children, content, className }: TooltipProps) {
  return (
    <div title={content} className={cn('inline-block', className)}>
      {children}
    </div>
  )
}

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const TooltipTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const TooltipContent = ({ children }: { children: React.ReactNode }) => <>{children}</>
