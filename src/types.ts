export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  employee_id: string;
  department: string;
  role: 'USER' | 'ADMIN';
  horario_manana_inicio?: string;
  horario_manana_fin?: string;
  horario_tarde_inicio?: string;
  horario_tarde_fin?: string;
}

export interface Worksite {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface Record {
  id: number;
  user_id: number;
  worksite_id: number;
  type: 'IN' | 'OUT';
  latitude: number;
  longitude: number;
  distance: number;
  notes: string;
  timestamp: string;
  user_name?: string;
  worksite_name?: string;
  is_manual?: boolean;
  minutos_extra?: number;
  estado_extra?: string;
}

import { useState, useEffect } from 'react';

export function useGeolocation() {
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('La geolocalización no está soportada por su navegador');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setError(null);
      },
      (err) => { setError(err.message); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { location, error };
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
