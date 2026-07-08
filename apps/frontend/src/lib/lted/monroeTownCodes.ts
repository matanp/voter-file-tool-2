/** Monroe County town code → CommitteeList.cityTown (21 entries). */
export const TOWN_CODE_TO_CITY: Record<string, string> = {
  "005": "BRIGHTON",
  "010": "CHILI",
  "015": "CLARKSON",
  "017": "CLARKSON",
  "020": "EAST ROCHESTER",
  "025": "BRIGHTON",
  "030": "GATES",
  "035": "GATES",
  "040": "GREECE",
  "045": "HAMLIN",
  "050": "HENRIETTA",
  "055": "OGDEN",
  "060": "RIGA",
  "065": "RUSH",
  "070": "SWEDEN",
  "075": "PENFIELD",
  "080": "ROCHESTER",
  "085": "PERINTON",
  "090": "PITTSFORD",
  "095": "WEBSTER",
  "100": "WHEATLAND",
};

export type CityTownLookupMode = "strict" | "fallback";

/** Resolve a normalized town code to cityTown; strict returns null when unknown. */
export function lookupCityTown(
  townCode: string,
  mode: CityTownLookupMode,
): string | null {
  const city = TOWN_CODE_TO_CITY[townCode];
  if (city) {
    return city.trim().toUpperCase();
  }
  if (mode === "strict") {
    return null;
  }
  return townCode.trim().toUpperCase();
}
