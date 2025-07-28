"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion, MotionProps, Variants } from "framer-motion";
import { ElementType, memo } from "react";

type AnimationType = "text" | "word" | "character" | "line";
type AnimationVariant =
  | "fadeIn"
  | "blurIn"
  | "blurInUp"
  | "blurInDown"
  | "slideUp"
  | "slideDown"
  | "slideLeft"
  | "slideRight"
  | "scaleUp"
  | "scaleDown";

interface TextAnimateProps extends MotionProps {
  children: string;
  className?: string;
  segmentClassName?: string;
  delay?: number;
  duration?: number;
  variants?: Variants;
  as?: ElementType;
  by?: AnimationType;
  startOnView?: boolean;
  once?: boolean;
  animation?: AnimationVariant;
}

const defaultAnimationVariants: Record<
  AnimationVariant,
  { container: Variants; item: Variants }
> = {
  fadeIn: {
    container: {
      hidden: { opacity: 1 },
      show: {
        opacity: 1,
        transition: {          delayChildren: 0,
          staggerChildren: 0.05,
        },
      },
    },
    item: {
      hidden: { opacity: 0, y: 20 },
      show: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.3,
        },
      },
    },
  },
  blurInUp: {
    container: {
      hidden: { opacity: 1 },
      show: {
        opacity: 1,
        transition: {
          delayChildren: 0,
          staggerChildren: 0.05,
        },
      },
    },
    item: {
      hidden: { opacity: 0, filter: "blur(10px)", y: 20 },
      show: {
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        transition: {
          y: { duration: 0.3 },
          opacity: { duration: 0.4 },
          filter: { duration: 0.3 },
        },
      },
    },
  },
  // Add other variants as needed
  blurIn: {
    container: {
      hidden: { opacity: 1 },
      show: { opacity: 1, transition: { staggerChildren: 0.05 } },
    },
    item: {
      hidden: { opacity: 0, filter: "blur(10px)" },
      show: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.3 } },
    },
  },
  // Simplified versions for other animations
  slideUp: {
    container: {
      hidden: { opacity: 1 },
      show: { opacity: 1, transition: { staggerChildren: 0.05 } },
    },
    item: {
      hidden: { y: 20, opacity: 0 },
      show: { y: 0, opacity: 1, transition: { duration: 0.3 } },
    },
  },
  slideDown: {
    container: {
      hidden: { opacity: 1 },
      show: { opacity: 1, transition: { staggerChildren: 0.05 } },
    },
    item: {
      hidden: { y: -20, opacity: 0 },
      show: { y: 0, opacity: 1, transition: { duration: 0.3 } },
    },
  },
  slideLeft: {
    container: {
      hidden: { opacity: 1 },
      show: { opacity: 1, transition: { staggerChildren: 0.05 } },
    },
    item: {
      hidden: { x: 20, opacity: 0 },
      show: { x: 0, opacity: 1, transition: { duration: 0.3 } },
    },
  },
  slideRight: {
    container: {
      hidden: { opacity: 1 },
      show: { opacity: 1, transition: { staggerChildren: 0.05 } },
    },
    item: {
      hidden: { x: -20, opacity: 0 },
      show: { x: 0, opacity: 1, transition: { duration: 0.3 } },
    },
  },
  scaleUp: {
    container: {
      hidden: { opacity: 1 },
      show: { opacity: 1, transition: { staggerChildren: 0.05 } },
    },
    item: {
      hidden: { scale: 0.5, opacity: 0 },
      show: { scale: 1, opacity: 1, transition: { duration: 0.3 } },
    },
  },
  scaleDown: {
    container: {
      hidden: { opacity: 1 },
      show: { opacity: 1, transition: { staggerChildren: 0.05 } },
    },
    item: {
      hidden: { scale: 1.5, opacity: 0 },
      show: { scale: 1, opacity: 1, transition: { duration: 0.3 } },
    },
  },
  blurInDown: {
    container: {
      hidden: { opacity: 1 },
      show: { opacity: 1, transition: { staggerChildren: 0.05 } },
    },
    item: {
      hidden: { opacity: 0, filter: "blur(10px)", y: -20 },
      show: { opacity: 1, filter: "blur(0px)", y: 0, transition: { duration: 0.3 } },
    },
  },
};

const TextAnimateBase = ({
  children,
  delay = 0,
  duration = 0.3,
  variants,
  className,
  segmentClassName,
  as: Component = "p",
  startOnView = true,
  once = false,
  by = "word",
  animation = "fadeIn",
  ...props
}: TextAnimateProps) => {
  const MotionComponent = motion.create(Component);

  let segments: string[] = [];
  switch (by) {
    case "word":
      segments = children.split(/(\s+)/);
      break;
    case "character":
      segments = children.split("");
      break;
    case "line":
      segments = children.split("\n");
      break;
    case "text":
    default:
      segments = [children];
      break;
  }

  const finalVariants = variants
    ? {
        container: {
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              opacity: { duration: 0.01, delay },
              delayChildren: delay,
              staggerChildren: duration / segments.length,
            },
          },
        },
        item: variants,
      }
    : defaultAnimationVariants[animation];

  return (
    <AnimatePresence mode="popLayout">
      <MotionComponent
        variants={finalVariants.container as Variants}
        initial="hidden"
        whileInView={startOnView ? "show" : undefined}
        animate={startOnView ? undefined : "show"}
        className={cn("whitespace-pre-wrap", className)}
        viewport={{ once }}
        {...props}
      >
        {segments.map((segment, i) => (
          <motion.span
            key={`${by}-${segment}-${i}`}
            variants={finalVariants.item}
            className={cn(
              by === "line" ? "block" : "inline-block whitespace-pre",
              segmentClassName,
            )}
          >
            {segment}
          </motion.span>
        ))}
      </MotionComponent>
    </AnimatePresence>
  );
};

export const TextAnimate = memo(TextAnimateBase);