import { useState } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

export const StreetSearch: React.FC<{
  streets: string[];
  onChange: (search: string) => void;
}> = ({ streets, onChange }) => {
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  let timer: NodeJS.Timeout | null = null;

  const debounceHandler = (value: string) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      setDebouncedSearch(value);
      onChange(value);
    }, 250);
  };

  const handleInputChange = (value: string) => {
    setSearch(value);
    debounceHandler(value);
  };

  const matches = streets
    .filter((street) =>
      street.toLowerCase().startsWith(debouncedSearch.toLowerCase()),
    )
    .slice(0, 2);

  const firstMatch = matches[0];

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Tab" && firstMatch && search !== "") {
      event.preventDefault();
      setSearch(firstMatch);
      setDebouncedSearch("");
      onChange(firstMatch);
    }
  };

  return (
    <div className="w-[185px] max-w-md mx-auto">
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
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  setSearch(match);
                  setDebouncedSearch("");
                  onChange(match);
                }}
              >{`Fill${index === 0 ? " (Tab)" : ""}`}</Button>
            </div>
          ))}
        </div>
      )}
      {debouncedSearch !== "" && matches.length === 0 && (
        <p className="text-red-500">No matches found</p>
      )}
    </div>
  );
};
