# System Architecture & Technical Specifications

## Architectural Principles
1. **Zero External API Cost**: Utilizes OpenStreetMap (OSM) tile server via Leaflet JS across both React Web and React Native WebView.
2. **Dual-Table Telemetry Pattern**:
   - `current_bus_locations`: Stores only the latest coordinate per bus (UNIQUE on `bus_id`). Allows O(1) instantaneous real-time querying without table scans.
   - `bus_locations`: Appends historical telemetry for route audit and replay.
3. **Database Triggers**: Automatically updates `current_bus_locations` on every insert to `bus_locations`.
4. **Role-Based Access Control (RBAC)**: Supabase RLS enforces read/write permissions for `student`, `driver`, and `admin` roles.
