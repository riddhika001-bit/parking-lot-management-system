package com.parking;

import java.util.ArrayList;
import java.util.List;

public class DataStore {
    public static final List<ParkingArea> areas = new ArrayList<>();
    public static final List<ParkingRecord> records = new ArrayList<>();
    public static final List<String[]> users = new ArrayList<>();
    public static final List<String[]> staff = new ArrayList<>();

    // Standard rates per vehicle type (₹/hour)
    public static final double BIKE_RATE = 10.0;
    public static final double CAR_RATE = 30.0;
    public static final double HEAVY_RATE = 50.0;

    static {
        areas.add(new ParkingArea(1, "VVIT Main Parking", "Kothanur, Bengaluru", 20, BIKE_RATE, CAR_RATE, HEAVY_RATE));
        areas.add(new ParkingArea(2, "City Center Parking", "MG Road, Bengaluru", 30, BIKE_RATE, CAR_RATE, HEAVY_RATE));
        areas.add(new ParkingArea(3, "Mall Parking", "Hennur, Bengaluru", 25, BIKE_RATE, CAR_RATE, HEAVY_RATE));
        areas.add(new ParkingArea(4, "Palace Grounds Parking", "Sayyaji Rao Road, Mysuru", 18, BIKE_RATE, CAR_RATE, HEAVY_RATE));
        areas.add(new ParkingArea(5, "Coastal City Mall Parking", "Kadri, Mangaluru", 22, BIKE_RATE, CAR_RATE, HEAVY_RATE));

        users.add(new String[]{"Riddhika Sharma", "user", "user123", "KA01AB1234", "Car"});
        users.add(new String[]{"Rahul Verma", "rahul", "user123", "KA05CD5678", "SUV"});
        users.add(new String[]{"Priya Patel", "priya", "user123", "KA03EF9012", "Bike"});
        staff.add(new String[]{"Vikram Joshi", "staff", "staff123", "1"});
        staff.add(new String[]{"Amit Kumar", "staff2", "staff123", "2"});
    }

    public static ParkingArea areaById(int id) {
        for (ParkingArea a : areas) if (a.getId() == id) return a;
        return null;
    }

    // BUG-05 FIX: use the staff member's actual assigned parking area ID
    public static ParkingArea areaForStaff(String username) {
        for (String[] s : staff) {
            if (s[1].equals(username)) {
                try {
                    return areaById(Integer.parseInt(s[3]));
                } catch (NumberFormatException e) {
                    return areaById(1); // fallback if ID is malformed
                }
            }
        }
        return areaById(1); // fallback
    }

    public static ParkingRecord activeRecord(String vehicleNumber) {
        for (ParkingRecord r : records)
            if (r.getVehicleNumber().equalsIgnoreCase(vehicleNumber) && r.getStatus().equals("PARKED"))
                return r;
        return null;
    }

    public static double totalRevenue() {
        double sum = 0;
        for (ParkingRecord r : records) sum += r.getAmount();
        return sum;
    }

    public static int totalOccupied() {
        int n = 0;
        for (ParkingArea a : areas) n += a.occupiedCount();
        return n;
    }

    public static int totalSlots() {
        int n = 0;
        for (ParkingArea a : areas) n += a.getSlots().size();
        return n;
    }
}
