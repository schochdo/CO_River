import React, { useRef, useState, useEffect } from 'react';
import { useKeyboardFlight } from './useKeyboardFlight';
import type { CameraMode, MapInstance } from './types';

export interface MyMapComponentProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  initialPitch?: number;
  initialBearing?: number;
}

/**
 * Example production React component demonstrating the 60 FPS
 * 3D Keyboard Flight Camera Controller integration.
 */
export const MyMapComponent: React.FC<MyMapComponentProps> = ({
  initialCenter = [-111.59, 36.86], // Glen Canyon / Lake Powell
  initialZoom = 11.2,
  initialPitch = 54,
  initialBearing = 40,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [altitude, setAltitude] = useState<number | null>(null);
  const [bearing, setBearing] = useState<number>(initialBearing);
  const [pitch, setPitch] = useState<number>(initialPitch);
  const [cameraMode, setCameraMode] = useState<CameraMode>('idle');

  // Single-hook 60 FPS Game-Engine 3D Flight Camera Controller
  useKeyboardFlight({
    map: mapRef.current,
    isLoaded: mapLoaded,
    onAltitudeChange: setAltitude,
    onBearingChange: setBearing,
    onPitchChange: setPitch,
    onModeChange: setCameraMode,
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamically access maplibregl from window or consuming bundle
    const maplibregl = (window as any).maplibregl;
    if (!maplibregl) {
      console.warn('MapLibre GL JS not loaded on window.');
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: initialCenter,
      zoom: initialZoom,
      pitch: initialPitch,
      bearing: initialBearing,
      maxPitch: 85,
    });

    mapRef.current = map;

    map.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [initialCenter, initialZoom, initialPitch, initialBearing]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Flight HUD & Live Telemetry Overlay */}
      {cameraMode === 'flight' && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: 24,
            background: 'rgba(15, 23, 42, 0.85)',
            color: '#f8fafc',
            padding: '8px 14px',
            borderRadius: 8,
            fontFamily: 'monospace',
            fontSize: 12,
            pointerEvents: 'none',
            display: 'flex',
            gap: 16,
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <span>PITCH: {pitch}°</span>
          <span>HEADING: {bearing}°</span>
          {altitude !== null && <span>ALT: {Math.round(altitude).toLocaleString()}m</span>}
          <span style={{ color: '#38bdf8' }}>3D FLIGHT ACTIVE</span>
        </div>
      )}
    </div>
  );
};

export default MyMapComponent;
