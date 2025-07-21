/**
 * Magic UI Toggle Switch Component  
 * Proper toggle switch with animations
 */

"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon } from 'phosphor-react'
import { cn } from '@/lib/utils'

interface MagicToggleSwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const MagicToggleSwitch: React.FC<MagicToggleSwitchProps> = ({
  checked,
  onCheckedChange,
  className,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-8 h-4',
    md: 'w-12 h-6', 
    lg: 'w-16 h-8'
  }

  const thumbSizes = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-7 h-7'
  }

  const iconSizes = {
    sm: 10,
    md: 14,
    lg: 18
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-transparent",
        checked 
          ? "bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25" 
          : "bg-zinc-700 shadow-inner",
        sizeClasses[size],
        className
      )}
      style={{
        boxShadow: checked 
          ? '0 0 20px rgba(59, 130, 246, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.1)'
          : 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
      }}
    >
      <span className="sr-only">Toggle theme</span>
      
      {/* Track glow effect */}
      {checked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-20 blur-sm"
        />
      )}

      {/* Thumb */}
      <motion.span
        layout
        className={cn(
          "pointer-events-none relative inline-block rounded-full bg-white shadow-lg transform ring-0 transition-all duration-200 ease-in-out flex items-center justify-center",
          thumbSizes[size]
        )}
        animate={{
          x: checked ? (size === 'sm' ? 16 : size === 'md' ? 24 : 32) : 2,
          scale: checked ? 1.1 : 1
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
        style={{
          background: checked 
            ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
            : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
          boxShadow: checked
            ? '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            : '0 2px 8px rgba(0, 0, 0, 0.15)'
        }}
      >
        {/* Icon */}
        <motion.div
          animate={{ 
            rotate: checked ? 360 : 0,
            scale: checked ? 1 : 0.8
          }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center"
        >
          {checked ? (
            <Moon 
              size={iconSizes[size]} 
              className="text-slate-600" 
              weight="fill"
            />
          ) : (
            <Sun 
              size={iconSizes[size]} 
              className="text-yellow-500" 
              weight="fill"
            />
          )}
        </motion.div>
      </motion.span>

      {/* Background icons */}
      <div className="absolute inset-0 flex items-center justify-between px-1">
        <motion.div
          animate={{ 
            opacity: checked ? 0 : 0.3,
            scale: checked ? 0.8 : 1
          }}
          transition={{ duration: 0.2 }}
          className="text-yellow-400"
        >
          <Sun size={iconSizes[size] - 2} weight="bold" />
        </motion.div>
        <motion.div
          animate={{ 
            opacity: checked ? 0.3 : 0,
            scale: checked ? 1 : 0.8
          }}
          transition={{ duration: 0.2 }}
          className="text-blue-200"
        >
          <Moon size={iconSizes[size] - 2} weight="bold" />
        </motion.div>
      </div>
    </button>
  )
}

export default MagicToggleSwitch
