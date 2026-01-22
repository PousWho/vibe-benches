"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type LngLat = { lng: number; lat: number };

const MOCK_BENCHES = [
  {
    id: "1",
    title: "Лавка с видом на закат",
    description: "Очень вайбово, особенно вечером 🌅",
    lat: 42.4309,
    lng: 19.2625,
    ratings: {
      accessibility: 4,
      crowd: 2,
      view: 5,
      vibe: 5,
    },
  },
  {
    id: "2",
    title: "Тихая лавочка у воды",
    description: "Мало людей, слышно воду, идеально посидеть.",
    lat: 42.4285,
    lng: 19.2651,
    ratings: {
      accessibility: 3,
      crowd: 1,
      view: 4,
      vibe: 4,
    },
  },
];


export default function MapView() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const [hasToken, setHasToken] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);

// eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      setHasToken(false);
      return;
    }

    mapboxgl.accessToken = token;

    if (!mapContainerRef.current || mapRef.current) return;

    const fallback: LngLat = { lng: 19.2636, lat: 42.4304 }; // Подгорица

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [fallback.lng, fallback.lat],
      zoom: 12,
    });

    mapRef.current = map;

    MOCK_BENCHES.forEach((bench) => {
  const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
    <div style="font-family: system-ui; max-width: 220px">
      <h3 style="margin: 0 0 4px; font-weight: 600">${bench.title}</h3>
      <p style="margin: 0 0 6px; font-size: 13px">${bench.description}</p>

      <div style="font-size: 13px">
        🚶 Доступность: ${bench.ratings.accessibility}⭐<br/>
        👥 Людность: ${bench.ratings.crowd}⭐<br/>
        🌄 Вид: ${bench.ratings.view}⭐<br/>
        ✨ Вайб: ${bench.ratings.vibe}⭐
      </div>
    </div>
  `);

  new mapboxgl.Marker({ color: "#16a34a" })
    .setLngLat([bench.lng, bench.lat])
    .setPopup(popup)
    .addTo(map);
});


    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      "top-right"
    );

    if (!navigator.geolocation) {
      setGeoError("Геолокация не поддерживается");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me: LngLat = {
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
        };

        map.flyTo({ center: [me.lng, me.lat], zoom: 14 });

        markerRef.current = new mapboxgl.Marker()
          .setLngLat([me.lng, me.lat])
          .addTo(map);
      },
      (err) => {
        setGeoError(err.message);
      }
    );

    return () => {
      markerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full" />

      <div className="absolute left-3 top-3 rounded-xl bg-black/70 px-3 py-2 text-sm text-white">
        {!hasToken && "Нет NEXT_PUBLIC_MAPBOX_TOKEN"}
        {hasToken && geoError && `Гео ошибка: ${geoError}`}
        {hasToken && !geoError && "Карта загружена"}
      </div>
    </div>
  );
}
