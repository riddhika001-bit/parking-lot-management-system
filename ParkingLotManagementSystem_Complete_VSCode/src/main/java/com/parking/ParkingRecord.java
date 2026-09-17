package com.parking;

import java.text.SimpleDateFormat;
import java.util.Date;

public class ParkingRecord {
    private final String vehicleNumber;
    private final String vehicleType;
    private final String areaName;
    private final int slotNumber;
    private final long entryTime;
    private long exitTime;
    private double amount;
    private String status;

    public ParkingRecord(String vehicleNumber, String vehicleType, String areaName, int slotNumber) {
        this.vehicleNumber = vehicleNumber;
        this.vehicleType = vehicleType;
        this.areaName = areaName;
        this.slotNumber = slotNumber;
        this.entryTime = System.currentTimeMillis();
        this.status = "PARKED";
    }

    public String getVehicleNumber() { return vehicleNumber; }
    public String getVehicleType() { return vehicleType; }
    public String getAreaName() { return areaName; }
    public int getSlotNumber() { return slotNumber; }
    public long getEntryTime() { return entryTime; }
    public long getExitTime() { return exitTime; }
    public double getAmount() { return amount; }
    public String getStatus() { return status; }

    public void close(double amount) {
        this.exitTime = System.currentTimeMillis();
        this.amount = amount;
        this.status = "COMPLETED";
    }

    public long durationMinutes() {
        long end = exitTime == 0 ? System.currentTimeMillis() : exitTime;
        return Math.max(1, (end - entryTime) / 60000);
    }

    public String entryText() {
        return new SimpleDateFormat("dd-MM-yyyy HH:mm").format(new Date(entryTime));
    }

    public String exitText() {
        return exitTime == 0 ? "-" : new SimpleDateFormat("dd-MM-yyyy HH:mm").format(new Date(exitTime));
    }
}
