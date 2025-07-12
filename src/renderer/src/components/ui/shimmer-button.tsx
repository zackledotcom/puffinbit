import React, { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string
  shimmerSize?: string
  borderRadius?: string
  shimmerDuration?: string
  background?: string
  className?: string
  children?: React.ReactNode
}

const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = '#ffffff',
      shimmerSize = '0.05em',
      shimmerDuration = '3s',
      borderRadius = '100px',
      background = 'rgba(0, 0, 0, 1)',
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        style={
          {
            '--shimmer-color': shimmerColor,
            '--shimmer-size': shimmerSize,
            '--shimmer-duration': shimmerDuration,
            '--border-radius': borderRadius,
            '--background': background
          } as CSSProperties
        }
        className={cn(
          // base styles
          'group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white [background:var(--background)] [border-radius:var(--border-radius)]',
          // shimmer effect
          'before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px] before:[background:conic-gradient(from_0deg,transparent,var(--shimmer-color),transparent_360deg)] before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]',
          'before:[mask-composite:xor] before:animate-[shimmer_var(--shimmer-duration)_infinite_linear]',
          // shimmer animation
          "before:content-['']",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    )
  }
)

ShimmerButton.displayName = 'ShimmerButton'

export { ShimmerButton }
