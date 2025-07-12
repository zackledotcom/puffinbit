'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

// Magic UI Animated Circular Progress Bar Component
interface AnimatedCircularProgressBarProps {
  max: number
  value: number
  min?: number
  gaugePrimaryColor?: string
  gaugeSecondaryColor?: string
  className?: string
}

const AnimatedCircularProgressBar: React.FC<AnimatedCircularProgressBarProps> = ({
  max = 100,
  min = 0,
  value = 0,
  gaugePrimaryColor = '#3b82f6',
  gaugeSecondaryColor = '#e5e7eb',
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState(min)
  const circumference = 2 * Math.PI * 45
  const percentPx = circumference / 100
  const currentPercent = ((displayValue - min) / (max - min)) * 100

  useEffect(() => {
    setDisplayValue(value)
  }, [value])

  return (
    <div className={`relative size-40 ${className}`}>
      <svg className="size-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx={50}
          cy={50}
          r={45}
          stroke={gaugeSecondaryColor}
          strokeWidth={10}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={0}
          strokeLinecap="round"
        />
        {/* Progress circle */}
        <motion.circle
          cx={50}
          cy={50}
          r={45}
          stroke={gaugePrimaryColor}
          strokeWidth={10}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          animate={{
            strokeDashoffset: circumference - currentPercent * percentPx
          }}
          transition={{
            duration: 1,
            ease: 'easeInOut'
          }}
        />
      </svg>
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <motion.span
          className="text-2xl font-bold text-gray-900 dark:text-gray-100"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
        >
          {Math.round(displayValue)}%
        </motion.span>
      </motion.div>
    </div>
  )
}

export { AnimatedCircularProgressBar }
