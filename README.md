# Parking Lot Management System

This repository contains two Java parking lot applications.

## Projects

- `ParkingLotManagementSystem_Complete_VSCode/` - Java Swing desktop application with admin, staff, and user dashboards.
- `ParkingLot-main/ParkingLot-main/` - Maven-based parking lot implementation with floors, vehicle spaces, and cost strategies.

## Requirements

- JDK 25 (latest LTS), with `JAVA_HOME` set to the JDK installation and `%JAVA_HOME%\bin` on `PATH`.
- Maven 3.9 or later for the Maven project.
- Node.js/npm is optional and only needed for the Swing project's npm convenience scripts.

Confirm Java is configured:

```powershell
java -version
javac -version
```

Both commands should report version 25.

## Run the desktop application

From the repository root:

```powershell
cd ParkingLotManagementSystem_Complete_VSCode
npm start
```

`npm start` compiles with `javac --release 25` and starts the Swing UI. To build only:

```powershell
npm run build
```

Alternatively, open `ParkingLotManagementSystem_Complete_VSCode/` in VS Code, install the Extension Pack for Java, select the installed JDK 25 with **Java: Configure Java Runtime**, then run `src/main/java/com/parking/Main.java`.

## Run the web dashboard

From the repository root, start the API and static web application:

```powershell
npm install
npm run start:web
```

Open `http://localhost:3000` and sign in. Keep this terminal open while using the dashboard; vehicle check-in, parking state, and live updates require the server. The existing `npm start` command remains the Java desktop application.

## Build and run the Maven project

From the repository root:

```powershell
cd ParkingLot-main/ParkingLot-main
mvn clean package
java -cp target/classes com.masai.parking.Main
```

## Repository layout

```text
ParkingLotManagementSystem_Complete_VSCode/  Swing application
ParkingLot-main/ParkingLot-main/              Maven implementation
database/schema.sql                           Database schema
```