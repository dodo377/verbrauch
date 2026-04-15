import React, { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const bgColor = type === 'error' ? 'bg-red-600' : 'bg-green-600';
  const icon = type === 'error' ? '✕' : '✓';

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-pulse">
      <div className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2`}>
        <span className="font-bold">{icon}</span>
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}
