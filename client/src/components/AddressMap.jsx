import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: icon, iconRetinaUrl: iconRetina, shadowUrl: iconShadow });

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return null;
}

export default function AddressMap({ lat, lng, onPick, interactive = true, showLocateButton = false, showDirectionsLink = false, height = 240 }) {
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocateError('Tu navegador no soporta geolocalización');
      return;
    }
    setLocating(true);
    setLocateError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPick(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocateError('No pudimos acceder a tu ubicación. Revisa los permisos del navegador.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="address-map">
      <div className="address-map-frame" style={{ height }}>
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={interactive}
          dragging={interactive}
          doubleClickZoom={interactive}
          zoomControl={interactive}
          touchZoom={interactive}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={[lat, lng]}
            draggable={interactive}
            eventHandlers={
              interactive
                ? {
                    dragend(e) {
                      const p = e.target.getLatLng();
                      onPick(p.lat, p.lng);
                    },
                  }
                : {}
            }
          />
          {interactive && <ClickHandler onPick={onPick} />}
          <Recenter lat={lat} lng={lng} />
        </MapContainer>
        {showLocateButton && (
          <button type="button" className="locate-btn" onClick={useMyLocation} disabled={locating}>
            {locating ? 'Ubicando…' : '📍 Usar mi ubicación'}
          </button>
        )}
      </div>
      {showDirectionsLink && (
        <a
          className="btn secondary directions-link"
          href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          🧭 Cómo llegar (Google Maps)
        </a>
      )}
      {locateError && <p className="alert error small">{locateError}</p>}
    </div>
  );
}
