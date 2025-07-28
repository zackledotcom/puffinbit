import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DESIGN_TOKENS, MOTION_PRESETS } from '@/lib/design-system';

interface MessageComponentProps {
  message: {
    id: number | string;
    content: string;
    isUser: boolean;
    timestamp: Date;
    responseTime?: number;
    status?: 'sending' | 'sent' | 'error';
  };
  className?: string;
}

export const MessageComponent: React.FC<MessageComponentProps> = ({ 
  message, 
  className 
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const messageVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        duration: DESIGN_TOKENS.animation.duration.normal / 1000,
        ease: DESIGN_TOKENS.animation.easing.default
      }
    },
    exit: { 
      opacity: 0, 
      y: -20, 
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  const actionTrayVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 10 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        duration: 0.15,
        ease: DESIGN_TOKENS.animation.easing.smooth
      }
    }
  };

  return (
    <motion.div
      className={cn(
        "group relative mb-6 flex w-full",
        message.isUser ? "justify-end" : "justify-start",
        className
      )}
      variants={messageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      onHoverStart={() => {
        setShowActions(true);
        setIsHovered(true);
      }}
      onHoverEnd={() => {
        setShowActions(false);
        setIsHovered(false);
      }}
    >
      <div
        className={cn(
          "relative max-w-[80%] rounded-xl px-4 py-3",
          "backdrop-blur-sm transition-all duration-200",
          "transform-gpu will-change-transform",
          message.isUser
            ? "bg-blue-500 text-white ml-12 hover:bg-blue-600"
            : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mr-12",
          "hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5",
          "border border-transparent",
          !message.isUser && "hover:border-gray-200 dark:hover:border-gray-700"
        )}
        style={{
          boxShadow: isHovered 
            ? '0 8px 25px -8px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)'
            : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* AI Avatar */}
        {!message.isUser && (
          <motion.div 
            className="absolute -left-3 top-3 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-medium shadow-md"
            animate={{ scale: isHovered ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
          >
            AI
          </motion.div>
        )}
        
        {/* Message Content */}
        <div className="text-sm leading-relaxed">
          {message.content}
        </div>
        
        {/* Message Metadata */}
        <div className="flex items-center justify-between mt-2 text-xs opacity-70">
          <span>
            {message.timestamp instanceof Date && !isNaN(message.timestamp.getTime()) 
              ? message.timestamp.toLocaleTimeString() 
              : new Date().toLocaleTimeString()}
          </span>
          <div className="flex items-center gap-2">
            {message.responseTime && (
              <motion.span 
                className="bg-black/10 dark:bg-white/10 px-2 py-1 rounded-full"
                {...MOTION_PRESETS.scaleIn}
              >
                {message.responseTime}ms
              </motion.span>
            )}
            {message.status === 'sending' && (
              <motion.div
                className="w-3 h-3"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
                  <circle 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeDasharray="32"
                    strokeDashoffset="32"
                    className="opacity-30"
                  />
                  <circle 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeDasharray="8"
                    strokeLinecap="round"
                  />
                </svg>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      
      {/* Magic UI Action Tray */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 flex gap-1 z-10",
              message.isUser ? "left-0 -ml-16" : "right-0 -mr-16"
            )}
            variants={actionTrayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <motion.button 
              className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title="Copy"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            </motion.button>
            <motion.button 
              className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title="Retry"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/>
                <line x1="12" x2="12" y1="3" y2="15"/>
              </svg>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
