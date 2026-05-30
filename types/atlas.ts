export type LayerGroup =
  | "overview"
  | "demography"
  | "politics"
  | "geography"
  | "mobility"
  | "economy"
  | "housing"
  | "services"
  | "culture"
  | "environment"
  | "game";

export interface AtlasLayerConfig {
  id: string;
  label: string;
  group: LayerGroup;
  description: string;
  sourceKey: string;
  attributeKey: string;
  type: "numeric" | "categorical" | "boolean";
  legendType: "gradient" | "buckets" | "categories";
  unit?: string;
  formatter?: "integer" | "density" | "percentage" | "currency" | "km2" | "time";
  nullLabel: string;
  enabledInV1: boolean;
  citation?: string;
}

export interface AtlasState {
  activeLayerId: string | null;
  selectedGeoUnitId: string | null;
  searchQuery: string;
}

export type ScaleEntry = { value: number; color: string };
export type CategoryEntry = { value: string; color: string; label: string };

export interface LayerLegend {
  type: "gradient" | "buckets" | "categories";
  entries: ScaleEntry[] | CategoryEntry[];
  unit?: string;
  nullColor: string;
  nullLabel: string;
}
