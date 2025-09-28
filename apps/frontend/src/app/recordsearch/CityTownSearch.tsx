import { useState, useEffect, useRef, useCallback } from "react";
import { ComboboxDropdown } from "~/components/ui/ComboBox";
import { CITY_TOWN_CONFIG } from "~/lib/searchConfiguration";

export interface CityTownSearchProps {
  cities: string[];
  initialCity?: string;
  initialTown?: string;
  onChange: (city: string, town: string) => void;
}

export const CityTownSearch: React.FC<CityTownSearchProps> = ({
  cities,
  initialCity = "",
  initialTown = "",
  onChange,
}) => {
  const [city, setCity] = useState<string>(initialCity);
  const [town, setTown] = useState<string>(initialTown);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync local state with initial props when they change
  useEffect(() => {
    setCity(initialCity);
    setTown(initialTown);
    // Only call onChange if the incoming values differ from current local state
    if (initialCity !== city || initialTown !== town) {
      onChangeRef.current(initialCity, initialTown);
    }
  }, [initialCity, initialTown, city, town]);

  const townInfo = CITY_TOWN_CONFIG.find(
    (cityMapItem) => cityMapItem.name.toLowerCase() === city.toLowerCase(),
  );

  const handleCityChange = useCallback((value: string) => {
    setCity(value);
    setTown("");
    onChangeRef.current(value, "");
  }, []);

  const handleTownChange = useCallback(
    (value: string) => {
      if (value === town) {
        setTown("");
        onChangeRef.current(city, "");
        return;
      }
      setTown(value);
      onChangeRef.current(city, value);
    },
    [city, town],
  );

  return (
    <div className="w-full max-w-md mx-auto">
      <ComboboxDropdown
        items={cities.map((city) => {
          return { label: city, value: city };
        })}
        initialValue={city}
        displayLabel={"Select City"}
        onSelect={handleCityChange}
      />
      {townInfo && (
        <>
          <p className="pl-4 pt-2 font-light">{townInfo.info.name}</p>
          <ComboboxDropdown
            items={townInfo.info.towns.map((town) => {
              return { label: town.name, value: town.code };
            })}
            initialValue={town}
            displayLabel={`Select ${townInfo.info.name}`}
            onSelect={handleTownChange}
          />
        </>
      )}
    </div>
  );
};
