"use client";

import { use } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { difficultyConfigs, type QuizDifficulty } from "@/config/difficulty";
import { loadGeoJSON } from "@/lib/data/loader";
import MapWrapper from "@/components/map/MapWrapper";

interface PageProps {
  params: Promise<{ difficulty: string }>;
}

export default function QuizPage({ params }: PageProps) {
  const { difficulty } = use(params);
  const config = difficultyConfigs[difficulty as QuizDifficulty];
  if (!config) notFound();

  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [dataError, setDataError] = useState(false);
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  useEffect(() => {
    loadGeoJSON().then((data) => {
      if (!data) setDataError(true);
      else setGeojson(data);
    });
  }, []);

  return (
    <main className="flex flex-col h-screen bg-slate-50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shrink-0">
        <Link href="/play" className="text-sm text-slate-400 hover:text-slate-600">
          ← Difficulty
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">{config.publicLabel}</span>
          <span className="text-xs text-slate-400">{config.scoreMultiplier}× score</span>
        </div>
        <div className="w-16" />
      </div>

      {/* Quiz prompt banner */}
      <div className="flex items-center justify-center py-4 px-4 bg-white border-b border-slate-100 shrink-0">
        <div className="text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">
            Find this municipality
          </p>
          <p className="text-xl font-semibold text-slate-900">
            Quiz coming in Phase 2
          </p>
          {hoveredName && config.showHoverName && (
            <p className="text-sm text-blue-600 mt-1">{hoveredName}</p>
          )}
        </div>
      </div>

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
              boundaries.
            </p>
            <code className="text-xs bg-slate-100 px-3 py-2 rounded-lg text-slate-600 font-mono">
              cd data/pipeline && python build_municipalities.py
            </code>
          </div>
        ) : (
          <MapWrapper
            geojson={geojson}
            difficulty={config}
            mode="quiz"
            onPolygonHover={(_id, name) => setHoveredName(name)}
            onPolygonClick={(id, name) => {
              console.log("Clicked:", id, name);
            }}
          />
        )}
      </div>

      {/* Bottom HUD */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-t border-slate-200 shrink-0">
        <div className="text-sm text-slate-500">
          Round <span className="font-semibold text-slate-800">—</span> /{" "}
          {config.totalRounds}
        </div>
        <div className="text-sm text-slate-500">
          Score <span className="font-semibold text-slate-800">0</span>
        </div>
        <div className="text-sm text-slate-500">
          Streak <span className="font-semibold text-slate-800">0</span>
        </div>
      </div>
    </main>
  );
}
