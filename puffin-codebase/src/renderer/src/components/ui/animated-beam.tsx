import React, { forwardRef, useRef } from 'react'
import { cn } from '@/lib/utils'

export interface AnimatedBeamProps {
  className?: string
  containerRef: React.RefObject<HTMLElement>
  fromRef: React.RefObject<HTMLElement>
  toRef: React.RefObject<HTMLElement>
  curvature?: number
  reverse?: boolean
  duration?: number
  delay?: number
  pathColor?: string
  pathWidth?: number
  pathOpacity?: number
  gradientStartColor?: string
  gradientStopColor?: string
  startXOffset?: number
  startYOffset?: number
  endXOffset?: number
  endYOffset?: number
}

export const AnimatedBeam: React.FC<AnimatedBeamProps> = ({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 3,
  delay = 0,
  pathColor = 'gray',
  pathWidth = 2,
  pathOpacity = 0.2,
  gradientStartColor = '#0ea5e9',
  gradientStopColor = '#3b82f6',
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0
}) => {
  const id = useRef(`animated-beam-${Math.random()}`)

  return (
    <svg
      fill="none"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('pointer-events-none absolute left-0 top-0 transform-gpu stroke-2', className)}
      viewBox="0 0 100 100"
    >
      <defs>
        <linearGradient
          id={`${id.current}-gradient`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          x2="0"
          y1="0"
          y2="100"
        >
          <stop stopColor={gradientStartColor} stopOpacity="0" />
          <stop stopColor={gradientStartColor} />
          <stop offset="32.5%" stopColor={gradientStopColor} />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M20,50 Q50,30 80,50"
        stroke={pathColor}
        strokeWidth={pathWidth}
        strokeOpacity={pathOpacity}
        fill="none"
      />
      <path
        d="M20,50 Q50,30 80,50"
        stroke={`url(#${id.current}-gradient)`}
        strokeWidth={pathWidth}
        fill="none"
        strokeDasharray="20 20"
        strokeLinecap="round"
        style={{
          animation: `${reverse ? 'reverse' : 'normal'} linear infinite ${
            duration + delay
          }s beam-animation`
        }}
      />
      <style jsx>{`
        @keyframes beam-animation {
          0% {
            stroke-dashoffset: 40;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </svg>
  )
}
