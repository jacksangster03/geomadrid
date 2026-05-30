export type GeoUnitId = string;

export type GeoDatasetId =
  | "community_municipalities"
  | "madrid_districts"
  | "madrid_barrios";

export interface GeoUnitBase {
  geoUnitId: GeoUnitId;
  datasetId: GeoDatasetId;
  code: string;
  nameOfficial: string;
  nameDisplay: string;
  nameAscii: string;
  slug: string;
  areaKm2: number;
  centroid: { lat: number; lng: number };
  labelPoint: { lat: number; lng: number };
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  neighbours: GeoUnitId[];
  classifications: Record<string, string | number | boolean | null>;
  metrics: Record<string, number | string | null>;
}

export interface MunicipalityFeatureProperties {
  geoUnitId: GeoUnitId;
  nameDisplay: string;
  nameAscii: string;
  areaKm2?: number;
  [key: string]: unknown;
}

export interface DatasetMeta {
  id: GeoDatasetId;
  label: string;
  expectedCount: number;
  boundaryFile: string;
  simplifiedFile: string;
  attributeFiles: string[];
}

export const DATASETS: Record<GeoDatasetId, DatasetMeta> = {
  community_municipalities: {
    id: "community_municipalities",
    label: "Community of Madrid — 179 municipalities",
    expectedCount: 179,
    boundaryFile: "/data/community/boundaries/municipalities_simplified.geojson",
    simplifiedFile: "/data/community/boundaries/municipalities_simplified.geojson",
    attributeFiles: [
      "/data/community/attributes/identity.json",
      "/data/community/attributes/classifications.json",
    ],
  },
  madrid_districts: {
    id: "madrid_districts",
    label: "Madrid City — 21 districts",
    expectedCount: 21,
    boundaryFile: "/data/districts/boundaries/districts_simplified.geojson",
    simplifiedFile: "/data/districts/boundaries/districts_simplified.geojson",
    attributeFiles: [],
  },
  madrid_barrios: {
    id: "madrid_barrios",
    label: "Madrid City — 131 barrios",
    expectedCount: 131,
    boundaryFile: "/data/barrios/boundaries/barrios_simplified.geojson",
    simplifiedFile: "/data/barrios/boundaries/barrios_simplified.geojson",
    attributeFiles: [],
  },
};
