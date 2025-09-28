import { useState, useEffect, useRef, useCallback } from "react";
import { ComboboxDropdown } from "~/components/ui/ComboBox";

export interface CityTownSearchProps {
  cities: string[];
  initialCity?: string;
  initialTown?: string;
  onChange: (city: string, town: string) => void;
}

const CITY_TOWN_MAP = [
  {
    name: "ROCHESTER",
    info: {
      name: "City Council",
      towns: [
        {
          code: "NE",
          name: "Northeast",
        },
        {
          code: "NW",
          name: "Northwest",
        },
        {
          code: "S",
          name: "South",
        },
        {
          code: "E",
          name: "East",
        },
      ],
    },
  },
  {
    name: "GREECE",
    info: {
      name: "Town Ward",
      towns: [
        {
          code: "01",
          name: "01",
        },
        {
          code: "02",
          name: "02",
        },
        {
          code: "03",
          name: "03",
        },
        {
          code: "04",
          name: "04",
        },
      ],
    },
  },
  {
    name: "Brockport",
    info: {
      name: "Village",
      towns: [
        {
          code: "BR",
          name: "Sweden",
        },
      ],
    },
  },
  {
    name: "Churchville",
    info: {
      name: "Village",
      towns: [
        {
          code: "CH",
          name: "Riga",
        },
      ],
    },
  },
  {
    name: "East Rochester",
    info: {
      name: "Village",
      towns: [
        {
          code: "ER",
          name: "East Rochester",
        },
      ],
    },
  },
  {
    name: "Fairport",
    info: {
      name: "Village",
      towns: [
        {
          code: "FP",
          name: "Perinton",
        },
      ],
    },
  },
  {
    name: "Hilton",
    info: {
      name: "Village",
      towns: [
        {
          code: "HI",
          name: "Parma",
        },
      ],
    },
  },
  {
    name: "Honeoye Falls",
    info: {
      name: "Village",
      towns: [
        {
          code: "HF",
          name: "Mendon",
        },
      ],
    },
  },
  {
    name: "Pittsford",
    info: {
      name: "Village",
      towns: [
        {
          code: "PI",
          name: "Pittsford",
        },
      ],
    },
  },
  {
    name: "Scottsville",
    info: {
      name: "Village",
      towns: [
        {
          code: "SC",
          name: "Wheatland",
        },
      ],
    },
  },
  {
    name: "Spencerport",
    info: {
      name: "Village",
      towns: [
        {
          code: "SP",
          name: "Ogden",
        },
      ],
    },
  },
  {
    name: "Webster",
    info: {
      name: "Village",
      towns: [
        {
          code: "WE",
          name: "Webster",
        },
      ],
    },
  },
];

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
    onChangeRef.current(initialCity, initialTown);
  }, [initialCity, initialTown]);

  const townInfo = CITY_TOWN_MAP.find(
    (cityMapItem) => cityMapItem.name.toLowerCase() === city.toLowerCase(),
  );

  const handleCityChange = useCallback((value: string) => {
    setCity(value);
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
