# GeoMadrid

A multi-layer geography platform for the Community of Madrid. Interactive quiz game and civic intelligence atlas, both powered by official administrative polygon data.

**Live:** coming soon · **Status:** Phase 1 — scaffold + map shell

---

## What it does

**Play** — Identify the correct municipality on the map. Three difficulty modes:

| Mode | Label | Visual help |
|------|-------|-------------|
| Easy | Learn | Full map: terrain, labels, towns, rivers, hints |
| Medium | Challenge | Outlines only, no labels, no hints |
| Hard | Master | Blank map, thin outlines, no assistance |

**Explore** — Research atlas with thematic layers across demography, politics, mobility, economy, housing, geography, culture, and game analytics. Every layer is config-driven. Every municipality has a profile card.

---

## Dataset

**V1:** 179 official municipalities of the Community of Madrid.  
Source: [CNIG/IGN Líneas de Límites Municipales](https://centrodedescargas.cnig.es) — official Spanish national cartography.

Madrid city is one municipality polygon (code `28079`) in the 179-municipality dataset.

**Future:** 21 Madrid city districts · 131 Madrid city barrios.

The polygon layer is authoritative. The basemap is decorative.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Map | MapLibre GL JS |
| Styling | Tailwind CSS |
| State | Zustand |
| Data pipeline | Python (geopandas, shapely) |
| Hosting | Vercel |

---

## Getting started

### Prerequisites

- Node.js 22+
- Python 3.10+ with conda or venv

### Install

```bash
git clone https://github.com/jacksangster03/geomadrid.git
cd geomadrid
npm install
```

### Data pipeline (Phase 0)

The boundary data is sourced from the **IGN INSPIRE WFS** — the official Instituto Geográfico Nacional Web Feature Service. This is the same authoritative source as the CNIG download portal, served via the public INSPIRE endpoint. Licence: CC BY 4.0 ign.es.

#### Option A: Programmatic download (recommended)

```bash
# From the repo root
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r data/pipeline/requirements.txt requests

# Download 179 official municipality boundaries from IGN WFS
python data/pipeline/download_wfs.py

# Process, validate and export
python data/pipeline/build_municipalities.py
```

`download_wfs.py` pages through all ~8,294 Spanish administrative units in the IGN WFS, collecting only those whose national code starts with `34132828` (province 28 = Community of Madrid). It produces `data/raw/ign_madrid_municipalities.geojson` with flat `NATCODE`/`NAMEUNIT` fields ready for the pipeline.

#### Option B: Manual CNIG download

1. Go to [centrodedescargas.cnig.es](https://centrodedescargas.cnig.es)
2. Search for "Líneas de Límites Municipales"
3. Download the national Shapefile or GeoPackage
4. Extract the contents **directly into** `data/raw/` (files must be at the root, not in a subdirectory)
5. Run `python data/pipeline/build_municipalities.py`

The pipeline will:
- Filter to province code 28 (Comunidad de Madrid)
- Validate exactly 179 features
- Assign stable `geoUnitId` values from official INE codes
- Compute area, centroid, label point, bounding box, neighbours
- Export to `public/data/community/`

#### What gets committed

| File | Committed? | Reason |
|------|-----------|--------|
| `public/data/community/boundaries/*.geojson` | No (gitignored) | Large files, regenerate via pipeline |
| `public/data/community/attributes/identity.json` | Yes (89 KB) | Stable, small |
| `public/data/community/derived/neighbours.json` | Yes (10 KB) | Stable, small |
| `public/data/community/attributes/classifications.json` | Yes (scaffold) | Scaffold only |
| `public/data/community/metadata/data_version.json` | Yes (1 KB) | Provenance record |
| `data/raw/` | No (gitignored) | Official source files, do not commit |

### Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
GeoMadrid/
├── data/
│   ├── raw/              # Official CNIG source files (gitignored)
│   └── pipeline/         # Python data pipeline
├── public/
│   └── data/community/   # Processed boundary + attribute files
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # Map, quiz, explore, UI components
│   ├── config/           # Difficulty, atlas layer, classification configs
│   ├── lib/              # Data loading, scoring, quiz reducer, atlas utils
│   └── types/            # Shared TypeScript types
└── GEOMADRID.md          # Full architecture and build plan
```

---

## Build phases

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Data pipeline: official boundaries, 179 municipalities | Scaffold |
| 1 | Next.js scaffold, map shell, difficulty config | In progress |
| 2 | Quiz engine: all three difficulty modes | Planned |
| 3 | Explore atlas shell: V1 layers, profile panel | Planned |
| 4 | Classification engine | Planned |
| 5 | Polish + V1 ship | Planned |
| 6 | Data enrichment (population, elections, housing) | Future |
| 7 | Madrid districts + barrios | Future |

Full architecture, data model, and prompt sequence: [GEOMADRID.md](GEOMADRID.md)

---

## Data sources

| Dataset | Source | Licence |
|---------|--------|---------|
| Municipal boundaries | CNIG/IGN | CC-BY 4.0 |
| Population | INE (padrón municipal) | Open |
| Municipal elections | Ministerio del Interior | Open |
| Housing prices | Ministerio de Vivienda | Open |
| Income | AEAT | Open |
| Cercanías stations | ADIF | Open |

No commercial geometry sources. No invented polygons.

---

## Architecture principles

- **Difficulty is config-driven.** `DifficultyConfig` objects control all visual layers, hints, scoring, and feedback. No scattered if-statements.
- **Atlas layers are config-driven.** Adding a new research layer requires only an `AtlasLayerConfig` entry.
- **All data joins on `geoUnitId`.** No name-based joins. Stable across all attribute files.
- **No invented data.** Every value shown has a documented official source or is marked "Data unavailable."

---

## Licence

MIT
