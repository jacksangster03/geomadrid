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

Before running the app you need to generate the official boundary data.

1. Download the official CNIG municipal boundary dataset:
   - Go to [centrodedescargas.cnig.es](https://centrodedescargas.cnig.es)
   - Search for "Líneas de Límites Municipales" (series MTN25)
   - Download the national Shapefile package
   - Extract to `data/raw/`

2. Run the pipeline:

```bash
cd data/pipeline
pip install -r requirements.txt
python build_municipalities.py
```

The pipeline will:
- Filter to province code 28 (Comunidad de Madrid)
- Validate exactly 179 features
- Assign stable `geoUnitId` values from official INE codes
- Compute area, centroid, label point, bounding box, neighbours
- Export to `public/data/community/`

3. Verify output:

```bash
python validate.py
```

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
