import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DESIGN_TOKENS, MOTION_PRESETS, withReducedMotion } from '@/lib/design-system';

// Enhanced Sidebar with Magic UI-style interactions
interface EfficientSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export const EfficientSidebar: React.FC<EfficientSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  className
}) => {
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);

  const sidebarItems = [
    { id: 'chat', icon: '💬', label: 'Chat', active: true },
    { id: 'models', icon: '🤖', label: 'Models', active: false },
    { id: 'memory', icon: '🧠', label: 'Memory', active: false },
    { id: 'agents', icon: '⚡', label: 'Agents', active: false },
    { id: 'settings', icon: '⚙️', label: 'Settings', active: false },
  ];

  const sidebarVariants = withReducedMotion({
    collapsed: { 
      width: DESIGN_TOKENS.layout.sidebar.width.collapsed,
      transition: { duration: DESIGN_TOKENS.animation.duration.normal / 1000, ease: DESIGN_TOKENS.animation.easing.default }
    },
    expanded: { 
      width: DESIGN_TOKENS.layout.sidebar.width.expanded,
      transition: { duration: DESIGN_TOKENS.animation.duration.normal / 1000, ease: DESIGN_TOKENS.animation.easing.default }
    }
  });

  return (
    <motion.div
      className={cn(
        "relative h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800",
        "flex flex-col transition-all duration-300 ease-out",
        className
      )}
      variants={sidebarVariants}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      style={{ minWidth: isCollapsed ? DESIGN_TOKENS.layout.sidebar.width.collapsed : DESIGN_TOKENS.layout.sidebar.width.expanded }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800" style={{ height: DESIGN_TOKENS.layout.header.height }}>
        <div className="flex items-center justify-between h-full">
          <motion.div
            className="flex items-center gap-3"
            animate={{ opacity: isCollapsed ? 0 : 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            {!isCollapsed && (
              <motion.h1 
                className="font-semibold text-gray-900 dark:text-gray-100"
                {...MOTION_PRESETS.fadeIn}
              >
                Puffer
              </motion.h1>
            )}
          </motion.div>
          <motion.button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            {...MOTION_PRESETS.buttonHover}
          >
            <motion.svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <path d="M15 18l-6-6 6-6" />
            </motion.svg>
          </motion.button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-2 space-y-1">
        {sidebarItems.map((item) => (
          <motion.button
            key={item.id}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200",
              "hover:bg-gray-100 dark:hover:bg-gray-800",
              item.active && "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
            )}
            onHoverStart={() => setHoveredIcon(item.id)}
            onHoverEnd={() => setHoveredIcon(null)}
            {...MOTION_PRESETS.buttonHover}
          >
            <motion.span
              className="text-xl flex-shrink-0"
              animate={{ 
                scale: hoveredIcon === item.id ? 1.2 : 1,
                rotate: hoveredIcon === item.id ? 5 : 0
              }}
              transition={{ duration: 0.2 }}
            >
              {item.icon}
            </motion.span>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  className="font-medium truncate"
                  {...MOTION_PRESETS.fadeIn}
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      {/* System Status */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <motion.div
          className="flex items-center gap-3"
          animate={{ opacity: isCollapsed ? 0 : 1 }}
        >
          <div className="flex gap-1">
            <motion.div 
              className="w-2 h-2 bg-green-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <motion.div 
              className="w-2 h-2 bg-yellow-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
            />
            <motion.div 
              className="w-2 h-2 bg-blue-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2, delay: 1 }}
            />
          </div>
          {!isCollapsed && (
            <span className="text-xs text-gray-500">All systems operational</span>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};
