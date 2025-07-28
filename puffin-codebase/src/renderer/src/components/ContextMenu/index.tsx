
import React from 'react';
import './styles.css';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onDelete: () => void;
  onRename: () => void;
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ 
  x, 
  y, 
  onClose, 
  onCreateFile,
  onCreateFolder,
  onDelete,
  onRename,
  onCopy,
  onPaste,
  canPaste
}) => {
  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      className="context-menu"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing it
    >
      <ul>
        <li onClick={() => handleAction(onCreateFile)}>Create File</li>
        <li onClick={() => handleAction(onCreateFolder)}>Create Folder</li>
        <hr />
        <li onClick={() => handleAction(onRename)}>Rename</li>
        <li onClick={() => handleAction(onDelete)}>Delete</li>
        <hr />
        <li onClick={() => handleAction(onCopy)}>Copy</li>
        <li onClick={() => handleAction(onPaste)} className={!canPaste ? 'disabled' : ''}>
          Paste
        </li>
        <hr />
        <li>Analyze with AI</li>
      </ul>
    </div>
  );
};

export default ContextMenu;
