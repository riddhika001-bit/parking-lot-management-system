# Parking Lot Management System

This Maven application models a parking lot with floors, vehicle spaces, parking tokens, and fee strategies.

## Requirements

- JDK 25 (latest LTS), with `JAVA_HOME` set and `%JAVA_HOME%\bin` on `PATH`.
- Maven 3.9 or later.

Check the active Java version before building:

```powershell
java -version
javac -version
```

Both should report version 25.

## Build and run

From this directory:

```powershell
mvn clean package
java -cp target/classes com.masai.parking.Main
```

Lombok is used at compile time and does not need to be added to the runtime classpath.
