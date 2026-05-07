// components/buyer/maps/LocationPickerMap.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { useBuyerCity } from "@/components/buyer/CityContext";
import L from "leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Props = {
  initialLat?: number;
  initialLng?: number;
  onSelect: (data: { lat: number; lng: number; address: string }) => void;
};

const CITY_CENTERS: Record<string, [number, number]> = {
  "san-gil": [6.5557, -73.1339],
  bucaramanga: [7.1193, -73.1227],
  bogota: [4.711, -74.0721],
  granada: [3.5464, -73.7069],
};

function isValidCoord(lat?: number, lng?: number) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function MapClickHandler({
  setPosition,
}: {
  setPosition: (value: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return null;
}

function MapAutoCenter({ position }: { position: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, 15);
    setTimeout(() => {
      map.invalidateSize();
    }, 120);
  }, [map, position]);

  return null;
}

export default function LocationPickerMap({
  initialLat,
  initialLng,
  onSelect,
}: Props) {
  const { citySlug, cityLabel } = useBuyerCity();

  const initialPosition = useMemo<[number, number]>(() => {
    if (isValidCoord(initialLat, initialLng)) {
      return [Number(initialLat), Number(initialLng)];
    }

    return CITY_CENTERS[citySlug] ?? CITY_CENTERS["san-gil"];
  }, [initialLat, initialLng, citySlug]);

  const [position, setPosition] = useState<[number, number]>(initialPosition);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  function handleConfirm() {
    const [lat, lng] = position;

    setLoading(true);

    onSelect({
      lat,
      lng,
      address: `Ubicación seleccionada desde mapa - ${cityLabel}`,
    });

    setLoading(false);
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <MapContainer
        center={position}
        zoom={15}
        style={{ height: "300px", width: "100%" }}
      >
        <MapAutoCenter position={position} />

        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={position} />
        <MapClickHandler setPosition={setPosition} />
      </MapContainer>

      <div className="p-3">
        <div className="mb-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
          Ciudad activa: {cityLabel}
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white disabled:bg-slate-300"
        >
          {loading ? "Confirmando ubicación..." : "Confirmar ubicación"}
        </button>
      </div>
    </div>
  );
}