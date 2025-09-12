"use client";

import React from "react";

interface ErrorDisplayProps {
  errors: Partial<Record<string, string>>;
  hasUserSubmitted: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  errors,
  hasUserSubmitted,
}) => {
  const visibleErrors = Object.entries(errors).filter(
    ([, msg]) => typeof msg === "string" && msg.trim().length > 0,
  );
  const hasErrors = visibleErrors.length > 0;

  if (!hasErrors && !hasUserSubmitted) {
    return null;
  }

  if (hasErrors) {
    return (
      <div
        className="bg-red-50 border border-red-200 rounded-md p-3 animate-in slide-in-from-top-2 duration-200"
        role="alert"
        aria-live="polite"
      >
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Please fix the following errors:
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <ul className="list-disc list-inside space-y-1">
                {visibleErrors.map(([key, error]) => (
                  <li key={key} className="animate-in fade-in duration-200">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success message when all errors are cleared
  return (
    <div
      className="bg-green-50 border border-green-200 rounded-md p-3 animate-in slide-in-from-top-2 duration-200"
      role="alert"
      aria-live="polite"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-green-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-green-800">
            All validation errors have been resolved.
          </p>
        </div>
      </div>
    </div>
  );
};
