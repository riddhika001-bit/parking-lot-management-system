package com.parking;

public class ParkingSlot {
    private final int number;
    private Vehicle vehicle;
    private long entryTime;

    public ParkingSlot(int number) {
        this.number = number;
    }

    public int getNumber() { return number; }
    public Vehicle getVehicle() { return vehicle; }
    public long getEntryTime() { return entryTime; }
    public boolean isOccupied() { return vehicle != null; }

    public void park(Vehicle vehicle) {
        if (isOccupied()) throw new IllegalStateException("Slot already occupied.");
        this.vehicle = vehicle;
        this.entryTime = System.currentTimeMillis();
    }

    public void free() {
        vehicle = null;
        entryTime = 0;
    }
}
