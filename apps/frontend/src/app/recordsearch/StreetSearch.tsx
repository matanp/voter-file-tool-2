import React, { useState, useRef, useCallback } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import { SEARCH_DROPDOWN_WIDTH } from "~/lib/constants/sizing";

export interface StreetSearchProps {
  streets: string[];
  initialValue?: string;
  onChange: (search: string) => void;
}

export const StreetSearch: React.FC<StreetSearchProps> = ({
  streets,
  initialValue = "",
  onChange,
}) => {
  const [search, setSearch] = useState<string>(initialValue);
  const debouncedSearch = useDebouncedValue(search);
  const lastImmediateEmitRef = useRef<string | null>(null);

  React.useEffect(() => {
    // Skip calling onChange if this value was already emitted immediately
    if (debouncedSearch === lastImmediateEmitRef.current) {
      lastImmediateEmitRef.current = null; // Clear the ref after skipping
      return;
    }
    onChange(debouncedSearch);
  }, [debouncedSearch, onChange]);

  const handleInputChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const matches = streets
    .filter((street) =>
      street.toLowerCase().startsWith(debouncedSearch.toLowerCase()),
    )
    .slice(0, 2);

  const firstMatch = matches[0];

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Tab" && firstMatch && search !== "") {
        event.preventDefault();
        setSearch(firstMatch);
        lastImmediateEmitRef.current = firstMatch;
        onChange(firstMatch);
      }
    },
    [firstMatch, search, onChange],
  );

  const handleFillClick = useCallback(
    (match: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setSearch(match);
      lastImmediateEmitRef.current = match;
      onChange(match);
    },
    [onChange],
  );

  return (
    <div className={`${SEARCH_DROPDOWN_WIDTH} max-w-md mx-auto`}>
      <Input
        placeholder="Enter Street"
        value={search}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={`mb-2 w-full ${debouncedSearch !== "" && matches.length === 0 && "border-red-500"}`}
      />

      {matches.length > 0 && search !== "" && debouncedSearch !== "" && (
        <div className="space-y-2">
          {matches.map((match, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-gray-700 ml-3">{match}</span>
              <Button
                onClick={handleFillClick(match)}
              >{`Fill${index === 0 ? " (Tab)" : ""}`}</Button>
            </div>
          ))}
        </div>
      )}
      {debouncedSearch !== "" && matches.length === 0 && (
        <p className="text-destructive">No matches found</p>
      )}
    </div>
  );
};
