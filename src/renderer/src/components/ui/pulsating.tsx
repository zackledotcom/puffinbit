'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PulsatingProps {
  children: React.ReactNode
  className?: string
  pulseColor?: string
  duration?: number
}

const Pulsating = ({
  children,
  className,
  pulseColor = '#ffffff',
  duration = 2
}: PulsatingProps) => {
  return (
    <div className={cn('relative inline-flex', className)}>
      <motion.div
        className="absolute inset-0 rounded-full opacity-30"
        style={{
          background: pulseColor
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.1, 0.3]
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
      <motion.div
        className="absolute inset-0 rounded-full opacity-20"
        style={{
          background: pulseColor
        }}
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.2, 0.05, 0.2]
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.3
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export { Pulsating }
