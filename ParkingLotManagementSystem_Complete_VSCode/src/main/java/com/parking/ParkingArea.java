package com.parking;

import java.util.ArrayList;
import java.util.List;

public class ParkingArea {
    private final int id;
    private final String name;
    private final String location;
    private final List<ParkingSlot> slots = new ArrayList<>();
    // Rates per vehicle type (₹/hour)
    private final double bikeRate;
    private final double carRate;
    private final double heavyRate;

    public ParkingArea(int id, String name, String location, int totalSlots, double bikeRate, double carRate, double heavyRate) {
        this.id = id;
        this.name = name;
        this.location = location;
        this.bikeRate = bikeRate;
        this.carRate = carRate;
        this.heavyRate = heavyRate;
        for (int i = 1; i <= totalSlots; i++) slots.add(new ParkingSlot(i));
    }

    // Default rates for backward compatibility
    public ParkingArea(int id, String name, String location, int totalSlots) {
        this(id, name, location, totalSlots, 10.0, 30.0, 50.0);
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public String getLocation() { return location; }
    public List<ParkingSlot> getSlots() { return slots; }
    public double getBikeRate() { return bikeRate; }
    public double getCarRate() { return carRate; }
    public double getHeavyRate() { return heavyRate; }

    public double getRateForVehicle(String vehicleType) {
        String type = vehicleType.toLowerCase();
        if (type.equals("bike") || type.equals("scooter") || type.equals("two-wheeler")) {
            return bikeRate;
        }
        if (type.equals("car") || type.equals("sedan") || type.equals("hatchback") || type.equals("suv") || type.equals("muv") || type.equals("four-wheeler")) {
            return carRate;
        }
        if (type.equals("heavy") || type.equals("truck") || type.equals("bus") || type.equals("lorry")) {
            return heavyRate;
        }
        return carRate; // default
    }

    public ParkingSlot firstAvailableSlot() {
        for (ParkingSlot s : slots) if (!s.isOccupied()) return s;
        return null;
    }

    public int occupiedCount() {
        int n = 0;
        for (ParkingSlot s : slots) if (s.isOccupied()) n++;
        return n;
    }

    public int availableCount() { return slots.size() - occupiedCount(); }
}
