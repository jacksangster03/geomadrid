"""
Download official Madrid municipality boundaries from the IGN INSPIRE WFS.

Source:  Instituto Geográfico Nacional (IGN) — Unidades administrativas de España
WFS:     https://contenido.ign.es/wfs-inspire/unidades-administrativas
Licence: CC BY 4.0 — ign.es

Output:  data/raw/ign_madrid_municipalities.geojson
         Flat GeoJSON with properties: NATCODE, NAMEUNIT, geometry (EPSG:4326)
         These field names match what build_municipalities.py expects.

Usage:
    cd GeoMadrid
    source .venv/bin/activate
    python data/pipeline/download_wfs.py

The WFS serves all ~8,294 Spanish administrative units paged at 250 per request
and ignores CQL filters. This script pages through all records and extracts
only those whose nationalCode starts with "34132828" (Madrid province municipalities).

National code format:  34 + AC(2) + province(2) + INE(5)
Madrid:                34 + 13(AC) + 28(province) + 28XXX(INE) = 34132828XXX
"""

import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

# ── constants ───────────────────────────────────────────────────────────────
WFS_BASE = "https://contenido.ign.es/wfs-inspire/unidades-administrativas"
NAMESPACES = {
    "wfs":  "http://www.opengis.net/wfs/2.0",
    "au":   "http://inspire.ec.europa.eu/schemas/au/4.0",
    "gml":  "http://www.opengis.net/gml/3.2",
    "gn":   "http://inspire.ec.europa.eu/schemas/gn/4.0",
}

# Madrid province municipalities: 34 + 13(AC Madrid) + 28(province) + 28XXX(INE)
MADRID_PREFIX = "34132828"
EXPECTED_COUNT = 179
PAGE_SIZE = 250
OUT_PATH = Path(__file__).parent.parent / "raw" / "ign_madrid_municipalities.geojson"


# ── geometry parsing ─────────────────────────────────────────────────────────

def parse_ring(ring_el) -> list[list[float]]:
    """Parse a GML LinearRing (lat lon pairs) into GeoJSON [lon, lat] coords."""
    pos = ring_el.find("gml:posList", NAMESPACES)
    if pos is not None and pos.text:
        nums = [float(x) for x in pos.text.split()]
        # EPSG:4258 GML = (lat, lon) order — swap to (lon, lat) for GeoJSON
        return [[nums[i + 1], nums[i]] for i in range(0, len(nums) - 1, 2)]
    # Fallback: gml:pos elements
    coords = []
    for p in ring_el.findall("gml:pos", NAMESPACES):
        lat, lon = map(float, p.text.split())
        coords.append([lon, lat])
    return coords


def parse_polygon(poly_el) -> dict:
    ext = poly_el.find("gml:exterior/gml:LinearRing", NAMESPACES)
    exterior = parse_ring(ext) if ext is not None else []
    holes = [parse_ring(i) for i in poly_el.findall("gml:interior/gml:LinearRing", NAMESPACES)]
    return {"type": "Polygon", "coordinates": [exterior] + holes}


def parse_geometry(geom_el) -> dict | None:
    ms = geom_el.find(".//gml:MultiSurface", NAMESPACES)
    if ms is not None:
        polys = []
        for sm in ms.findall("gml:surfaceMember", NAMESPACES):
            poly = sm.find("gml:Polygon", NAMESPACES)
            if poly is not None:
                polys.append(parse_polygon(poly))
        if len(polys) == 1:
            return polys[0]
        return {"type": "MultiPolygon", "coordinates": [p["coordinates"] for p in polys]}
    poly = geom_el.find(".//gml:Polygon", NAMESPACES)
    if poly is not None:
        return parse_polygon(poly)
    return None


def parse_name(unit_el) -> str:
    text_el = unit_el.find(
        "au:name/gn:GeographicalName/gn:spelling/gn:SpellingOfName/gn:text",
        NAMESPACES,
    )
    if text_el is not None and text_el.text:
        return text_el.text.strip()
    return ""


def national_code_to_natcode(nc: str) -> str:
    """34132828079 → ES28079 (extract last 5 chars = INE code)."""
    return f"ES{nc[-5:]}"


# ── fetching ─────────────────────────────────────────────────────────────────

def fetch_page(start_index: int) -> bytes:
    params = {
        "SERVICE": "WFS",
        "VERSION": "2.0.0",
        "REQUEST": "GetFeature",
        "TYPENAMES": "au:AdministrativeUnit",
        "COUNT": PAGE_SIZE,
        "STARTINDEX": start_index,
    }
    resp = requests.get(WFS_BASE, params=params, timeout=180)
    resp.raise_for_status()
    return resp.content


def parse_page(xml_bytes: bytes) -> tuple[list[dict], bool]:
    """Returns (madrid_features, has_more_pages)."""
    root = ET.fromstring(xml_bytes)
    madrid = []

    for member in root.findall("wfs:member", NAMESPACES):
        unit = member.find("au:AdministrativeUnit", NAMESPACES)
        if unit is None:
            continue
        nc_el = unit.find("au:nationalCode", NAMESPACES)
        if nc_el is None or not nc_el.text:
            continue
        nc = nc_el.text.strip()
        if not nc.startswith(MADRID_PREFIX):
            continue  # not a Madrid municipality

        geom_el = unit.find("au:geometry", NAMESPACES)
        if geom_el is None:
            print(f"  Warning: no geometry for {nc}")
            continue
        geom = parse_geometry(geom_el)
        if geom is None:
            print(f"  Warning: could not parse geometry for {nc}")
            continue

        name = parse_name(unit)
        madrid.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "NATCODE":  national_code_to_natcode(nc),
                "NAMEUNIT": name,
                "nationalCode": nc,
            },
        })

    has_more = "next" in root.attrib
    number_returned = int(root.attrib.get("numberReturned", "0"))
    return madrid, has_more and number_returned == PAGE_SIZE


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    print("=== GeoMadrid WFS downloader ===")
    print(f"Source:  {WFS_BASE}")
    print(f"Filter:  nationalCode starts with '{MADRID_PREFIX}' (post-fetch)")
    print(f"Output:  {OUT_PATH}")
    print(f"Note:    Server ignores CQL filters — paging all ~8,294 features\n")

    all_features: list[dict] = []
    start = 0
    page_num = 0
    total_processed = 0

    while True:
        page_num += 1
        print(f"  Page {page_num:3d} (startIndex={start:5d})…", end=" ", flush=True)
        try:
            xml_bytes = fetch_page(start)
        except requests.RequestException as e:
            print(f"\nERROR: {e}")
            sys.exit(1)

        page_features, has_more = parse_page(xml_bytes)
        root = ET.fromstring(xml_bytes)
        nr = int(root.attrib.get("numberReturned", "0"))
        total_processed += nr

        if page_features:
            print(f"found {len(page_features)} Madrid municipalities (total so far: {len(all_features) + len(page_features)})")
        else:
            print("—")

        all_features.extend(page_features)

        # Stop early once we have all 179 (they may appear in any page)
        if len(all_features) >= EXPECTED_COUNT:
            print(f"\n  ✓ Collected all {EXPECTED_COUNT} Madrid municipalities — stopping early")
            break

        if not has_more:
            print(f"\n  Reached end of WFS results after {total_processed} total features")
            break

        start += PAGE_SIZE

    print(f"\nTotal WFS features processed: {total_processed}")
    print(f"Madrid municipalities collected: {len(all_features)}")

    if len(all_features) == 0:
        print("ERROR: No features found. Check WFS connectivity.")
        sys.exit(1)

    if len(all_features) != EXPECTED_COUNT:
        print(f"WARNING: Expected {EXPECTED_COUNT}, got {len(all_features)}")
        # Do not exit — let the main pipeline validate and report

    # Duplicate check
    natcodes = [f["properties"]["NATCODE"] for f in all_features]
    dupes = [n for n in set(natcodes) if natcodes.count(n) > 1]
    if dupes:
        print(f"WARNING: Duplicate NATCODEs found: {dupes}")

    if "ES28079" in natcodes:
        print("  ✓ Madrid city (ES28079) present")
    else:
        print("  ✗ WARNING: Madrid city (ES28079) not found!")

    # Write output
    geojson = {
        "type": "FeatureCollection",
        "features": all_features,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(geojson, ensure_ascii=False))
    size_kb = OUT_PATH.stat().st_size // 1024
    print(f"\nWritten: {OUT_PATH} ({size_kb} KB)")
    print("\nNext step:")
    print("  python data/pipeline/build_municipalities.py")


if __name__ == "__main__":
    main()
