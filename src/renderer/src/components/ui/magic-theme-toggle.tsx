/**
 * Magic UI Style Theme Toggle Component
 * Animated theme toggle with shimmer effect
 */

"use client"

import React from 'react'
import { Sun, Moon } from 'phosphor-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MagicThemeToggleProps {
  isDark: boolean
  onToggle: () => void
  className?: string
}

export const MagicThemeToggle: React.FC<MagicThemeToggleProps> = ({
  isDark,
  onToggle,
  className
}) => {
  return (
    <motion.button
      onClick={onToggle}
      className={cn(
        "relative overflow-hidden rounded-full p-2 transition-all duration-300",
        "bg-gradient-to-r from-zinc-900 to-zinc-800 border border-white/20",
        "hover:border-white/40 hover:scale-105 active:scale-95",
        "shadow-lg hover:shadow-xl",
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        background: isDark 
          ? 'linear-gradient(135deg, #18181B 0%, #27272A 50%, #3F3F46 100%)'
          : 'linear-gradient(135deg, #F4F4F5 0%, #E4E4E7 50%, #D4D4D8 100%)'
      }}
    >
      {/* Shimmer Effect */}
      <div className="absolute inset-0 -top-2 -left-2 w-full h-full opacity-0 hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-shimmer" />
      </div>
      
      {/* Icon Container */}
      <motion.div
        className="relative z-10 flex items-center justify-center w-6 h-6"
        initial={false}
        animate={{ 
          rotate: isDark ? 0 : 180,
          scale: [1, 1.2, 1]
        }}
        transition={{ 
          duration: 0.5,
          ease: "easeInOut"
        }}
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.3 }}
            >
              <Moon size={20} className="text-yellow-300" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.3 }}
            >
              <Sun size={20} className="text-yellow-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Glow Effect */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full opacity-20 transition-opacity duration-300",
          isDark ? "bg-blue-500/20" : "bg-yellow-500/20"
        )}
      />
    </motion.button>
  )
}

export default MagicThemeToggle
