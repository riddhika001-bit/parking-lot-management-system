# Parking Lot Management System — Complete 3 Dashboard Project

A Core Java Swing project based on the supplied synopsis, expanded into a role-based desktop dashboard.

## Requirements and run

- Install JDK 25 (latest LTS), set `JAVA_HOME` to its installation directory, and add `%JAVA_HOME%\bin` to `PATH`.
- Verify the setup with `java -version` and `javac -version`; both should report version 25.
- For VS Code, install the **Extension Pack for Java**, run **Java: Configure Java Runtime**, and select the installed JDK 25.

From this directory, compile and run the desktop application with:

```powershell
npm start
```

This runs the Java 25 build and launches `com.parking.Main`. To compile without launching the UI, run `npm run build`.

To run without npm, from this directory use:

```powershell
javac --release 25 -d bin src/main/java/com/parking/*.java
java -cp bin com.parking.Main
```

## Roles
- User / Client
- Parking Area Staff
- Administrator

## Demo credentials
- User: `user` / `user123`
- Staff: `staff` / `staff123`
- Admin: `admin` / `admin123`

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
