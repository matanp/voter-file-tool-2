import React, { useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";

export type DateOfBirthMode = "single" | "range";

interface DateModeSelectorProps {
  currentMode: DateOfBirthMode;
  onModeChange: (mode: DateOfBirthMode) => void;
  ariaLabel?: string;
}

/**
 * DateModeSelector component for switching between single date and date range modes.
 * Provides a dropdown interface for selecting the search type.
 */
export const DateModeSelector: React.FC<DateModeSelectorProps> = ({
  currentMode,
  onModeChange,
  ariaLabel = "Select search type",
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleModeChange = useCallback((newMode: DateOfBirthMode) => {
    onModeChange(newMode);
    setIsDropdownOpen(false);
  }, [onModeChange]);

  const getModeDisplayName = (mode: DateOfBirthMode): string => {
    switch (mode) {
      case "single":
        return "Single Date";
      case "range":
        return "Date Range";
      default:
        return "Single Date";
    }
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Search Type
      </label>
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        aria-expanded={isDropdownOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
      >
        <span>{getModeDisplayName(currentMode)}</span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {isDropdownOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <ul role="listbox" className="py-1">
            {(["single", "range"] as const).map((option) => (
              <li key={option}>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                    currentMode === option
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-900"
                  }`}
                  onClick={() => handleModeChange(option)}
                  role="option"
                  aria-selected={currentMode === option}
                >
                  {getModeDisplayName(option)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
