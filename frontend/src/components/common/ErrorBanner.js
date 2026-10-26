import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const ErrorBanner = ({
  message = "Failed to load data.",
  details = null,
  onRetry = null
}) => {
  return (
    <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 my-4 flex items-start justify-between gap-4 text-rose-200">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-rose-200">{message}</h4>
          {details && (
            <p className="text-xs text-rose-300/80 mt-1 font-mono break-all">{details}</p>
          )}
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/50 hover:bg-rose-900 text-xs font-medium text-rose-100 border border-rose-700 transition-colors flex-shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
};

export default ErrorBanner;
