# Database Schema & Security Design

## PostgreSQL Relational Design

### Core Tables & Relationships
- `profiles` (1:1 with `auth.users`)
- `routes` (1:N with `stops`, 1:N with `buses`)
- `buses` (1:1 with `drivers`, 1:N with `trips`, 1:1 with `current_bus_locations`)
- `students` (N:1 with `buses`, N:1 with `routes`, N:1 with `stops`)
- `trips` (1:N with `bus_locations`)
- `emergency_alerts` (N:1 with `buses`, N:1 with `drivers`)
- `notifications` (System broadcasts)

## Indexes
- `idx_bus_locations_bus_id`
- `idx_bus_locations_timestamp` (DESC)
- `idx_current_bus_locations_bus_id`
- `idx_trips_status`
