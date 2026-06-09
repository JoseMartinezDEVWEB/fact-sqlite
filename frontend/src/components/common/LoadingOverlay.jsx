import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingOverlay = ({ 
  isVisible, 
  message = 'Procesando...', 
  showSpinner = true,
  zIndex = 50 
}) => {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center"
      style={{ zIndex }}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 flex flex-col items-center space-y-4 min-w-[200px]">
        {showSpinner && (
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        )}
        <p className="text-gray-700 font-medium text-center">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;



