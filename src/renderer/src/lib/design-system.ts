/**
 * Design System Configuration - Apple-Level Standards
 * Following 8pt grid system with proper spacing hierarchy
 */

export const DESIGN_TOKENS = {
  // 8pt Grid System
  grid: {
    base: 8,
    sub: 4,
  },
  
  // Spacing Scale (8pt increments)
  spacing: {
    xs: '4px',   // 0.5 * base
    sm: '8px',   // 1 * base
    md: '16px',  // 2 * base
    lg: '24px',  // 3 * base
    xl: '32px',  // 4 * base
    '2xl': '48px', // 6 * base
    '3xl': '64px', // 8 * base
  },

  // Typography Rhythm
  typography: {
    lineHeight: {
      body: 1.3,
      heading: 1.0,
      relaxed: 1.5,
    },
    tracking: {
      tight: '-0.01em',
      tighter: '-0.03em', 
      normal: '0',
      wide: '0.025em',
    },
    fontSizes: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
    }
  },

  // Animation Standards
  animation: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
      slower: 700,
    },
    easing: {
      default: 'cubic-bezier(0.16, 1, 0.3, 1)', // easeOutExpo
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    spring: {
      damping: 30,
      stiffness: 300,
      mass: 1,
    }
  },

  // Color System (following your existing theme)
  colors: {
    primary: {
      50: '#eff6ff',
      500: '#3b82f6',
      600: '#2563eb',
      900: '#1e3a8a',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      500: '#6b7280',
      800: '#1f2937',
      900: '#111827',
    }
  },

  // Component Specifications
  components: {
    button: {
      height: {
        sm: '32px',  // 4 * base
        md: '40px',  // 5 * base
        lg: '48px',  // 6 * base
      },
      padding: {
        sm: '8px 16px',
        md: '12px 24px', 
        lg: '16px 32px',
      }
    },
    input: {
      height: '44px', // 5.5 * base (optimal touch target)
      borderRadius: '12px',
    },
    card: {
      borderRadius: '16px',
      padding: '24px',
      shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    }
  },

  // Layout Constants
  layout: {
    sidebar: {
      width: {
        collapsed: '72px',
        expanded: '280px',
      }
    },
    header: {
      height: '64px', // 8 * base
    },
    maxContentWidth: '1280px',
  }
} as const;

// Animation Presets
export const MOTION_PRESETS = {
  // Layout transitions
  slideIn: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 0 },
    transition: { duration: 0.3, ease: DESIGN_TOKENS.animation.easing.default }
  },
  
  fadeIn: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3 }
  },

  scaleIn: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: { 
      duration: 0.2,
      type: 'spring',
      ...DESIGN_TOKENS.animation.spring
    }
  },

  // Hover states
  buttonHover: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.15 }
  },

  // Stagger animations
  staggerChildren: {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }
} as const;

// Utility functions
export const getSpacing = (size: keyof typeof DESIGN_TOKENS.spacing) => 
  DESIGN_TOKENS.spacing[size];

export const getDuration = (speed: keyof typeof DESIGN_TOKENS.animation.duration) => 
  DESIGN_TOKENS.animation.duration[speed];

export const getEasing = (type: keyof typeof DESIGN_TOKENS.animation.easing) => 
  DESIGN_TOKENS.animation.easing[type];

// Performance utilities
export const shouldReduceMotion = () => 
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const withReducedMotion = <T>(motion: T, reduced: Partial<T> = {}): T => 
  shouldReduceMotion() ? { ...motion, ...reduced } : motion;
