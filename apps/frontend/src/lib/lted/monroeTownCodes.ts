/**
 * Monroe County town code → CommitteeList.cityTown (21 entries).
 * Codes follow alphabetical town order. Each town code covers one LD (45-64),
 * except 080 (Rochester city wards). Checked against the 2024 LTED matrix, the
 * 2026 voter file and the BOE elected committee list.
 */
export const TOWN_CODE_TO_CITY: Record<string, string> = {
  "005": "BRIGHTON",
  "010": "CHILI",
  "015": "CLARKSON",
  "017": "EAST ROCHESTER",
  "020": "GATES",
  "025": "GREECE",
  "030": "HAMLIN",
  "035": "HENRIETTA",
  "040": "IRONDEQUOIT",
  "045": "MENDON",
  "050": "OGDEN",
  "055": "PARMA",
  "060": "PENFIELD",
  "065": "PERINTON",
  "070": "PITTSFORD",
  "075": "RIGA",
  "080": "ROCHESTER",
  "085": "RUSH",
  "090": "SWEDEN",
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
