import React from 'react';
import { StyleSheet, View, Text, Platform, DimensionValue } from 'react-native';
import { GPSCoordinate, COLLEGE_LOCATION, Stop } from '@college-bus/shared';

let WebViewComponent: any = null;
if (Platform.OS !== 'web') {
  try {
    WebViewComponent = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('WebView native module not available');
  }
}

interface OSMMapViewProps {
  busLocation?: GPSCoordinate | null;
  userLocation?: GPSCoordinate | null;
  busNumber?: string;
  routeNumber?: string;
  routeColor?: string;
  stops?: Stop[];
  boardingStop?: Stop | null;
  height?: DimensionValue;
}

export const OSMMapView: React.FC<OSMMapViewProps> = ({
  busLocation = { latitude: 9.449, longitude: 77.5472, speed: 30, heading: 45 },
  userLocation,
  busNumber = 'BUS-01',
  routeNumber = 'Route 1',
  routeColor = '#2563eb', // Default Route 1 Royal Electric Blue
  stops = [],
  boardingStop,
  height,
}) => {
  const busLat = busLocation?.latitude || 9.449;
  const busLng = busLocation?.longitude || 77.5472;
  const speed = Math.round(busLocation?.speed || 0);
  const heading = busLocation?.heading || 0;

  const stopsJson = JSON.stringify(
    stops.map((s, idx) => {
      // Haversine distance in km from bus to this stop
      const R = 6371;
      const dLat = ((s.latitude - busLat) * Math.PI) / 180;
      const dLon = ((s.longitude - busLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((busLat * Math.PI) / 180) *
          Math.cos((s.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      // Dynamic ETA calculation based on speed & dwell
      let effectiveSpeed = 22;
      if (speed >= 35) effectiveSpeed = Math.min(50, Math.round(speed * 0.85));
      else if (speed >= 15) effectiveSpeed = Math.max(16, Math.round(speed * 0.9));
      else effectiveSpeed = 16;

      const stopDwell = Math.max(0, idx) * 1.2;
      const travelMins = (distKm / effectiveSpeed) * 60;
      const totalEtaMins = Math.max(1, Math.round(travelMins + stopDwell));

      const now = new Date();
      const arrDate = new Date(now.getTime() + totalEtaMins * 60 * 1000);
      const arrH = arrDate.getHours();
      const arrM = arrDate.getMinutes();
      const ampm = arrH >= 12 ? 'PM' : 'AM';
      const liveEtaTime = `${(arrH % 12 || 12).toString().padStart(2, '0')}:${arrM.toString().padStart(2, '0')} ${ampm}`;

      let delayLabel = 'On Time';
      let delayColor = '#10b981';
      let isDelayed = false;

      if (totalEtaMins <= 2) {
        delayLabel = 'Arriving Soon';
        delayColor = '#f59e0b';
      } else if (s.estimated_arrival) {
        const parts = s.estimated_arrival.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (parts) {
          let sH = parseInt(parts[1], 10);
          const sM = parseInt(parts[2], 10);
          if (parts[3].toUpperCase() === 'PM' && sH < 12) sH += 12;
          if (parts[3].toUpperCase() === 'AM' && sH === 12) sH = 0;
          const sDate = new Date(now);
          sDate.setHours(sH, sM, 0, 0);
          const diffMins = Math.round((arrDate.getTime() - sDate.getTime()) / (60 * 1000));
          if (diffMins > 2) {
            isDelayed = true;
            delayLabel = `Delayed (+${diffMins}m)`;
            delayColor = '#f43f5e';
          } else if (diffMins < -3) {
            delayLabel = `${Math.abs(diffMins)}m Early`;
            delayColor = '#38bdf8';
          }
        }
      }

      return {
        id: s.id,
        name: s.stop_name,
        lat: s.latitude,
        lng: s.longitude,
        order: idx + 1,
        isStart: idx === 0,
        isEnd: idx === stops.length - 1,
        isBoarding: boardingStop ? boardingStop.id === s.id : false,
        scheduledEta: s.estimated_arrival || '--',
        liveEta: liveEtaTime,
        etaMinutes: totalEtaMins,
        distanceKm: distKm.toFixed(1),
        delayLabel,
        delayColor,
        isDelayed,
      };
    })
  );

  const userLocationJson = userLocation
    ? JSON.stringify({
        lat: userLocation.latitude,
        lng: userLocation.longitude,
        accuracy: userLocation.accuracy || 8,
      })
    : 'null';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body, html { 
          width: 100%; 
          height: 100%; 
          margin: 0; 
          padding: 0; 
          overflow: hidden; 
          background: #080c14; 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
          touch-action: pan-x pan-y pinch-zoom;
        }
        
        #map { 
          width: 100%; 
          height: 100%; 
          background: #080c14 !important;
          touch-action: pan-x pan-y pinch-zoom;
        }
        
        .leaflet-container { 
          background: #080c14 !important; 
          touch-action: pan-x pan-y pinch-zoom;
        }

        /* LIVE BUS MOVING PUCK */
        .bus-marker-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transform: translate(-50%, -100%);
        }
        .bus-badge {
          background: #0f172a;
          color: #ffffff;
          padding: 2px 7px;
          border-radius: 8px;
          border: 1.5px solid ${routeColor};
          font-weight: 900;
          font-size: 10px;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 2px;
        }
        .bus-icon-circle {
          width: 24px;
          height: 24px;
          background: ${routeColor};
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: #ffffff;
          box-shadow: 0 2px 10px rgba(0,0,0,0.5);
          animation: bus-pulse 2s infinite;
        }
        @keyframes bus-pulse {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.8); }
          70% { box-shadow: 0 0 0 8px rgba(37, 99, 235, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }

        /* START POINT CIRCLE NODE */
        .start-marker {
          width: 24px;
          height: 24px;
          background: #059669;
          color: #ffffff;
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 900;
          box-shadow: 0 2px 8px rgba(5, 150, 105, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translate(-50%, -50%);
        }

        /* END POINT CIRCLE NODE */
        .end-marker {
          width: 24px;
          height: 24px;
          background: #dc2626;
          color: #ffffff;
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          font-size: 10px;
          font-weight: 900;
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translate(-50%, -50%);
        }

        /* INTERMEDIATE STOPS */
        .stop-marker {
          width: 20px;
          height: 20px;
          background: #0f172a;
          color: #38bdf8;
          border: 2px solid #ffffff;
          border-radius: 50%;
          font-size: 9.5px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          transform: translate(-50%, -50%);
        }
        .stop-marker.boarding {
          background: #f59e0b;
          color: #000000;
          border-color: #ffffff;
          border-width: 2.5px;
          width: 24px;
          height: 24px;
          font-size: 11px;
          box-shadow: 0 0 14px #f59e0b;
          animation: pulse-gold 2s infinite;
        }
        @keyframes pulse-gold {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.8); }
          70% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }

        /* USER BEACON */
        .user-beacon {
          width: 16px;
          height: 16px;
          background: #06b6d4;
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 12px #06b6d4;
          animation: beacon-pulse 2s infinite;
          transform: translate(-50%, -50%);
        }
        @keyframes beacon-pulse {
          0% { box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.9); }
          70% { box-shadow: 0 0 0 14px rgba(6, 182, 212, 0); }
          100% { box-shadow: 0 0 0 0 rgba(6, 182, 212, 0); }
        }

        /* ROUTE LEGEND BADGE */
        .route-legend-pill {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 1000;
          background: rgba(15, 23, 42, 0.92);
          border: 1.5px solid ${routeColor};
          padding: 4px 10px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.6);
        }
        .route-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 4px;
          background: ${routeColor};
        }
        .route-legend-text {
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
        }

        /* MAP CONTROLS */
        .map-ctrl-panel {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .ctrl-btn {
          width: 32px;
          height: 32px;
          background: rgba(15, 23, 42, 0.94);
          border: 1.5px solid #334155;
          border-radius: 8px;
          color: #ffffff;
          font-size: 13px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          user-select: none;
          touch-action: manipulation;
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
        }
        .ctrl-btn:active {
          background: #1e293b;
          border-color: #38bdf8;
          transform: scale(0.92);
        }
        .ctrl-btn-zoom {
          font-size: 17px;
          color: #38bdf8;
          font-family: monospace, sans-serif;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      
      <!-- Top Left Route Color Legend -->
      <div class="route-legend-pill">
        <div class="route-legend-dot"></div>
        <div class="route-legend-text">${routeNumber} &bull; ${busNumber}</div>
      </div>

      <!-- Control buttons with Zoom In (+) and Zoom Out (-) -->
      <div class="map-ctrl-panel">
        <div class="ctrl-btn ctrl-btn-zoom" onclick="zoomIn()" title="Zoom In (+)">➕</div>
        <div class="ctrl-btn ctrl-btn-zoom" onclick="zoomOut()" title="Zoom Out (-)">➖</div>
        <div class="ctrl-btn" onclick="recenterBus()" title="Recenter Bus">🚌</div>
        <div class="ctrl-btn" onclick="recenterUser()" title="Recenter Location">📍</div>
        <div class="ctrl-btn" onclick="fitAll()" title="Fit Entire Route">🗺️</div>
      </div>

      <script>
        var map = L.map('map', {
          zoomControl: false,
          touchZoom: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          dragging: true,
          tap: true,
          minZoom: 3,
          maxZoom: 20
        }).setView([${busLat}, ${busLng}], 14);
        
        // Clean Google Maps Vector Roadmap Tiles (Free & High Res Zoom)
        L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google Maps',
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          maxZoom: 20,
          minZoom: 3
        }).addTo(map);

        var bounds = [];

        // 1. Route Stops as Compact Transit Nodes
        var stops = ${stopsJson};
        var stopLatLngs = [];

        stops.forEach(function(s) {
          var sIcon;
          if (s.isStart) {
            sIcon = L.divIcon({
              html: '<div class="start-marker">' + s.order + '</div>',
              className: '',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
          } else if (s.isEnd) {
            sIcon = L.divIcon({
              html: '<div class="end-marker">🏁</div>',
              className: '',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
          } else {
            var iconClass = s.isBoarding ? 'stop-marker boarding' : 'stop-marker';
            sIcon = L.divIcon({
              html: '<div class="' + iconClass + '">' + (s.isBoarding ? '⭐' : s.order) + '</div>',
              className: '',
              iconSize: [s.isBoarding ? 24 : 20, s.isBoarding ? 24 : 20],
              iconAnchor: [s.isBoarding ? 12 : 10, s.isBoarding ? 12 : 10]
            });
          }

          var popupContent = "<div style='font-family:sans-serif;font-size:12px;padding:4px;min-width:180px;'>" +
            "<div style='font-weight:900;color:#0f172a;margin-bottom:4px;font-size:13px;'>Stop #" + s.order + ": " + s.name + "</div>" +
            "<div style='display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;'>" +
            "  <span style='color:#64748b;font-size:11px;'>Live Dynamic ETA:</span>" +
            "  <span style='color:#0284c7;font-weight:900;font-size:13px;'>" + s.liveEta + "</span>" +
            "</div>" +
            "<div style='display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;'>" +
            "  <span style='color:#64748b;font-size:11px;'>Scheduled Time:</span>" +
            "  <span style='color:#475569;font-weight:600;font-size:11px;" + (s.isDelayed ? "text-decoration:line-through;color:#94a3b8;" : "") + "'>" + s.scheduledEta + "</span>" +
            "</div>" +
            "<div style='display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;'>" +
            "  <span style='color:#64748b;font-size:11px;'>Distance / Speed:</span>" +
            "  <span style='color:#334155;font-weight:700;font-size:11px;'>" + s.distanceKm + " km &bull; ${speed} km/h</span>" +
            "</div>" +
            "<div style='background:" + (s.isDelayed ? "#fee2e2" : "#dcfce7") + ";color:" + s.delayColor + ";padding:2px 6px;border-radius:6px;font-size:10px;font-weight:800;display:inline-block;'>" +
              s.delayLabel + " (in ~" + s.etaMinutes + " mins)" +
            "</div>" +
            (s.isStart ? "<div style='color:#059669;font-weight:bold;font-size:11px;margin-top:4px;'>🟢 Route Starting Terminal</div>" :
             s.isEnd ? "<div style='color:#dc2626;font-weight:bold;font-size:11px;margin-top:4px;'>🏁 Final Campus Terminal</div>" :
             s.isBoarding ? "<div style='color:#d97706;font-weight:bold;font-size:11px;margin-top:4px;'>⭐ Your Designated Boarding Stop</div>" : "") +
            "</div>";

          L.marker([s.lat, s.lng], { icon: sIcon }).bindPopup(popupContent).addTo(map);
          stopLatLngs.push([s.lat, s.lng]);
          bounds.push([s.lat, s.lng]);
        });

        // 2. Dual-Stroke Route Polyline
        if (stopLatLngs.length > 1) {
          // Outer casing
          L.polyline(stopLatLngs, {
            color: '#0f172a',
            weight: 6,
            opacity: 0.5,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);

          // Inner solid route line
          L.polyline(stopLatLngs, {
            color: '${routeColor}',
            weight: 3.5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);
        }

        // 3. User Location Beacon (if present)
        var userLoc = ${userLocationJson};
        if (userLoc) {
          var userIcon = L.divIcon({
            html: '<div class="user-beacon"></div>',
            className: '',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
          L.marker([userLoc.lat, userLoc.lng], { icon: userIcon })
            .bindPopup("<b>📍 Live Location</b><br/>Accuracy: " + Math.round(userLoc.accuracy) + "m")
            .addTo(map);
          bounds.push([userLoc.lat, userLoc.lng]);
        }

        // 4. Moving Bus Marker
        var busIcon = L.divIcon({
          html: '<div class="bus-marker-wrap"><div class="bus-badge"><span>🚌 ${busNumber}</span></div><div class="bus-icon-circle">🚌</div></div>',
          className: '',
          iconSize: [80, 48],
          iconAnchor: [40, 48]
        });
        L.marker([${busLat}, ${busLng}], { icon: busIcon, zIndexOffset: 1000 })
          .bindPopup("<div style='font-family:sans-serif;font-size:12px;padding:2px;'><b>${busNumber}</b><br/>Route: ${routeNumber}<br/>Live Speed: <b style='color:#059669;'>${speed} km/h</b><br/>Heading: ${heading}&deg;</div>")
          .addTo(map);
        bounds.push([${busLat}, ${busLng}]);

        if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
        }

        function zoomIn() {
          map.zoomIn();
        }

        function zoomOut() {
          map.zoomOut();
        }

        function recenterBus() {
          map.flyTo([${busLat}, ${busLng}], Math.max(map.getZoom(), 15), { duration: 0.8 });
        }

        function recenterUser() {
          if (userLoc) {
            map.flyTo([userLoc.lat, userLoc.lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
          } else {
            recenterBus();
          }
        }

        function fitAll() {
          if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [35, 35] });
          }
        }
      </script>
    </body>
    </html>
  `;

  const containerHeight = height || 280;

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height: containerHeight }]}>
        <iframe
          srcDoc={htmlContent}
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 18 }}
          title="OpenStreetMap Live Telemetry"
          allow="geolocation"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      {WebViewComponent ? (
        <WebViewComponent
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          nestedScrollEnabled={true}
          scalesPageToFit={false}
          scrollEnabled={false}
        />
      ) : (
        <iframe
          srcDoc={htmlContent}
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 18 }}
          title="OpenStreetMap Live Telemetry"
          allow="geolocation"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#080c14',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  webview: {
    flex: 1,
    backgroundColor: '#080c14',
  },
});
