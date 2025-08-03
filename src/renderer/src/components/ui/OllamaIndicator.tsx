import React from 'react';
import { Ollama } from '@lobehub/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface OllamaStatus {
  connected: boolean;
  message: string;
  starting?: boolean;
}

interface OllamaIndicatorProps {
  status: OllamaStatus;
  className?: string;
  size?: number;
}

/**
 * Displays the Ollama logo with color coding to indicate service status.
 * - Green: connected
 * - Yellow (pulse): starting
 * - Red: disconnected
 */
const OllamaIndicator: React.FC<OllamaIndicatorProps> = ({
  status,
  className,
  size = 20,
}) => {
  const { connected, starting, message } = status;

  const color = connected ? 'text-emerald-500' : starting ? 'text-yellow-500' : 'text-red-500';
  const animation = starting ? 'animate-pulse' : '';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn('flex items-center justify-center', color, animation, className)}
            title={message}
          >
            <Ollama size={size} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default OllamaIndicator;
