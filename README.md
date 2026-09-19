# Parking Lot Management System

Java-based parking lot management projects collected in one repository.

## Projects

- `ParkingLotManagementSystem_Complete_VSCode/` - Java Swing desktop application with admin, staff, and user dashboards.
- `ParkingLot-main/ParkingLot-main/` - Maven-based parking lot implementation with floors, vehicle spaces, and cost strategies.

## Requirements

- JDK 8 or later
- Maven 3.6 or later for the Maven project

## Run the desktop application

From the repository root:

```powershell
npm start
```

The command compiles the Java Swing application and starts `com.parking.Main`.

You can also run it manually:

```powershell
javac -d bin ParkingLotManagementSystem_Complete_VSCode/src/main/java/com/parking/*.java
java -cp bin com.parking.Main
```

## Build the Maven project

```powershell
cd ParkingLot-main/ParkingLot-main
mvn clean package
```

## Repository layout

```text
ParkingLotManagementSystem_Complete_VSCode/  Swing application
ParkingLot-main/ParkingLot-main/              Maven implementation
database/schema.sql                           Database schema
package.json                                  Root run script
```

## Git workflow

```powershell
git add .
git commit -m "Describe your change"
git push origin main
```