'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FadeInProps {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  direction?: 'up' | 'down' | 'left' | 'right'
}

const FadeIn = ({
  children,
  className,
  delay = 0,
  duration = 0.5,
  direction = 'up'
}: FadeInProps) => {
  const directions = {
    up: { y: 20, x: 0 },
    down: { y: -20, x: 0 },
    left: { y: 0, x: 20 },
    right: { y: 0, x: -20 }
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        ...directions[direction]
      }}
      animate={{
        opacity: 1,
        y: 0,
        x: 0
      }}
      transition={{
        duration,
        delay,
        ease: 'easeOut'
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

export { FadeIn }
