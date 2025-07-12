/**
 * Magic UI Components for Puffin AI
 * 
 * This file contains simplified versions of Magic UI components
 * optimized for the Puffin chat interface.
 * 
 * For production, these should be replaced with the full Magic UI library:
 * npm install @magicui/react
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

// Text Animation Component
export interface TextAnimateProps {
  children: string
  animation?: 'fadeIn' | 'blurIn' | 'blurInUp' | 'slideUp' | 'slideDown'
  by?: 'word' | 'character' | 'line'
  delay?: number
  className?: string
}

export const TextAnimate: React.FC<TextAnimateProps> = ({
  children,
  animation = "blurInUp",
  by = "word",
  delay = 0,
  className = ""
}) => {
  const segments = by === 'word' ? children.split(' ') : 
                  by === 'character' ? children.split('') : 
                  children.split('\n')

  const getVariants = () => {
    switch (animation) {
      case 'blurInUp':
        return {
          hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
          show: { opacity: 1, y: 0, filter: "blur(0px)" }
        }
      case 'slideUp':
        return {
          hidden: { opacity: 0, y: 30 },
          show: { opacity: 1, y: 0 }
        }
      case 'fadeIn':
        return {
          hidden: { opacity: 0 },
          show: { opacity: 1 }
        }
      default:
        return {
          hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
          show: { opacity: 1, y: 0, filter: "blur(0px)" }
        }
    }
  }

  const variants = getVariants()

  return (
    <motion.div 
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05,
            delayChildren: delay
          }
        }
      }}
    >
      {segments.map((segment, i) => (
        <motion.span
          key={i}
          className={cn(
            by === 'word' ? "inline-block mr-1" : 
            by === 'character' ? "inline-block" :
            "block"
          )}
          variants={{
            ...variants,
            show: {
              ...variants.show,
              transition: { duration: 0.3 }
            }
          }}
        >
          {segment}
        </motion.span>
      ))}
    </motion.div>
  )
}

// Number Ticker Component
export interface NumberTickerProps {
  value: number
  className?: string
  duration?: number
  startValue?: number
}

export const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  className = "",
  duration = 1000,
  startValue = 0
}) => {
  const [displayValue, setDisplayValue] = useState(startValue)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(value)
    }, 500)
    return () => clearTimeout(timer)
  }, [value])
  
  return (
    <motion.span 
      className={className}
      animate={{ opacity: [0, 1] }}
      transition={{ duration: 0.5 }}
    >
      {displayValue}
    </motion.span>
  )
}

// Sparkles Text Component  
export interface SparklesTextProps {
  children: React.ReactNode
  className?: string
  sparklesCount?: number
}

export const SparklesText: React.FC<SparklesTextProps> = ({
  children,
  className = "",
  sparklesCount = 3
}) => {
  return (
    <div className={cn("relative", className)}>
      <span className="relative z-10">{children}</span>
      {[...Array(sparklesCount)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-0 left-0 w-1 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
          animate={{
            x: [0, 50, 100, 150, 0],
            y: [0, -20, 0, -10, 0],
            opacity: [0, 1, 0.5, 1, 0],
            scale: [0, 1, 0.5, 1, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut"
          }}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`
          }}
        />
      ))}
    </div>
  )
}

// Shimmer Button Component
export interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string
  className?: string
  children: React.ReactNode
}

export const ShimmerButton: React.FC<ShimmerButtonProps> = ({
  children,
  shimmerColor = "#ffffff",
  className = "",
  ...props
}) => {
  return (
    <motion.button
      className={cn(
        "relative group cursor-pointer overflow-hidden whitespace-nowrap border border-white/10 px-4 py-2 text-white bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl",
        "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
        className
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {/* Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <span className="relative z-10 text-sm font-medium">{children}</span>
    </motion.button>
  )
}

// Box Reveal Component
export interface BoxRevealProps {
  children: React.ReactElement
  width?: "fit-content" | "100%"
  boxColor?: string
  duration?: number
}

export const BoxReveal: React.FC<BoxRevealProps> = ({
  children,
  width = "fit-content",
  boxColor = "#5046e6",
  duration = 0.5
}) => {
  return (
    <div style={{ position: "relative", width, overflow: "hidden" }}>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 75 },
          visible: { opacity: 1, y: 0 },
        }}
        initial="hidden"
        animate="visible"
        transition={{ duration, delay: 0.25 }}
      >
        {children}
      </motion.div>

      <motion.div
        variants={{
          hidden: { left: 0 },
          visible: { left: "100%" },
        }}
        initial="hidden"
        animate="visible"
        transition={{ duration, ease: "easeIn" }}
        style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: 0,
          right: 0,
          zIndex: 20,
          background: boxColor,
        }}
      />
    </div>
  )
}

// Aurora Text Component
export interface AuroraTextProps {
  children: React.ReactNode
  className?: string
  colors?: string[]
  speed?: number
}

export const AuroraText: React.FC<AuroraTextProps> = ({
  children,
  className = "",
  colors = ["#FF0080", "#7928CA", "#0070F3", "#38bdf8"],
  speed = 1
}) => {
  const gradientStyle = {
    backgroundImage: `linear-gradient(135deg, ${colors.join(", ")}, ${colors[0]})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    animationDuration: `${10 / speed}s`,
  }

  return (
    <span className={cn("relative inline-block", className)}>
      <span className="sr-only">{children}</span>
      <span
        className="relative animate-aurora bg-[length:200%_auto] bg-clip-text text-transparent"
        style={gradientStyle}
        aria-hidden="true"
      >
        {children}
      </span>
    </span>
  )
}

// Export all components
export const MagicUI = {
  TextAnimate,
  NumberTicker,
  SparklesText,
  ShimmerButton,
  BoxReveal,
  AuroraText
}

export default MagicUI
