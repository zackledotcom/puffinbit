import React, { CSSProperties, ReactElement, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface TextShimmerProps {
  children: string
  className?: string
  duration?: number
  spread?: number
  [key: string]: any
}

export default function TextShimmer({
  children,
  className,
  duration = 2,
  spread = 2,
  ...props
}: TextShimmerProps): ReactElement {
  const [animationKey, setAnimationKey] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationKey((prev) => prev + 1)
    }, duration * 1000)

    return () => clearInterval(interval)
  }, [duration])

  return (
    <div className={cn('relative inline-block overflow-hidden', className)} {...props}>
      <span className="invisible">{children}</span>
      <span
        key={animationKey}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent bg-clip-text text-transparent animate-shimmer"
        style={
          {
            background: `linear-gradient(
            90deg,
            transparent 0%,
            transparent 40%,
            white 50%,
            transparent 60%,
            transparent 100%
          )`,
            backgroundSize: `${spread * 100}% 100%`,
            animation: `shimmer ${duration}s ease-in-out infinite`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          } as CSSProperties
        }
      >
        {children}
      </span>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  )
}
