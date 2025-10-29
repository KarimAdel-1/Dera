'use client';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const NotificationToast = ({ message, type }) => {
  const styles = {
    success: 'border-green-500/20 bg-green-500/10 text-green-600',
    error: 'border-red-500/20 bg-red-500/10 text-red-600',
    warning: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-600',
    info: 'border-blue-500/20 bg-blue-500/10 text-blue-600'
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-in">
      <div className={`${styles[type]} border-l-4 px-6 py-4 rounded-[12px] shadow-lg flex items-center space-x-3 bg-[var(--color-bg-secondary)]`}>
        {icons[type]}
        <span className="text-[14px] text-[var(--color-text-primary)]">{message}</span>
      </div>
    </div>
  );
};

export default NotificationToast;
