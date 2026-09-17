# Parking Lot Management System — Complete 3 Dashboard Project

A Core Java Swing project based on the supplied synopsis, expanded into a role-based desktop dashboard.

## Roles
- User / Client
- Parking Area Staff
- Administrator

## Demo credentials
- User: `user` / `user123`
- Staff: `staff` / `staff123`
- Admin: `admin` / `admin123`

## Run in VS Code
1. Open this folder in VS Code.
2. Install **Extension Pack for Java** if needed.
3. Open `src/main/java/com/parking/Main.java`.
4. Click **Run**.
5. Use one of the demo credentials above.

## Features
### User dashboard
- View parking areas
- View available slots
- Book a slot
- View current booking
- View parking history
- Vehicle details

### Staff dashboard
- Parking-area-specific slot view
- Vehicle entry
- Vehicle exit
- Automatic slot allocation
- Duration and charge calculation
- Current vehicles
- Daily summary

### Admin dashboard
- All parking areas in one view
- Occupancy overview
- Users
- Staff
- Vehicles
- Parking records
- Revenue and summary

## Notes
This version uses in-memory Java collections so it runs without installing MySQL.
The `database/` folder contains a schema for a future MySQL integration.
