'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TypingAnimationProps {
  text?: string
  duration?: number
  className?: string
}

const TypingAnimation = ({
  text = 'AI is thinking',
  duration = 0.05,
  className
}: TypingAnimationProps) => {
  const characters = text.split('')

  const variants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1
    }
  }

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      {characters.map((char, i) => (
        <motion.span
          key={i}
          variants={variants}
          initial="hidden"
          animate="visible"
          transition={{
            duration,
            delay: i * duration,
            repeat: Infinity,
            repeatType: 'reverse',
            repeatDelay: characters.length * duration
          }}
        >
          {char}
        </motion.span>
      ))}
      <motion.div
        className="ml-2 flex space-x-1"
        animate={{
          opacity: [0, 1, 0]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        <div className="h-1 w-1 bg-current rounded-full" />
        <motion.div
          className="h-1 w-1 bg-current rounded-full"
          animate={{
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.2
          }}
        />
        <motion.div
          className="h-1 w-1 bg-current rounded-full"
          animate={{
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.4
          }}
        />
      </motion.div>
    </div>
  )
}

export { TypingAnimation }
