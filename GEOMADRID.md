# GeoMadrid

> A multi-layer geography platform: interactive quiz game, civic intelligence atlas, and territorial research tool for the Community of Madrid.

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [V1 Scope](#2-v1-scope)
3. [Product Structure](#3-product-structure)
4. [Tech Stack](#4-tech-stack)
5. [Data Architecture](#5-data-architecture)
6. [Difficulty System](#6-difficulty-system)
7. [Explore Atlas System](#7-explore-atlas-system)
8. [Classification Engine](#8-classification-engine)
9. [Folder Structure](#9-folder-structure)
10. [Phased Build Plan](#10-phased-build-plan)
11. [Acceptance Criteria](#11-acceptance-criteria)
12. [Prompt Sequence for Implementation](#12-prompt-sequence-for-implementation)
13. [Future Roadmap](#13-future-roadmap)

---

## 1. Product Vision

GeoMadrid has two main experiences:

```
GeoMadrid
├── Play       — quiz game: identify official administrative polygons
└── Explore    — research atlas: thematic layers, filters, profiles, rankings
```

The core principle: **one official polygon dataset powers everything.** Difficulty changes the UI layer, not the geometry. The basemap is decorative. The polygon layer is authoritative.

### What GeoMadrid can answer

- Can I name every municipality in the Community of Madrid?
- Which towns vote the same way?
- Which areas are growing fastest?
- Which municipalities are wealthy but low-density?
- Which places are commuter towns vs independent employment centres?
- Which areas are mountain/rural/industrial?
- Which municipalities do I confuse most in the quiz?
- Where are the dense southern belt vs wealthy northwest patterns?

### Dataset expansion path

```
V1:  Community of Madrid — 179 municipalities
V2:  Madrid City — 21 districts
V3:  Madrid City — 131 barrios
```

Madrid city is one municipality polygon in the 179-municipality mode. Districts and barrios are separate future datasets, not subdivisions of the V1 polygon.

---

## 2. V1 Scope

### Included in V1

**Play:**
- 179 official municipality polygons (Community of Madrid)
- Three difficulty modes: Learn / Challenge / Master
- 20-question quiz per session
- Scoring: base points, speed bonus, streak multiplier
- Per-difficulty feedback
- Session summary screen
- localStorage progress (accuracy, confusion pairs, response times)

**Explore:**
- Search by municipality name
- Hover tooltip
- Click-to-open municipality profile panel
- Active layers (v1 enabled): area, population (if data available), density (if data available), corridor classification (if supplied), neighbours count, learning difficulty (if computed)
- Rankings table for active layer
- Classification chips on municipality profile

**Data:**
- Official municipal boundaries (CNIG/IGN source)
- Exact count validation (must equal 179)
- Stable geo_unit_id system (INE municipality code)
- Neighbours graph
- Centroids and label points
- Bounding boxes
- Classification scaffold

### Excluded from V1

- 21 districts dataset
- 131 barrios dataset
- User accounts or auth
- Leaderboards
- Multiplayer
- Full political election atlas (schema only, data deferred)
- Housing / income layers (deferred until data is clean)
- Google Maps API dependency

All of these must be **architecturally planned** even if not built.

---

## 3. Product Structure

### Play modes

| Mode | Public label | Internal | Description |
|------|-------------|----------|-------------|
| Easy | Learn | `"easy"` | Full learning map: terrain, labels, hints, tooltips |
| Medium | Challenge | `"medium"` | Outlines only, no labels, no hints |
| Hard | Master | `"hard"` | Blank administrative map, thin outlines, minimal help |

**Rule:** difficulty never changes the polygon geometry. The same 179 official boundaries appear in all three modes.

### Explore mode

The research atlas. Also referred to as Atlas in UI copy.

Layer groups available in Explore:

| Group | V1 layers | Future layers |
|-------|-----------|---------------|
| Overview | area, neighbours count | - |
| Demography | population, density | age structure, growth, foreign-born, household size |
| Politics | (schema only) | winner, vote shares, turnout, margin, swing |
| Geography | corridor | elevation, protected area, rivers, terrain type |
| Mobility | (schema only) | distance to Madrid, Cercanías, motorway corridor |
| Economy | (schema only) | income, unemployment, business density |
| Housing | (schema only) | price per m², rent, affordability index |
| Services | (schema only) | schools, health centres, pharmacies |
| Culture | (schema only) | heritage assets, tourism type |
| Environment | (schema only) | tree cover, wildfire risk, heat risk |
| Game | learning difficulty | your accuracy, average time, confusion pairs |

---

## 4. Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 15 (App Router) | SSR/SSG for data-heavy pages, TypeScript native |
| Language | TypeScript | Type-safe config system essential for atlas layers |
| Map library | MapLibre GL JS or Leaflet + react-leaflet | Vector tiles, GeoJSON layers, fast polygon rendering |
| Styling | Tailwind CSS | Consistent with other Jack projects (Cognix, Sentinel) |
| State | Zustand | Lightweight; works for quiz reducer and atlas panel state |
| Data format | GeoJSON (full) + GeoJSON (simplified) | Simplified for render, full for computation |
| Data pipeline | Python (geopandas, shapely, pyproj) | Standard geospatial stack |
| Boundary source | CNIG/IGN official datasets | Official, stable, correct |
| Storage | Local JSON files in `public/data/` | No backend required for V1 |
| Hosting | Vercel | Next.js native deployment |

### Map rendering decision

Use **MapLibre GL JS** with:
- A free vector basemap (MapTiler, Stadia, or OpenFreeMap) for Easy mode terrain context
- GeoJSON polygon layer on top (the authoritative layer)
- Layer visibility toggled by `DifficultyConfig` flags

Do not use Google Maps as a polygon source. It is decorative only if used at all.

---

## 5. Data Architecture

### File structure

```
public/data/
  community/
    boundaries/
      municipalities.geojson            # Full precision, EPSG:4326
      municipalities_simplified.geojson # Simplified for fast render
    attributes/
      identity.json                     # names, codes, slugs, area, centroid
      population.json                   # total, density, growth (when available)
      politics.json                     # election data (schema now, data later)
      mobility.json                     # corridor, transit, distances
      economy.json                      # income, employment (deferred)
      housing.json                      # prices, rent (deferred)
      geography.json                    # elevation, terrain, protected areas
      culture.json                      # heritage, tourism
      classifications.json              # all computed/curated classifications
    derived/
      neighbours.json                   # adjacency graph
      rankings.json                     # pre-computed layer rankings
      difficulty_scores.json            # per-municipality game difficulty
      label_points.json                 # optimal text label placement points
    metadata/
      data_sources.json                 # provenance, licences, versions
      data_version.json                 # pipeline run metadata
```

### Geo unit ID system

All data joins on a stable `geoUnitId`.

```
Community of Madrid municipalities: INE municipality code
  Format: 5-digit string "28XXX"
  Example: "28079" = Madrid city

Future:
  Madrid districts: "28079-D-XX"
  Madrid barrios:   "28079-B-XXXXXX"
```

### Core types

```typescript
export type GeoUnitId = string;
export type GeoDatasetId = "community_municipalities" | "madrid_districts" | "madrid_barrios";

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
```

### Data pipeline requirements

The Python pipeline must:
1. Read from `data/raw/` (official CNIG/IGN Shapefile or GeoPackage)
2. Filter to province code 28 (Comunidad de Madrid)
3. Validate exactly 179 features
4. Assign stable `geoUnitId` from official INE codes
5. Reproject to EPSG:4326 for web output
6. Use EPSG:25830 (UTM zone 30N) for area computation
7. Validate and repair geometries
8. Compute: centroid, label point, bounding box, area
9. Compute neighbours via `touches`/`intersects` adjacency
10. Export all output files listed above
11. Print validation report (count, CRS, duplicate IDs, total area, file sizes)

---

## 6. Difficulty System

### Visual layers by difficulty

| Layer | Easy (Learn) | Medium (Challenge) | Hard (Master) |
|-------|--------------|--------------------|---------------|
| Terrain / hillshade | Yes | No | No |
| Roads | Yes | No | No |
| Rivers | Yes | No | No |
| Reservoirs | Yes | No | No |
| Town labels | Yes | No | No |
| Municipality labels | Yes | No | No |
| Municipal outlines | Yes | Yes | Yes (thin) |
| Hover highlight | Yes | Yes | No |
| Hover name | Yes | No | No |
| Tooltip | Yes | No | No |
| Hints | Yes | No | No |
| Search during quiz | Yes | No | No |
| Zoom/pan | Yes | Yes | Yes |
| Feedback level | Detailed | Standard | Minimal |
| Score multiplier | 1.0x | 1.5x | 2.0x |

### Config type

```typescript
export type QuizDifficulty = "easy" | "medium" | "hard";

export interface DifficultyConfig {
  id: QuizDifficulty;
  label: string;           // internal: "easy" / "medium" / "hard"
  publicLabel: string;     // UI: "Learn" / "Challenge" / "Master"
  description: string;
  scoreMultiplier: number;
  showTerrain: boolean;
  showRoads: boolean;
  showRivers: boolean;
  showReservoirs: boolean;
  showTownLabels: boolean;
  showMunicipalityLabels: boolean;
  showHoverHighlight: boolean;
  showHoverName: boolean;
  showTooltip: boolean;
  allowHints: boolean;
  allowSearchDuringQuiz: boolean;
  allowZoom: boolean;
  allowPan: boolean;
  feedbackLevel: "detailed" | "standard" | "minimal";
}
```

### Scoring

```
Score per round =
  base (100)
  × difficultyMultiplier
  + speedBonus (time-dependent, scaled per difficulty)
  × streakMultiplier (1.0 + 0.1 × consecutive correct, cap 2.5x)
  - hintPenalty (easy only: -20 per hint used)
```

### Easy mode hints (in order)

1. Show geographic region / corridor
2. Highlight neighbouring municipalities
3. Show first letter of name
4. Zoom toward target area
5. Show cardinal direction from Madrid city
6. Eliminate the wrong half of the map

---

## 7. Explore Atlas System

### Atlas layer config type

```typescript
export interface AtlasLayerConfig {
  id: string;
  label: string;
  group: LayerGroup;
  description: string;
  sourceKey: keyof AttributeFiles;
  attributeKey: string;
  type: "numeric" | "categorical" | "boolean";
  legendType: "gradient" | "buckets" | "categories";
  unit?: string;
  formatter?: "integer" | "density" | "percentage" | "currency" | "km2" | "time";
  nullLabel: string;
  enabledInV1: boolean;
  citation?: string;
}

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
```

### V1 enabled layers

| ID | Label | Group | Type | Source |
|----|-------|-------|------|--------|
| `area_km2` | Area | overview | numeric/gradient | identity.json |
| `neighbours_count` | Neighbours | overview | numeric/buckets | derived/neighbours.json |
| `population_total` | Population | demography | numeric/gradient | population.json |
| `density_per_km2` | Density | demography | numeric/gradient | population.json |
| `corridor` | Corridor | geography | categorical | classifications.json |
| `learning_difficulty` | Game difficulty | game | categorical | difficulty_scores.json |

All others: `enabledInV1: false`. Schemas defined, UI shows "Data coming soon."

### Explore UI layout

```
┌─────────────────────────────────────────────────────────┐
│  [Search]          GeoMadrid Explore                    │
├──────────┬──────────────────────────────┬───────────────┤
│  Layer   │                              │  Municipality │
│  Groups  │      Map (polygons           │  Profile      │
│          │      coloured by active      │               │
│  Legend  │      layer)                  │  Quick stats  │
│          │                              │  Classifications│
│  Filters │                              │  Neighbours   │
│          │                              │  Rankings     │
├──────────┴──────────────────────────────┴───────────────┤
│  Rankings table / Compare tray (collapsible)            │
└─────────────────────────────────────────────────────────┘
```

### Municipality profile panel sections

1. **Header**: name, corridor chip, size classification chip
2. **Quick facts**: population, area, density, neighbours count, distance to Madrid
3. **Active layer**: current layer value + contextual interpretation
4. **Rankings**: rank in active layer (e.g., "#34 of 179 by population")
5. **Neighbours**: list with links
6. **Classifications**: all computed dimension chips
7. **Game stats**: your accuracy, average time, most confused with (from localStorage)

---

## 8. Classification Engine

### Classification dimensions

| Dimension | Type | V1 status | Inputs |
|-----------|------|-----------|--------|
| `population_size` | rule-based | if population available | population_total |
| `density_type` | rule-based | if density available | density_per_km2 |
| `growth_type` | rule-based | deferred | population change % |
| `corridor` | curated | V1 placeholder | manual assignment |
| `geography_type` | curated | partial V1 | manual/terrain |
| `mobility_type` | hybrid | deferred | transit data |
| `political_type` | rule-based | deferred | election data |
| `economic_type` | rule-based | deferred | income, employment |
| `housing_type` | rule-based | deferred | price, rent |
| `morphology_type` | rule-based | V1 | area, perimeter, bbox ratio, neighbours |
| `learning_difficulty` | hybrid | V1 | area, population, neighbours_count, user stats |

### Population size buckets

```
Madrid capital:       geoUnitId === "28079"
Large city:           population >= 100,000
Mid-sized city:       50,000 – 99,999
Small city:           20,000 – 49,999
Town:                 5,000 – 19,999
Village:              1,000 – 4,999
Micro municipality:   < 1,000
```

### Density buckets

```
Hyperdense urban:     >= 5,000 people/km²
Dense urban:          1,000 – 4,999
Suburban:             200 – 999
Low-density suburban: 50 – 199
Rural:                10 – 49
Very rural:           < 10
```

### Morphology buckets (geometry-derived, V1)

Inputs: area, perimeter, compactness ratio, bbox aspect ratio, neighbours count.

```
Compact:           compactness > 0.7
Elongated:         bbox_aspect_ratio > 3.0
Irregular:         compactness < 0.4 and not elongated
Tiny:              area < 15 km²
Large rural:       area > 500 km² and population_size in [village, micro]
Border-edge:       borders another province
```

### Learning difficulty score

```
difficulty_score =
  small_area_score (area < 30 km² = +2)
  + tiny_score (area < 10 km² = +3)
  + low_pop_score (population < 1000 = +1)
  + neighbour_density_score (neighbours_count > 8 = +2)
  + user_confusion_score (from localStorage: confusion rate > 30% = +2)

Buckets:
  0–1:  Beginner
  2–3:  Easy
  4–5:  Medium
  6–7:  Hard
  8–9:  Expert
  10+:  Nightmare
```

### Corridor groups (curated, V1 placeholder)

```
Madrid capital
A-1 / North axis
A-2 / Henares corridor
A-3 / Southeast
A-4 / South
A-5 / Southwest
A-6 / Northwest
M-607 / Colmenar axis
Sierra Norte
Sierra Oeste / Guadarrama
Vegas / Tajuña / Jarama
```

---

## 9. Folder Structure

```
GeoMadrid/
├── GEOMADRID.md               # This document
├── README.md                  # Short public intro
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
│
├── data/
│   ├── raw/                   # Source files (gitignored if large)
│   │   └── cnig_municipios_*  # Official CNIG shapefile/GeoPackage
│   └── pipeline/
│       ├── build_municipalities.py
│       ├── build_districts.py     # scaffold only
│       ├── build_barrios.py       # scaffold only
│       ├── validate.py
│       └── requirements.txt
│
├── public/
│   └── data/
│       └── community/
│           ├── boundaries/
│           │   ├── municipalities.geojson
│           │   └── municipalities_simplified.geojson
│           ├── attributes/
│           │   ├── identity.json
│           │   ├── population.json
│           │   ├── politics.json
│           │   ├── mobility.json
│           │   ├── economy.json
│           │   ├── housing.json
│           │   ├── geography.json
│           │   ├── culture.json
│           │   └── classifications.json
│           ├── derived/
│           │   ├── neighbours.json
│           │   ├── rankings.json
│           │   ├── difficulty_scores.json
│           │   └── label_points.json
│           └── metadata/
│               ├── data_sources.json
│               └── data_version.json
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Landing / mode selector
│   │   ├── play/
│   │   │   ├── page.tsx         # Difficulty selector
│   │   │   └── [difficulty]/
│   │   │       └── page.tsx     # Active quiz
│   │   └── explore/
│   │       └── page.tsx         # Research atlas
│   │
│   ├── components/
│   │   ├── map/
│   │   │   ├── GeoMap.tsx       # Core map component
│   │   │   ├── PolygonLayer.tsx
│   │   │   ├── BasemapLayer.tsx
│   │   │   ├── LabelLayer.tsx
│   │   │   └── MapControls.tsx
│   │   ├── quiz/
│   │   │   ├── QuizCard.tsx
│   │   │   ├── ScoreBar.tsx
│   │   │   ├── HintPanel.tsx
│   │   │   ├── FeedbackOverlay.tsx
│   │   │   └── SessionSummary.tsx
│   │   ├── explore/
│   │   │   ├── LayerPanel.tsx
│   │   │   ├── MunicipalityProfile.tsx
│   │   │   ├── RankingsTable.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── Legend.tsx
│   │   └── ui/
│   │       ├── ClassificationChip.tsx
│   │       ├── StatRow.tsx
│   │       └── NullDataLabel.tsx
│   │
│   ├── config/
│   │   ├── difficulty.ts        # DifficultyConfig objects
│   │   ├── atlasLayers.ts       # AtlasLayerConfig objects
│   │   ├── classifications.ts   # ClassificationConfig objects
│   │   └── datasets.ts          # Dataset registry
│   │
│   ├── lib/
│   │   ├── data/
│   │   │   ├── loader.ts        # Load + join GeoJSON + attribute files
│   │   │   ├── rankings.ts      # Pre-compute layer rankings
│   │   │   └── neighbours.ts    # Neighbour graph utilities
│   │   ├── quiz/
│   │   │   ├── reducer.ts       # Quiz state reducer
│   │   │   ├── scoring.ts       # Scoring functions
│   │   │   ├── progress.ts      # localStorage read/write
│   │   │   └── analytics.ts     # Confusion pairs, accuracy
│   │   ├── atlas/
│   │   │   ├── scale.ts         # Numeric colour scales
│   │   │   ├── categories.ts    # Categorical colour maps
│   │   │   └── legend.ts        # Legend generation
│   │   └── classify/
│   │       ├── engine.ts        # Classification runner
│   │       └── difficulty.ts    # Learning difficulty scorer
│   │
│   └── types/
│       ├── geo.ts
│       ├── quiz.ts
│       ├── atlas.ts
│       └── classifications.ts
│
└── tests/
    ├── difficulty.test.ts
    ├── scoring.test.ts
    ├── classification.test.ts
    └── atlas.test.ts
```

---

## 10. Phased Build Plan

### Phase 0: Foundation (before any UI)

**Goal:** correct official data, zero invented geometry, validated pipeline.

**Tasks:**

- [ ] Download official CNIG/IGN municipal boundaries for Comunidad de Madrid
  - Source: `centrodedescargas.cnig.es` — Líneas de Límites Municipales
  - Format: Shapefile (SHP) or GeoPackage
- [ ] Set up Python environment (`data/pipeline/requirements.txt`)
  - geopandas, shapely, pyproj, fiona, numpy
- [ ] Write `build_municipalities.py`
  - Read from `data/raw/`
  - Filter province 28
  - Validate exactly 179 features
  - Assign `geoUnitId` from INE codes
  - Reproject to EPSG:4326
  - Compute area (in EPSG:25830), centroid, label point, bbox
  - Compute neighbours adjacency
  - Export all output files
  - Print validation report
- [ ] Validate output manually (spot check 10 municipalities in QGIS or geojson.io)
- [ ] Scaffold `districts` and `barrios` pipeline files (not implemented, no data)

**Acceptance criteria:**
- Pipeline runs to completion with no errors
- Output GeoJSON contains exactly 179 features
- Every feature has a unique `geoUnitId`
- No `null` geometries
- Total area of Comunidad de Madrid approx 8,028 km² ± 1%
- Neighbours JSON covers all 179 municipalities
- Simplified GeoJSON file size < 500 KB

---

### Phase 1: Next.js project scaffold + map shell

**Goal:** working Next.js app with the map rendering correct polygons.

**Tasks:**

- [ ] Initialise Next.js 15 app with TypeScript and Tailwind
- [ ] Install MapLibre GL JS (or Leaflet fallback)
- [ ] Create `GeoMap.tsx` component
  - Renders `municipalities_simplified.geojson` as a polygon layer
  - Hover highlight
  - Click callback returning `geoUnitId`
  - Accepts `DifficultyConfig` prop to control visible layers
- [ ] Create `PolygonLayer.tsx` and `BasemapLayer.tsx`
- [ ] Write `DifficultyConfig` types and `difficultyConfigs.ts`
- [ ] Basic routing: `/` landing, `/play`, `/explore`
- [ ] Confirm all 179 polygons render correctly on first load
- [ ] Mobile-responsive viewport

**Acceptance criteria:**
- All 179 polygons visible and correctly shaped
- Hover highlights the correct polygon
- Click returns the correct `geoUnitId`
- Switching difficulty config changes visible layers
- No polygon geometry invented or approximated

---

### Phase 2: Play mode — core quiz loop

**Goal:** complete playable quiz in all three difficulties.

**Tasks:**

- [ ] Write `quiz/reducer.ts`
  - Actions: `START_SESSION`, `SET_TARGET`, `SUBMIT_ANSWER`, `USE_HINT`, `NEXT_ROUND`, `END_SESSION`
  - State: current target, round number, score, streak, time, session history
- [ ] Write `quiz/scoring.ts`
  - Base score, speed bonus, streak multiplier, hint penalty
  - Per-difficulty multipliers from `DifficultyConfig`
- [ ] Write `quiz/progress.ts`
  - localStorage: per-municipality accuracy, average time, confusion pairs
- [ ] Build `QuizCard.tsx`
  - Prompt: "Find: [Municipality Name]"
  - Round counter, streak display, score display
- [ ] Build `FeedbackOverlay.tsx`
  - Correct: green highlight + fact card (easy) or name reveal (medium) or minimal (hard)
  - Incorrect: show clicked polygon red, correct polygon green
- [ ] Build `HintPanel.tsx` (easy only)
  - Six hint tiers, penalty counter
- [ ] Build `SessionSummary.tsx`
  - Score, accuracy, fastest/slowest correct
  - Most missed list
  - Replay / change difficulty buttons
- [ ] Easy mode: test all hint types work correctly
- [ ] Medium mode: confirm no labels visible at any point
- [ ] Hard mode: confirm no terrain, no hover name, no hints

**Acceptance criteria:**
- 20-round session completes without errors
- Score calculation is correct for all three difficulties
- Hint penalty deducted correctly in easy mode
- Confusion pairs stored to localStorage after each session
- Session summary shows accurate stats

---

### Phase 3: Explore mode — atlas shell

**Goal:** working research atlas with V1 enabled layers.

**Tasks:**

- [ ] Write `atlasLayers.ts` with all layer configs (V1 enabled + future scaffold)
- [ ] Write `atlas/scale.ts` — numeric gradient scale (quantile, equal-interval)
- [ ] Write `atlas/categories.ts` — categorical colour map (party colours, corridor colours)
- [ ] Write `atlas/legend.ts` — legend component from active layer config
- [ ] Build `LayerPanel.tsx` — layer group tabs, layer list, legend
- [ ] Build `MunicipalityProfile.tsx` — full profile panel
- [ ] Build `RankingsTable.tsx` — sortable, active layer aware
- [ ] Build `SearchBar.tsx` — filter by name, fly to on select
- [ ] Connect map polygon fill to active atlas layer
- [ ] Null-safe: municipalities with no data show neutral fill + "Data unavailable"

**Acceptance criteria:**
- Switching active layer re-colours all 179 polygons correctly
- Null values shown consistently without errors
- Profile panel opens on polygon click with correct data
- Rankings table correct for area, neighbours count
- Search flies to and highlights correct municipality

---

### Phase 4: Classification engine

**Goal:** every municipality has computed classification chips.

**Tasks:**

- [ ] Write `classify/engine.ts` — runs all dimensions, produces `classifications.json`
- [ ] Implement V1 rule-based dimensions:
  - `population_size` (if data available)
  - `density_type` (if data available)
  - `morphology_type` (from geometry: area, compactness, bbox ratio)
  - `corridor` (manual placeholder map)
  - `learning_difficulty` (from area, population, neighbours)
- [ ] Write `difficulty_scores.json` output
- [ ] Show classification chips in municipality profile
- [ ] Show `learning_difficulty` as an Explore atlas layer (game group)
- [ ] Tests for each classification function

**Acceptance criteria:**
- Every municipality has a `morphology_type` classification
- Every municipality has a `learning_difficulty` score
- `corridor` assigns all 179 municipalities to one of 11 groups
- Classification chips visible in profile panel
- No municipality has undefined classification for V1 dimensions

---

### Phase 5: Polish + V1 ship

**Goal:** production-quality V1 ready for public use.

**Tasks:**

- [ ] Landing page: mode selector (Play / Explore), difficulty selector for Play
- [ ] Mobile layout for Explore profile panel (drawer instead of side panel)
- [ ] Accessibility: keyboard nav, ARIA labels, focus management
- [ ] Performance: verify simplified GeoJSON loads fast on mobile
- [ ] SEO: meta tags, og:image
- [ ] Error boundaries for map failures
- [ ] Empty state for Explore with no active layer
- [ ] All copy reviewed (British spelling, no em dashes)
- [ ] Deploy to Vercel

**Acceptance criteria:**
- Lighthouse performance score >= 85 on mobile
- No console errors in production build
- All 179 municipality names spelled correctly
- Play and Explore work on a phone in Safari
- App loads under 3 seconds on a 4G connection

---

### Phase 6 (post-V1): Data enrichment

**Priority order for adding real data:**

1. **Population** — INE municipal register (`padrón municipal`), free, annual, covers all 179
2. **Corridor/mobility classification** — manual assignment based on road corridors, can be done in a spreadsheet
3. **Municipal election results** — Ministerio del Interior open data or Comunidad de Madrid stats portal
4. **Housing prices** — Ministerio de Vivienda, Idealista open data, or Catastro
5. **Income** — AEAT municipal income statistics (released annually with 1-2 year lag)
6. **Transport accessibility** — compute from GTFS feeds (RENFE Cercanías, EMT, CRTM)

For each new data source:
1. Add attribute file to `public/data/community/attributes/`
2. Add layer configs to `atlasLayers.ts` with `enabledInV1: true`
3. Add classification rules to `classify/engine.ts`
4. Update rankings

---

### Phase 7 (future): Madrid districts + barrios

1. Download official CNIG district boundaries for Madrid city (21 districts)
2. Run `build_districts.py` pipeline
3. Add `madrid_districts` to dataset registry
4. All quiz and explore features inherit automatically from the config-driven system
5. Repeat for 131 barrios

---

## 11. Acceptance Criteria

### Data correctness (non-negotiable)

- [ ] Exactly 179 municipality polygons
- [ ] Every polygon uses official CNIG/IGN geometry
- [ ] Every `geoUnitId` is the official INE 5-digit code
- [ ] No duplicate IDs
- [ ] No invented names, invented geometry, or approximated boundaries
- [ ] Total area within 1% of official figure (8,028 km²)

### Game correctness

- [ ] Clicking the correct polygon registers as correct in all three difficulties
- [ ] Difficulty config fully controls all visual elements (no hardcoded exceptions)
- [ ] Score formula is consistent across sessions
- [ ] LocalStorage progress survives page reload
- [ ] Session summary stats match in-session running totals

### Atlas correctness

- [ ] Every active layer colours all 179 polygons (null = neutral, not error)
- [ ] Adding a new layer requires only a config entry, no component changes
- [ ] Rankings table matches sorted polygon values
- [ ] Profile panel data matches the attribute files

### Architecture

- [ ] Difficulty is config-driven (`DifficultyConfig`), not scattered if-statements
- [ ] Atlas layers are config-driven (`AtlasLayerConfig`), not hardcoded components
- [ ] Classifications are config-driven (`ClassificationConfig`), not inline logic
- [ ] All data joins by `geoUnitId`; no name-based joins
- [ ] No geometry invented anywhere in the codebase

---

## 12. Prompt Sequence for Implementation

Use these in order. Do not skip ahead.

### Prompt 1: Architecture review

> Review `GEOMADRID.md`. Confirm the architecture is sound and flag any issues before implementation begins. Focus on: data join strategy, map library choice for difficulty config system, atlas layer extensibility, and classification engine design. Do not write code yet.

### Prompt 2: Data pipeline

> Build `data/pipeline/build_municipalities.py`. Requirements are in `GEOMADRID.md` section 5. Source file will be at `data/raw/`. Export to `public/data/community/`. Print validation report. Scaffold (but do not implement) `build_districts.py` and `build_barrios.py`.

### Prompt 3: Next.js scaffold + map shell

> Initialise Next.js 15 with TypeScript and Tailwind. Install MapLibre GL JS. Build `GeoMap.tsx` that renders `municipalities_simplified.geojson`. Wire `DifficultyConfig` to control visible layers. Routes: `/`, `/play`, `/explore`. Confirm all 179 polygons render with hover and click.

### Prompt 4: Difficulty system

> Implement the difficulty config system from `GEOMADRID.md` section 6. Produce `src/config/difficulty.ts`, helper functions for map visual mode and scoring, tests for difficulty behaviour.

### Prompt 5: Quiz engine

> Implement the Play mode quiz. Requirements in `GEOMADRID.md` section 10 Phase 2. Build reducer, scoring, progress storage, `QuizCard`, `FeedbackOverlay`, `HintPanel`, `SessionSummary`. All three difficulty modes must be playable.

### Prompt 6: Atlas layer system

> Implement the Explore atlas layer system from `GEOMADRID.md` section 7. Produce `src/config/atlasLayers.ts` with all V1 enabled layers and future scaffolds. Build scale, categories, legend utilities. Build `LayerPanel`, `RankingsTable`, `Legend`. Connect polygon fill to active layer.

### Prompt 7: Classification engine

> Implement the classification engine from `GEOMADRID.md` section 8. V1 dimensions: `morphology_type`, `population_size` (if data), `density_type` (if data), `corridor` (placeholder), `learning_difficulty`. Output `classifications.json` and `difficulty_scores.json`. Build `classify/engine.ts` with tests.

### Prompt 8: Explore UI

> Build the full Explore mode UI: `LayerPanel`, `MunicipalityProfile`, `RankingsTable`, `SearchBar`. Profile panel must show quick stats, classification chips, neighbours, active layer interpretation. Rankings table must sort by any V1 layer.

### Prompt 9: Polish + ship

> V1 polish pass: landing page, mobile layout, accessibility, error boundaries, SEO metadata, British spelling review. Deploy to Vercel.

---

## 13. Future Roadmap

### V1.1: Real population data
- INE `padrón municipal` data for all 179 municipalities
- Enable population, density, and ageing layers

### V1.2: Corridor and mobility classifications
- Manual corridor assignment reviewed and finalised
- Cercanías station access (yes/no per municipality) from ADIF open data
- Motorway corridor assignment from road network

### V1.3: Election atlas
- Municipal election results from Ministerio del Interior or Comunidad de Madrid
- Enable: winner, vote shares, turnout, margin, political competitiveness layers
- Time slider for election years

### V1.4: Housing and income
- Ministerio de Vivienda housing price data
- AEAT municipal income data
- Enable: price per m², rent, income, affordability index layers

### V2.0: Madrid City districts
- 21 official districts
- All Play and Explore features inherited automatically
- District-level population, housing, voting, mobility data

### V2.1: Madrid City barrios
- 131 official barrios
- Finest granularity: street-level neighbourhood identity

### V3.0: Multi-region expansion
- Other Spanish autonomous communities
- Same architecture, new boundary datasets
- Community selector on landing page

### Game features (post-V1)
- Accounts + persistent leaderboard
- Daily challenge (same target for all players on a given day)
- Multiplayer race mode
- Mastery badges per corridor
- Streak calendar

---

## Data Sources

| Dataset | Source | URL | Licence |
|---------|--------|-----|---------|
| Municipal boundaries | CNIG/IGN | `centrodedescargas.cnig.es` | CC-BY 4.0 |
| Population | INE | `ine.es/padrón municipal` | Open |
| Municipal elections | Ministerio del Interior | `infoelectoral.mir.es` | Open |
| Housing prices | Ministerio de Vivienda | `mivau.gob.es` | Open |
| Income data | AEAT | `agenciatributaria.gob.es` | Open |
| Cercanías stations | ADIF | `data.adif.es` | Open |
| Natural parks | Red de Parques de la CAM | `comunidad.madrid` | Open |

Do not use any commercial or proprietary geometry source as the authoritative polygon layer.

---

*Last updated: 2026-05-31*
*Scope: V1 — 179 municipalities, Community of Madrid*
*Status: Architecture phase, pre-implementation*
