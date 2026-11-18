import React from 'react';
import { UploadCloud } from 'lucide-react';

export const DragOverlay: React.FC = () => {
  return (
    <div className="drag-overlay">
      <div className="drag-overlay-text">
        <UploadCloud size={28} />
        <span>Drop files here to upload to NimbusFS</span>
      </div>
    </div>
  );
};

export default DragOverlay;
