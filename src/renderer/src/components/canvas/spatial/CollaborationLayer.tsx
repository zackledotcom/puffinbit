import React from 'react';

interface CollaborationLayerProps {
  isEnabled: boolean;
}

export const CollaborationLayer: React.FC<CollaborationLayerProps> = ({
  isEnabled,
}) => {
  if (!isEnabled) return null;

  return (
    <group>
      {/* Collaboration indicators can be added here */}
      {/* For now, this is a placeholder for future collaboration features */}
    </group>
  );
};
