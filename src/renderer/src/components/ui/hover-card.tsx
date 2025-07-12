import React, { useState } from 'react'
import {
  HoverCard as HoverCardPrimitive,
  HoverCardContent,
  HoverCardTrigger
} from '@radix-ui/react-hover-card'
import { cn } from '@/lib/utils'

interface HoverCardProps {
  children: React.ReactNode
  content: React.ReactNode
  openDelay?: number
  closeDelay?: number
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
  contentClassName?: string
}

export default function HoverCard({
  children,
  content,
  openDelay = 300,
  closeDelay = 150,
  side = 'bottom',
  className,
  contentClassName
}: HoverCardProps) {
  return (
    <HoverCardPrimitive openDelay={openDelay} closeDelay={closeDelay}>
      <HoverCardTrigger asChild className={className}>
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        side={side}
        className={cn(
          'z-50 w-64 rounded-xl border border-grey-medium bg-white/95 backdrop-blur-sm p-4 shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          contentClassName
        )}
      >
        {content}
      </HoverCardContent>
    </HoverCardPrimitive>
  )
}
