# GPS Telemetry & Realtime Tracking Workflow

## GPS Flow Sequence
1. Driver opens Mobile App -> Clicks **START TRIP**.
2. Mobile App requests device GPS location permission via `expo-location`.
3. Interval timer fires every `5000ms` (configurable).
4. Coordinates `{ latitude, longitude, speed, heading, accuracy }` are pushed to Supabase.
5. Database trigger updates `current_bus_locations`.
6. Supabase Realtime WebSocket emits broadcast to Student App & Admin Web Dashboard.
7. OpenStreetMap Leaflet marker updates position smoothly.

## Offline Handling & Queue
If device loses cellular connectivity during a trip:
- Locations are queued locally in memory / AsyncStorage.
- When network connectivity returns, queued location batch is uploaded.
