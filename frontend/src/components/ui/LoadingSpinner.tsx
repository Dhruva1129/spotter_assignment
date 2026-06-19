import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div
        className={`${sizeClasses[size]} rounded-full border-slate-600 border-t-amber-500 animate-spin`}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p className="text-slate-400 text-sm font-medium animate-pulse">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
