import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import type { Toast } from '../../App';

interface ToastContainerProps {
  toasts: Toast[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        return (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' && <CheckCircle2 size={16} />}
            {toast.type === 'error' && <AlertCircle size={16} />}
            {toast.type === 'info' && <Info size={16} />}
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
