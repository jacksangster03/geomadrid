"""
Phase 0: Official CNIG/IGN boundary pipeline for Community of Madrid municipalities.

Input:  data/raw/  — official CNIG Shapefile or GeoPackage
        (Líneas de Límites Municipales, national coverage)

Output: public/data/community/boundaries/municipalities.geojson
        public/data/community/boundaries/municipalities_simplified.geojson
        public/data/community/attributes/identity.json
        public/data/community/derived/neighbours.json
        public/data/community/metadata/data_version.json

Usage:
    cd data/pipeline
    python build_municipalities.py [--raw-path PATH] [--dry-run]

Download the source file from:
    https://centrodedescargas.cnig.es
    Search: "Líneas de Límites Municipales" (recintos_municipales_inspire_peninbal_etrs89)
    Extract to:  GeoMadrid/data/raw/
"""

import argparse
import json
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import geopandas as gpd
import numpy as np
from shapely.geometry import mapping
from shapely.validation import make_valid

EXPECTED_COUNT = 179
PROVINCE_CODE = "28"
EPSG_WEB = 4326
EPSG_METRIC = 25830  # UTM zone 30N — accurate for Madrid

RAW_DIR = Path(__file__).parent.parent / "raw"
OUT_DIR = Path(__file__).parent.parent.parent / "public" / "data" / "community"


def slugify(name: str) -> str:
    name = unicodedata.normalize("NFD", name)
    name = "".join(c for c in name if unicodedata.category(c) != "Mn")
    name = name.lower().replace(" ", "-").replace("'", "").replace("/", "-")
    name = re.sub(r"[^a-z0-9-]", "", name)
    return re.sub(r"-+", "-", name).strip("-")


def ascii_name(name: str) -> str:
    name = unicodedata.normalize("NFD", name)
    return "".join(c for c in name if unicodedata.category(c) != "Mn")


def find_raw_file() -> Path | None:
    for ext in ("*.gpkg", "*.shp", "*.geojson", "*.json"):
        candidates = list(RAW_DIR.glob(ext))
        if candidates:
            return candidates[0]
    return None


def load_cnig(path: Path) -> gpd.GeoDataFrame:
    gdf = gpd.read_file(path)
    print(f"  Loaded {len(gdf)} features from {path.name}")
    print(f"  CRS: {gdf.crs}")
    print(f"  Columns: {list(gdf.columns)}")
    return gdf


def filter_madrid(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    # CNIG INSPIRE format uses NATCODE field like "ES28XXX"
    # Fallback: CODNUT, CODIGOINE, etc.
    col_candidates = ["NATCODE", "CODNUT", "CODIGOINE", "COD_INE", "MUNICIPIO"]
    found_col = None
    for col in col_candidates:
        if col in gdf.columns:
            found_col = col
            break

    if found_col is None:
        raise ValueError(
            f"Cannot find municipality code column. Available: {list(gdf.columns)}"
        )

    print(f"  Using code column: {found_col}")

    if found_col == "NATCODE":
        # NATCODE = "ES28XXX" or "ES280XXXX"
        madrid = gdf[gdf[found_col].astype(str).str.contains(r"ES28", na=False)].copy()
    else:
        madrid = gdf[gdf[found_col].astype(str).str.startswith(PROVINCE_CODE)].copy()

    print(f"  Filtered to {len(madrid)} Madrid municipalities")
    return madrid


def extract_ine_code(natcode: str) -> str:
    # NATCODE: "ES28079" -> "28079", "ES280790000" -> "28079"
    cleaned = re.sub(r"^ES", "", str(natcode))
    return cleaned[:5]


def build_geo_unit_id(code: str) -> str:
    return code.zfill(5)


def validate(gdf: gpd.GeoDataFrame) -> list[str]:
    issues = []
    if len(gdf) != EXPECTED_COUNT:
        issues.append(f"Expected {EXPECTED_COUNT} features, got {len(gdf)}")
    if gdf["geo_unit_id"].duplicated().any():
        dupes = gdf[gdf["geo_unit_id"].duplicated()]["geo_unit_id"].tolist()
        issues.append(f"Duplicate geoUnitIds: {dupes}")
    if gdf["name_official"].duplicated().any():
        dupes = gdf[gdf["name_official"].duplicated()]["name_official"].tolist()
        issues.append(f"Duplicate names: {dupes}")
    null_geom = gdf[gdf.geometry.isna()].index.tolist()
    if null_geom:
        issues.append(f"Null geometries at indices: {null_geom}")
    return issues


def repair_geometries(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    invalid = ~gdf.geometry.is_valid
    if invalid.any():
        print(f"  Repairing {invalid.sum()} invalid geometries")
        gdf.loc[invalid, "geometry"] = gdf.loc[invalid, "geometry"].apply(make_valid)
    return gdf


def compute_neighbours(gdf: gpd.GeoDataFrame) -> dict:
    gdf_metric = gdf.to_crs(epsg=EPSG_METRIC)
    neighbours: dict[str, list[str]] = {}
    ids = gdf["geo_unit_id"].tolist()

    for i, row in gdf_metric.iterrows():
        nbrs = []
        for j, other in gdf_metric.iterrows():
            if i == j:
                continue
            if row.geometry.touches(other.geometry) or (
                row.geometry.intersects(other.geometry)
                and not row.geometry.equals(other.geometry)
            ):
                nbrs.append(ids[gdf_metric.index.get_loc(j)])
        neighbours[ids[gdf_metric.index.get_loc(i)]] = nbrs

    return neighbours


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw-path", help="Path to source file (overrides auto-detect)")
    parser.add_argument("--dry-run", action="store_true", help="Validate only, no output")
    args = parser.parse_args()

    print("=== GeoMadrid municipality boundary pipeline ===\n")

    # 1. Find source file
    raw_path = Path(args.raw_path) if args.raw_path else find_raw_file()
    if raw_path is None or not raw_path.exists():
        print("ERROR: No source file found in data/raw/")
        print("Download from: https://centrodedescargas.cnig.es")
        print("Search: recintos_municipales_inspire_peninbal_etrs89")
        print("Extract to: GeoMadrid/data/raw/")
        sys.exit(1)

    # 2. Load
    print(f"Loading: {raw_path}")
    gdf = load_cnig(raw_path)

    # 3. Filter to Madrid
    print("\nFiltering to Community of Madrid (province 28)...")
    gdf = filter_madrid(gdf)

    # 4. Assign geoUnitId
    code_col = next(
        (c for c in ["NATCODE", "CODNUT", "CODIGOINE", "COD_INE"] if c in gdf.columns),
        None,
    )
    if code_col is None:
        sys.exit("Cannot determine municipality code column.")

    if code_col == "NATCODE":
        gdf["geo_unit_id"] = gdf[code_col].apply(extract_ine_code)
    else:
        gdf["geo_unit_id"] = gdf[code_col].astype(str).str.zfill(5)

    # 5. Name columns
    name_col = next(
        (c for c in ["NAMEUNIT", "NOMBRE", "MUNICIPIO", "NAME"] if c in gdf.columns),
        None,
    )
    if name_col is None:
        sys.exit("Cannot find name column.")
    gdf["name_official"] = gdf[name_col].astype(str)
    gdf["name_ascii"] = gdf["name_official"].apply(ascii_name)
    gdf["slug"] = gdf["name_official"].apply(slugify)

    # 6. Repair invalid geometries
    print("\nRepairing geometries...")
    gdf = repair_geometries(gdf)

    # 7. Validate before reprojection
    print("\nValidating...")
    issues = validate(gdf)
    if issues:
        print("VALIDATION ISSUES:")
        for i in issues:
            print(f"  - {i}")
        if len(gdf) != EXPECTED_COUNT:
            sys.exit(1)
    else:
        print("  Validation passed.")

    # 8. Compute area in metric CRS
    gdf_metric = gdf.to_crs(epsg=EPSG_METRIC)
    gdf["area_km2"] = (gdf_metric.geometry.area / 1e6).round(4)

    # 9. Reproject to WGS84
    print("\nReprojecting to EPSG:4326...")
    gdf = gdf.to_crs(epsg=EPSG_WEB)

    # 10. Compute centroids, label points, bboxes
    # Centroids must be computed in metric CRS (already have gdf_metric)
    print("Computing centroids, label points, bboxes...")
    centroids_metric = gdf_metric.geometry.centroid.to_crs(epsg=EPSG_WEB)
    label_pts_metric = gdf_metric.geometry.representative_point().to_crs(epsg=EPSG_WEB)
    centroids = centroids_metric
    label_pts = label_pts_metric
    bounds = gdf.geometry.bounds

    gdf["centroid_lat"] = centroids.y.round(6)
    gdf["centroid_lng"] = centroids.x.round(6)
    gdf["label_lat"] = label_pts.y.round(6)
    gdf["label_lng"] = label_pts.x.round(6)
    gdf["bbox_minlng"] = bounds.minx.round(6)
    gdf["bbox_minlat"] = bounds.miny.round(6)
    gdf["bbox_maxlng"] = bounds.maxx.round(6)
    gdf["bbox_maxlat"] = bounds.maxy.round(6)

    # 11. Compute neighbours (slow — ~179² comparisons)
    print("\nComputing neighbours (this may take a minute)...")
    neighbours = compute_neighbours(gdf)
    print(f"  Done. Neighbour counts: min={min(len(v) for v in neighbours.values())}, max={max(len(v) for v in neighbours.values())}")

    if args.dry_run:
        print("\nDry-run: skipping output.")
        return

    # 12. Export
    print("\nExporting...")
    os.makedirs(OUT_DIR / "boundaries", exist_ok=True)
    os.makedirs(OUT_DIR / "attributes", exist_ok=True)
    os.makedirs(OUT_DIR / "derived", exist_ok=True)
    os.makedirs(OUT_DIR / "metadata", exist_ok=True)

    export_cols = ["geo_unit_id", "name_official", "name_ascii", "slug", "geometry"]
    export_gdf = gdf[export_cols].copy()

    # Add nameDisplay to GeoJSON properties
    export_gdf["nameDisplay"] = gdf["name_official"]
    export_gdf["geoUnitId"] = gdf["geo_unit_id"]

    full_path = OUT_DIR / "boundaries" / "municipalities.geojson"
    export_gdf.to_file(full_path, driver="GeoJSON")
    print(f"  {full_path.relative_to(Path.cwd())} ({full_path.stat().st_size // 1024} KB)")

    # Simplified (tolerance ~50m in metric, reprojected back)
    gdf_simp = gdf_metric.copy()
    gdf_simp.geometry = gdf_simp.geometry.simplify(50, preserve_topology=True)
    gdf_simp = gdf_simp.to_crs(epsg=EPSG_WEB)
    export_simp = gdf_simp[["geo_unit_id", "name_official", "slug", "geometry"]].copy()
    export_simp["nameDisplay"] = gdf["name_official"]
    export_simp["geoUnitId"] = gdf["geo_unit_id"]
    simp_path = OUT_DIR / "boundaries" / "municipalities_simplified.geojson"
    export_simp.to_file(simp_path, driver="GeoJSON")
    print(f"  {simp_path.relative_to(Path.cwd())} ({simp_path.stat().st_size // 1024} KB)")

    # Identity JSON
    identity: dict = {}
    for _, row in gdf.iterrows():
        uid = row["geo_unit_id"]
        identity[uid] = {
            "geoUnitId": uid,
            "datasetId": "community_municipalities",
            "code": uid,
            "nameOfficial": row["name_official"],
            "nameDisplay": row["name_official"],
            "nameAscii": row["name_ascii"],
            "slug": row["slug"],
            "areaKm2": float(row["area_km2"]),
            "centroid": {"lat": float(row["centroid_lat"]), "lng": float(row["centroid_lng"])},
            "labelPoint": {"lat": float(row["label_lat"]), "lng": float(row["label_lng"])},
            "bbox": [
                float(row["bbox_minlng"]),
                float(row["bbox_minlat"]),
                float(row["bbox_maxlng"]),
                float(row["bbox_maxlat"]),
            ],
        }
    id_path = OUT_DIR / "attributes" / "identity.json"
    id_path.write_text(json.dumps(identity, ensure_ascii=False, indent=2))
    print(f"  {id_path.relative_to(Path.cwd())} ({id_path.stat().st_size // 1024} KB)")

    # Neighbours JSON
    nb_path = OUT_DIR / "derived" / "neighbours.json"
    nb_path.write_text(json.dumps(neighbours, ensure_ascii=False))
    print(f"  {nb_path.relative_to(Path.cwd())} ({nb_path.stat().st_size // 1024} KB)")

    # Classifications scaffold (empty, populated by classify step)
    cls_path = OUT_DIR / "attributes" / "classifications.json"
    if not cls_path.exists():
        empty_cls = {uid: {} for uid in identity.keys()}
        cls_path.write_text(json.dumps(empty_cls, ensure_ascii=False, indent=2))
        print(f"  {cls_path.relative_to(Path.cwd())} (scaffold)")

    # Metadata
    total_area = float(gdf["area_km2"].sum().round(1))
    meta = {
        "datasetId": "community_municipalities",
        "pipelineVersion": "1.0.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceFile": raw_path.name,
        "featureCount": len(gdf),
        "expectedCount": EXPECTED_COUNT,
        "projectionWeb": f"EPSG:{EPSG_WEB}",
        "projectionMetric": f"EPSG:{EPSG_METRIC}",
        "totalAreaKm2": total_area,
        "areaMin": float(gdf["area_km2"].min().round(2)),
        "areaMax": float(gdf["area_km2"].max().round(2)),
        "outputFiles": [
            str(full_path.relative_to(OUT_DIR.parent.parent)),
            str(simp_path.relative_to(OUT_DIR.parent.parent)),
            str(id_path.relative_to(OUT_DIR.parent.parent)),
            str(nb_path.relative_to(OUT_DIR.parent.parent)),
        ],
    }
    meta_path = OUT_DIR / "metadata" / "data_version.json"
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
    print(f"  {meta_path.relative_to(Path.cwd())} (metadata)")

    # 13. Validation report
    print("\n=== VALIDATION REPORT ===")
    print(f"  Feature count:   {len(gdf)} / {EXPECTED_COUNT} expected")
    print(f"  CRS (output):    EPSG:{EPSG_WEB}")
    print(f"  Total area:      {total_area} km² (expected ~8,028 km²)")
    print(f"  Area range:      {gdf['area_km2'].min():.2f} – {gdf['area_km2'].max():.2f} km²")
    print(f"  Neighbour range: {min(len(v) for v in neighbours.values())} – {max(len(v) for v in neighbours.values())}")
    print(f"  Duplicate IDs:   {gdf['geo_unit_id'].duplicated().sum()}")
    print(f"  Null geometries: {gdf.geometry.isna().sum()}")
    print(f"  Invalid geom:    {(~gdf.geometry.is_valid).sum()}")
    print("\nDone.")


if __name__ == "__main__":
    main()
