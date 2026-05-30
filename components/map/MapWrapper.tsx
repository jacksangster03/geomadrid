"use client";

import dynamic from "next/dynamic";
import type { GeoMapProps } from "./GeoMap";

// MapLibre GL is browser-only — dynamic import with no SSR
const GeoMap = dynamic(() => import("./GeoMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center">
      <span className="text-slate-400 text-sm">Loading map...</span>
    </div>
  ),
});

export default function MapWrapper(props: GeoMapProps) {
  return <GeoMap {...props} />;
}
