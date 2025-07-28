import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface NumberTickerProps {
  value: number
  direction?: 'up' | 'down'
  delay?: number
  className?: string
  decimalPlaces?: number
  prefix?: string
  suffix?: string
}

export default function NumberTicker({
  value,
  direction = 'up',
  delay = 0,
  className,
  decimalPlaces = 0,
  prefix = '',
  suffix = ''
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [displayValue, setDisplayValue] = React.useState(direction === 'down' ? value : 0)

  useEffect(() => {
    const timer = setTimeout(() => {
      const startValue = direction === 'down' ? value : 0
      const endValue = direction === 'down' ? 0 : value
      const duration = 2000 // 2 seconds
      const startTime = Date.now()

      const updateNumber = () => {
        const currentTime = Date.now()
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3)

        const currentValue = startValue + (endValue - startValue) * easeOutCubic

        setDisplayValue(parseFloat(currentValue.toFixed(decimalPlaces)))

        if (progress < 1) {
          requestAnimationFrame(updateNumber)
        }
      }

      requestAnimationFrame(updateNumber)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, direction, delay, decimalPlaces])

  return (
    <span ref={ref} className={cn('inline-block tabular-nums tracking-wider font-mono', className)}>
      {prefix}
      {displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
      })}
      {suffix}
    </span>
  )
}
