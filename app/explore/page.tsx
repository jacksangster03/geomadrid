"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MapWrapper from "@/components/map/MapWrapper";
import { loadGeoJSON, loadAttributeBundle, type AttributeBundle } from "@/lib/data/loader";
import { getEnabledV1Layers, LAYER_GROUP_LABELS } from "@/config/atlasLayers";
import type { AtlasLayerConfig } from "@/types/atlas";

export default function ExplorePage() {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [bundle, setBundle] = useState<AttributeBundle | null>(null);
  const [dataError, setDataError] = useState(false);
  const [activeLayer, setActiveLayer] = useState<AtlasLayerConfig | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const enabledLayers = getEnabledV1Layers();

  useEffect(() => {
    Promise.all([loadGeoJSON(), loadAttributeBundle()]).then(([geo, attrs]) => {
      if (!geo) {
        setDataError(true);
        return;
      }
      setGeojson(geo);
      setBundle(attrs);
      setActiveLayer(enabledLayers[0] ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedMunicipality =
    selectedId && bundle?.identity[selectedId]
      ? bundle.identity[selectedId]
      : null;

  return (
    <main className="flex flex-col h-screen bg-slate-50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shrink-0">
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">
          ← GeoMadrid
        </Link>
        <h1 className="text-sm font-semibold text-slate-700">Explore</h1>
        <div className="w-16" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside className="w-56 bg-white border-r border-slate-200 flex flex-col overflow-y-auto shrink-0">
          <div className="p-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Layers
            </p>
            {enabledLayers.map((layer) => (
              <button
                key={layer.id}
                onClick={() => setActiveLayer(layer)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                  activeLayer?.id === layer.id
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="font-medium">{layer.label}</div>
                <div className="text-xs text-slate-400 mt-0.5 capitalize">
                  {LAYER_GROUP_LABELS[layer.group]}
                </div>
              </button>
            ))}
          </div>

          {activeLayer && (
            <div className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Active layer
              </p>
              <p className="text-sm font-medium text-slate-800">{activeLayer.label}</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {activeLayer.description}
              </p>
              {activeLayer.citation && (
                <p className="text-xs text-slate-300 mt-2">
                  Source: {activeLayer.citation}
                </p>
              )}
            </div>
          )}
        </aside>

        {/* Map */}
        <div className="flex-1 relative">
          {dataError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 gap-4 px-8 text-center">
              <div className="text-4xl">📂</div>
              <h2 className="text-lg font-semibold text-slate-700">
                Boundary data not found
              </h2>
              <p className="text-sm text-slate-500 max-w-sm">
                Run the data pipeline to generate the official municipality
                boundaries, then restart the dev server.
              </p>
              <code className="text-xs bg-slate-100 px-3 py-2 rounded-lg text-slate-600 font-mono">
                cd data/pipeline && python build_municipalities.py
              </code>
            </div>
          ) : (
            <>
              {hoveredName && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white px-3 py-1.5 rounded-lg shadow-md border border-slate-200 text-sm font-medium text-slate-800 pointer-events-none">
                  {hoveredName}
                </div>
              )}
              <MapWrapper
                geojson={geojson}
                mode="explore"
                selectedId={selectedId ?? undefined}
                onPolygonClick={(id, name) => {
                  setSelectedId(id);
                  setSelectedName(name);
                }}
                onPolygonHover={(_id, name) => setHoveredName(name)}
              />
            </>
          )}
        </div>

        {/* Right profile panel */}
        <aside className="w-64 bg-white border-l border-slate-200 flex flex-col overflow-y-auto shrink-0">
          {selectedMunicipality ? (
            <div className="p-4">
              <h2 className="text-base font-semibold text-slate-900 mb-1">
                {selectedMunicipality.nameDisplay}
              </h2>
              <p className="text-xs text-slate-400 mb-4 font-mono">
                {selectedMunicipality.geoUnitId}
              </p>

              <div className="space-y-3">
                <StatRow label="Area" value={`${selectedMunicipality.areaKm2.toFixed(1)} km²`} />
                <StatRow
                  label="Neighbours"
                  value={
                    bundle?.neighbours[selectedMunicipality.geoUnitId]?.length?.toString() ?? "—"
                  }
                />
              </div>

              {bundle?.neighbours[selectedMunicipality.geoUnitId]?.length ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Neighbours
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {bundle.neighbours[selectedMunicipality.geoUnitId].map((nbId) => (
                      <button
                        key={nbId}
                        onClick={() => {
                          const nbIdentity = bundle.identity[nbId];
                          if (nbIdentity) {
                            setSelectedId(nbId);
                            setSelectedName(nbIdentity.nameDisplay);
                          }
                        }}
                        className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        {bundle.identity[nbId]?.nameDisplay ?? nbId}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="text-3xl mb-3">👆</div>
              <p className="text-sm text-slate-400">
                Click a municipality to see its profile.
              </p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}
