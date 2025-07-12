import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-gray-600',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-border bg-background hover:bg-gray-100 hover:text-gray-900',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-gray-100',
        ghost: 'hover:bg-gray-100 hover:text-gray-900',
        link: 'text-gray-700 underline-offset-4 hover:underline hover:text-gray-900',

        // Design Guide Glass Variants
        glass:
          'glass-button text-foreground hover:text-gray-900 transition-all duration-200 border-0',
        'glass-accent':
          'glass-accent text-gray-700 hover:text-gray-900 transition-all duration-200 border-0',
        'glass-primary':
          'bg-gray-200 text-gray-900 hover:bg-gray-300 hover-lift transition-all duration-200 border-0',
        'glass-destructive':
          'bg-destructive/90 backdrop-blur-lg text-destructive-foreground hover:bg-destructive hover-lift transition-all duration-200 border-0',
        'glass-floating':
          'glass-card hover:bg-gray-100 hover-lift text-foreground hover:text-gray-900 transition-all duration-300 border-0'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',

        // Glass-specific sizes with enhanced styling
        'glass-sm': 'h-8 rounded-xl px-3 text-xs',
        'glass-default': 'h-10 rounded-xl px-4 py-2',
        'glass-lg': 'h-12 rounded-2xl px-6 text-base',
        'glass-icon': 'h-10 w-10 rounded-xl',
        'glass-icon-sm': 'h-8 w-8 rounded-lg'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
