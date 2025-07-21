import * as React from "react"
import { cn } from "@/lib/utils"

export interface DotPatternProps extends React.SVGProps<SVGSVGElement> {
  /**
   * Pattern width (defaults to 20)
   */
  width?: number
  /**
   * Pattern height (defaults to 20)
   */
  height?: number
  /**
   * Circle x-coordinate (defaults to 1)
   */
  cx?: number
  /**
   * Circle y-coordinate (defaults to 1)
   */
  cr?: number
  /**
   * Optional CSS classes
   */
  className?: string
}

/**
 * A lightweight SVG dot-pattern background.
 * Keep it simple so it can be reused wherever a subtle
 * texture is needed.
 */
export function DotPattern({ width = 20, height = 20, cx = 1, cy = 1, cr = 1, className, ...props }: DotPatternProps) {
  const patternId = React.useId()

  return (
    <svg
      aria-hidden="true"
      className={cn("absolute inset-0 h-full w-full", className)}
      width="100%"
      height="100%"
      {...props}
    >
      <defs>
        <pattern id={patternId} x="0" y="0" width={width} height={height} patternUnits="userSpaceOnUse">
          <circle cx={cx} cy={cy} r={cr} className="fill-current" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}

export default DotPattern
