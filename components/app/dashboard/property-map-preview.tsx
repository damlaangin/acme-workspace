"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultMarkerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type MapPreviewProps = {
  mapKey: string;
  center: [number, number];
  zoom: number;
  markerPosition?: [number, number];
  onSelect: (lat: number, lng: number) => void;
  className?: string;
};

export default function MapPreview({
  mapKey,
  center,
  zoom,
  markerPosition,
  onSelect,
  className,
}: MapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const initTokenRef = useRef(0);
  const initializingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
    }

    if (initializingRef.current) return;
    initializingRef.current = true;
    const initToken = ++initTokenRef.current;

    // Create a fresh container div every time to avoid Leaflet reuse errors
    const mapEl = document.createElement("div");
    mapEl.style.width = "100%";
    mapEl.style.height = "100%";
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(mapEl);
    delete (mapEl as any)._leaflet_id;

    L.Marker.prototype.options.icon = defaultMarkerIcon;

    const map = L.map(mapEl).setView(center, zoom);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      onSelect(event.latlng.lat, event.latlng.lng);
    });

    if (markerPosition) {
      markerRef.current = L.marker(markerPosition).addTo(map);
    }

    initializingRef.current = false;

    return () => {
      if (initTokenRef.current !== initToken) return;
      map.remove();
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [mapKey]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom);
  }, [center, zoom]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (markerPosition) {
      if (markerRef.current) {
        markerRef.current.setLatLng(markerPosition);
      } else {
        markerRef.current = L.marker(markerPosition).addTo(mapRef.current);
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [markerPosition]);

  return <div ref={containerRef} className={className} />;
}
