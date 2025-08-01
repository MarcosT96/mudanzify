"use client";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { MapContext } from "@/context/map-context";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

type MapComponentProps = {
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  initialViewState: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  children?: React.ReactNode;
};

export default function MapProvider({
  mapContainerRef,
  initialViewState,
  onMapClick,
  children,
}: MapComponentProps) {
  const map = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center: [initialViewState.longitude, initialViewState.latitude],
      zoom: initialViewState.zoom,
      attributionControl: false,
      logoPosition: "bottom-right",
    });

    map.current.on("load", () => {
      setLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [initialViewState, mapContainerRef]);

  // Handler para click en el mapa
  useEffect(() => {
    if (!loaded || !map.current) return;
    if (!onMapClick) return;

    const handler = (e: mapboxgl.MapMouseEvent) => {
      if (e.lngLat) {
        onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      }
    };
    map.current.on("click", handler);
    return () => {
      map.current?.off("click", handler);
    };
  }, [loaded, onMapClick]);

  return (
    <div className="z-[1000]">
      <MapContext.Provider value={{ map: map.current, loaded }}>
        {loaded ? children : (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-[1000]">
            <div className="text-lg font-medium">Loading map...</div>
          </div>
        )}
      </MapContext.Provider>
    </div>
  );
}
