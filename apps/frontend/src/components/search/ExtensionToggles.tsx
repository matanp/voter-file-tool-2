import React from "react";

interface ExtensionTogglesProps {
  extendBefore: boolean;
  extendAfter: boolean;
  onToggleChange: (
    field: "extendBefore" | "extendAfter",
    value: boolean,
  ) => void;
}

/**
 * ExtensionToggles component for enabling/disabling date range extensions.
 * Allows users to extend searches to include earlier or later dates.
 */
export const ExtensionToggles: React.FC<ExtensionTogglesProps> = ({
  extendBefore,
  extendAfter,
  onToggleChange,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Extend search range
        </label>
      </div>
      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={extendBefore}
            onChange={(e) => onToggleChange("extendBefore", e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Include earlier dates</span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={extendAfter}
            onChange={(e) => onToggleChange("extendAfter", e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Include later dates</span>
        </label>
      </div>
    </div>
  );
};
