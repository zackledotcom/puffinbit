import React from 'react';

interface Props {
  currentInput: string;
  setInput: (v: string) => void;
  onStructureApplied: (v: string) => void;
}

const PlaceholderBar: React.FC<Props> = () => (
  <div className="flex flex-wrap gap-2 py-2 border-b border-white/10">
    <span className="text-xs text-white/50">No enhancement features available.</span>
  </div>
);

export default PlaceholderBar;