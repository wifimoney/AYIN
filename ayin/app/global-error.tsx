"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-white dark:bg-gray-950 min-h-screen flex items-center justify-center font-sans antialiased">
        <div className="max-w-md w-full mx-4 p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Something went wrong
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              We apologize for the inconvenience. The error has been logged and we're looking into it.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0000FF] dark:bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] text-gray-400 dark:text-gray-600 font-mono">
              Error Digest: {error.digest || 'Unknown'}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
