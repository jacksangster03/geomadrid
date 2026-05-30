"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DifficultyConfig } from "@/config/difficulty";
import {
  NULL_COLOR,
  HOVER_COLOR,
  SELECTED_COLOR,
  DEFAULT_FILL,
  DEFAULT_OUTLINE,
} from "@/lib/atlas/scale";

export interface PolygonColorMap {
  [geoUnitId: string]: string;
}

export interface GeoMapProps {
  geojson: GeoJSON.FeatureCollection | null;
  geoUnitIdKey?: string;
  difficulty?: DifficultyConfig | null;
  colorMap?: PolygonColorMap;
  highlightedId?: string | null;
  selectedId?: string | null;
  correctId?: string | null;
  wrongId?: string | null;
  onPolygonClick?: (geoUnitId: string, name: string) => void;
  onPolygonHover?: (geoUnitId: string | null, name: string | null) => void;
  mode?: "quiz" | "explore";
}

const BASEMAP_STYLES: Record<string, string> = {
  terrain:
    "https://tiles.stadiamaps.com/styles/stamen_terrain.json",
  light:
    "https://tiles.stadiamaps.com/styles/alidade_smooth.json",
  blank: "",
};

const BLANK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#f8fafc" },
    },
  ],
};

export default function GeoMap({
  geojson,
  geoUnitIdKey = "geoUnitId",
  difficulty,
  colorMap,
  highlightedId,
  selectedId,
  correctId,
  wrongId,
  onPolygonClick,
  onPolygonHover,
  mode = "explore",
}: GeoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hoveredIdRef = useRef<string | null>(null);

  const getStyle = useCallback((): string | maplibregl.StyleSpecification => {
    const basemap = difficulty?.basemapStyle ?? "light";
    if (basemap === "blank") return BLANK_STYLE;
    return BASEMAP_STYLES[basemap] ?? BLANK_STYLE;
  }, [difficulty]);

  // Build MapLibre expression to colour fills from colorMap
  const buildFillColorExpression = useCallback(
    (
      cMap: PolygonColorMap | undefined,
      hId: string | null | undefined,
      sId: string | null | undefined,
      cId: string | null | undefined,
      wId: string | null | undefined
    ): maplibregl.ExpressionSpecification => {
      const cases: (string | maplibregl.ExpressionSpecification)[] = ["case"];

      if (wId) {
        cases.push(["==", ["get", geoUnitIdKey], wId], "#ef4444");
      }
      if (cId) {
        cases.push(["==", ["get", geoUnitIdKey], cId], "#22c55e");
      }
      if (sId && mode === "explore") {
        cases.push(["==", ["get", geoUnitIdKey], sId], SELECTED_COLOR);
      }
      if (hId && difficulty?.showHoverHighlight !== false) {
        cases.push(["==", ["get", geoUnitIdKey], hId], HOVER_COLOR);
      }

      if (cMap && Object.keys(cMap).length > 0) {
        const matchCases: (string | maplibregl.ExpressionSpecification)[] = [
          "match",
          ["get", geoUnitIdKey],
        ];
        Object.entries(cMap).forEach(([id, color]) => {
          matchCases.push(id, color);
        });
        matchCases.push(NULL_COLOR);
        cases.push(matchCases as maplibregl.ExpressionSpecification);
      } else {
        cases.push(DEFAULT_FILL);
      }

      return cases as maplibregl.ExpressionSpecification;
    },
    [geoUnitIdKey, difficulty, mode]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getStyle(),
      center: [-3.7, 40.4],
      zoom: 7.5,
      minZoom: 5,
      maxZoom: 16,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      if (!geojson) return;

      map.addSource("municipalities", {
        type: "geojson",
        data: geojson,
        generateId: true,
      });

      const outlineWeight = difficulty?.outlineWeight ?? 1.5;

      // Fill layer
      map.addLayer({
        id: "municipalities-fill",
        type: "fill",
        source: "municipalities",
        paint: {
          "fill-color": buildFillColorExpression(
            colorMap,
            hoveredIdRef.current,
            selectedId,
            correctId,
            wrongId
          ),
          "fill-opacity": 0.7,
        },
      });

      // Outline layer
      map.addLayer({
        id: "municipalities-outline",
        type: "line",
        source: "municipalities",
        paint: {
          "line-color": DEFAULT_OUTLINE,
          "line-width": outlineWeight,
        },
      });

      // Hover and click
      map.on("mousemove", "municipalities-fill", (e) => {
        if (!e.features?.length) return;
        const feature = e.features[0];
        const id = feature.properties?.[geoUnitIdKey] as string;
        const name = (feature.properties?.nameDisplay ?? "") as string;

        if (id !== hoveredIdRef.current) {
          hoveredIdRef.current = id;
          map.setPaintProperty(
            "municipalities-fill",
            "fill-color",
            buildFillColorExpression(colorMap, id, selectedId, correctId, wrongId)
          );
          if (difficulty?.showHoverHighlight !== false) {
            map.getCanvas().style.cursor = "pointer";
          }
          if (difficulty?.showHoverName !== false) {
            onPolygonHover?.(id, name);
          } else {
            onPolygonHover?.(id, null);
          }
        }
      });

      map.on("mouseleave", "municipalities-fill", () => {
        hoveredIdRef.current = null;
        map.setPaintProperty(
          "municipalities-fill",
          "fill-color",
          buildFillColorExpression(colorMap, null, selectedId, correctId, wrongId)
        );
        map.getCanvas().style.cursor = "";
        onPolygonHover?.(null, null);
      });

      map.on("click", "municipalities-fill", (e) => {
        if (!e.features?.length) return;
        const feature = e.features[0];
        const id = feature.properties?.[geoUnitIdKey] as string;
        const name = (feature.properties?.nameDisplay ?? "") as string;
        onPolygonClick?.(id, name);
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geojson, getStyle]);

  // Sync fill colors when deps change without remounting
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("municipalities-fill")) return;
    map.setPaintProperty(
      "municipalities-fill",
      "fill-color",
      buildFillColorExpression(colorMap, hoveredIdRef.current, selectedId, correctId, wrongId)
    );
  }, [colorMap, selectedId, correctId, wrongId, buildFillColorExpression]);

  // Sync outline weight
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("municipalities-outline")) return;
    map.setPaintProperty(
      "municipalities-outline",
      "line-width",
      difficulty?.outlineWeight ?? 1.5
    );
  }, [difficulty?.outlineWeight]);

  // Highlight / zoom to target on quiz change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !highlightedId || !geojson) return;
    const feature = geojson.features.find(
      (f) => f.properties?.[geoUnitIdKey] === highlightedId
    );
    if (!feature || feature.geometry.type === "Point") return;
    // Compute bbox and fit
    if (
      feature.geometry.type === "Polygon" ||
      feature.geometry.type === "MultiPolygon"
    ) {
      const coords: number[][] = [];
      const collect = (ring: number[][]) => ring.forEach((c) => coords.push(c));
      if (feature.geometry.type === "Polygon") {
        feature.geometry.coordinates.forEach(collect);
      } else {
        feature.geometry.coordinates.forEach((poly) => poly.forEach(collect));
      }
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      map.fitBounds(
        [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
        { padding: 80, duration: 500 }
      );
    }
  }, [highlightedId, geojson, geoUnitIdKey]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ minHeight: 400 }}
    />
  );
}
