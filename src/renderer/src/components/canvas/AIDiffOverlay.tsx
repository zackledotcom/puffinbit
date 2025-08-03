import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Download, Copy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AIDiffOverlayProps {
  isVisible: boolean;
  originalCode: string;
  suggestedCode: string;
  onAccept: () => void;
  onReject: () => void;
  onApply: () => void;
  onClose: () => void;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber?: number;
}

const AIDiffOverlay: React.FC<AIDiffOverlayProps> = ({
  isVisible,
  originalCode,
  suggestedCode,
  onAccept,
  onReject,
  onApply,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  const generateDiff = (): DiffLine[] => {
    const originalLines = originalCode.split('\n');
    const suggestedLines = suggestedCode.split('\n');
    const diff: DiffLine[] = [];

    // Simple diff algorithm
    const maxLength = Math.max(originalLines.length, suggestedLines.length);
    
    for (let i = 0; i < maxLength; i++) {
      const originalLine = originalLines[i];
      const suggestedLine = suggestedLines[i];

      if (originalLine === suggestedLine) {
        diff.push({ type: 'unchanged', content: originalLine || '', lineNumber: i + 1 });
      } else {
        if (originalLine && originalLine !== suggestedLine) {
          diff.push({ type: 'removed', content: originalLine, lineNumber: i + 1 });
        }
        if (suggestedLine && suggestedLine !== originalLine) {
          diff.push({ type: 'added', content: suggestedLine, lineNumber: i + 1 });
        }
      }
    }

    return diff;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(suggestedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const diff = generateDiff();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#232c3d]/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#93b3f3] flex justify-center items-center">
                  <Zap size={18} className="text-black" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">AI Code Suggestions</h3>
                  <p className="text-sm text-white/60">Review the proposed changes below</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Diff Content */}
            <div className="flex-1 overflow-auto max-h-96 font-mono text-sm bg-[#232c3d]/20">
              <div className="p-4">
                {diff.map((line, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.01 }}
                    className={cn(
                      'flex items-center py-1 px-3 rounded-lg mb-1',
                      line.type === 'added' && 'bg-green-500/10 border-l-4 border-green-400',
                      line.type === 'removed' && 'bg-red-500/10 border-l-4 border-red-400',
                      line.type === 'unchanged' && 'bg-white/5 border-l-4 border-white/10'
                    )}
                  >
                    <span className="w-12 text-white/40 text-xs mr-4 select-none">
                      {line.lineNumber}
                    </span>
                    <span className={cn(
                      'mr-3 font-bold',
                      line.type === 'added' && 'text-green-400',
                      line.type === 'removed' && 'text-red-400',
                      line.type === 'unchanged' && 'text-white/20'
                    )}>
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                    </span>
                    <span className={cn(
                      'flex-1 whitespace-pre-wrap',
                      line.type === 'added' && 'text-green-100',
                      line.type === 'removed' && 'text-red-100',
                      line.type === 'unchanged' && 'text-white/80'
                    )}>
                      {line.content || ' '}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between p-4 border-t border-white/10 bg-[#303030]/30">
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Copy size={14} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={onReject}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-colors"
                >
                  <X size={14} />
                  Reject
                </button>
                
                <button
                  onClick={onApply}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#93b3f3] hover:text-white hover:bg-[#93b3f3]/10 border border-[#93b3f3]/30 rounded-lg transition-colors"
                >
                  <Download size={14} />
                  Apply
                </button>
                
                <button
                  onClick={onAccept}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                >
                  <Check size={14} />
                  Accept
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIDiffOverlay;