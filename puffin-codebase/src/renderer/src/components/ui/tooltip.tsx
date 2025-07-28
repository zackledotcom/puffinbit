// Simple tooltip stubs replacing Radix Tooltip so code compiles in the browser build.

import * as React from 'react';
import { cn } from '@/lib/utils';

export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

export const Tooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

interface TriggerProps extends React.HTMLAttributes<HTMLSpanElement> {
  asChild?: boolean;
}
export const TooltipTrigger: React.FC<TriggerProps> = ({ children, className }) => (
  <span className={cn(className)}>{children}</span>
);

interface ContentProps {
  children: React.ReactNode;
  className?: string;
}
export const TooltipContent: React.FC<ContentProps> = ({ children, className }) => (
  <span className={cn('ml-1 text-xs text-gray-400', className)}>{children}</span>
);
