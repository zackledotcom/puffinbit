import * as React from 'react'
import { cn } from '@/lib/utils'

export const ScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('overflow-auto', className)} {...props} />
  )
)
ScrollArea.displayName = 'ScrollArea'

export const Separator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('shrink-0 bg-border h-[1px] w-full', className)} {...props} />
  )
)
Separator.displayName = 'Separator'
