import type { GeoUnitId } from "@/types/geo";

export interface MunicipalityIdentity {
  geoUnitId: GeoUnitId;
  code: string;
  nameOfficial: string;
  nameDisplay: string;
  nameAscii: string;
  slug: string;
  areaKm2: number;
  centroid: { lat: number; lng: number };
  labelPoint: { lat: number; lng: number };
  bbox: [number, number, number, number];
}

export interface NeighboursData {
  [geoUnitId: GeoUnitId]: GeoUnitId[];
}

export interface ClassificationsData {
  [geoUnitId: GeoUnitId]: {
    corridor?: string;
    geographyType?: string;
    morphologyType?: string;
    populationSize?: string;
    densityType?: string;
    mobilityType?: string;
    learningDifficulty?: string;
    difficultyScore?: number;
    difficultyLabel?: string;
    [key: string]: string | number | boolean | null | undefined;
  };
}

export interface AttributeBundle {
  identity: Record<GeoUnitId, MunicipalityIdentity>;
  neighbours: NeighboursData;
  classifications: ClassificationsData;
}

let cachedBundle: AttributeBundle | null = null;
let cachedGeoJSON: GeoJSON.FeatureCollection | null = null;

export async function loadGeoJSON(): Promise<GeoJSON.FeatureCollection | null> {
  if (cachedGeoJSON) return cachedGeoJSON;
  try {
    const res = await fetch("/data/community/boundaries/municipalities_simplified.geojson");
    if (!res.ok) return null;
    cachedGeoJSON = await res.json();
    return cachedGeoJSON;
  } catch {
    return null;
  }
}

export async function loadAttributeBundle(): Promise<AttributeBundle> {
  if (cachedBundle) return cachedBundle;

  const [identityRes, neighboursRes, classificationsRes] = await Promise.allSettled([
    fetch("/data/community/attributes/identity.json").then((r) => (r.ok ? r.json() : null)),
    fetch("/data/community/derived/neighbours.json").then((r) => (r.ok ? r.json() : null)),
    fetch("/data/community/attributes/classifications.json").then((r) => (r.ok ? r.json() : null)),
  ]);

  cachedBundle = {
    identity: identityRes.status === "fulfilled" && identityRes.value ? identityRes.value : {},
    neighbours: neighboursRes.status === "fulfilled" && neighboursRes.value ? neighboursRes.value : {},
    classifications: classificationsRes.status === "fulfilled" && classificationsRes.value ? classificationsRes.value : {},
  };

  return cachedBundle;
}

export function getMunicipalityValue(
  bundle: AttributeBundle,
  geoUnitId: GeoUnitId,
  attributeKey: string
): string | number | boolean | null {
  const identity = bundle.identity[geoUnitId];
  if (identity && attributeKey in identity) {
    return (identity as unknown as Record<string, unknown>)[attributeKey] as string | number | boolean | null;
  }

  const classification = bundle.classifications[geoUnitId];
  if (classification && attributeKey in classification) {
    return classification[attributeKey] as string | number | boolean | null;
  }

  if (attributeKey === "neighboursCount") {
    const n = bundle.neighbours[geoUnitId];
    return n ? n.length : null;
  }

  return null;
}

export function getAllValues(
  bundle: AttributeBundle,
  attributeKey: string,
  geoUnitIds: GeoUnitId[]
): Array<{ geoUnitId: GeoUnitId; value: string | number | boolean | null }> {
  return geoUnitIds.map((id) => ({
    geoUnitId: id,
    value: getMunicipalityValue(bundle, id, attributeKey),
  }));
}
