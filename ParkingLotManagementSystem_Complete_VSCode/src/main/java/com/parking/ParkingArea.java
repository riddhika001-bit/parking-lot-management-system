package com.parking;

import java.util.ArrayList;
import java.util.List;

public class ParkingArea {
    private final int id;
    private final String name;
    private final String location;
    private final List<ParkingSlot> slots = new ArrayList<>();

    public ParkingArea(int id, String name, String location, int totalSlots) {
        this.id = id;
        this.name = name;
        this.location = location;
        for (int i = 1; i <= totalSlots; i++) slots.add(new ParkingSlot(i));
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public String getLocation() { return location; }
    public List<ParkingSlot> getSlots() { return slots; }

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
