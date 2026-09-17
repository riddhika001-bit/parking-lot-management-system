package com.parking;

import java.util.ArrayList;
import java.util.List;

public class DataStore {
    public static final List<ParkingArea> areas = new ArrayList<>();
    public static final List<ParkingRecord> records = new ArrayList<>();
    public static final List<String[]> users = new ArrayList<>();
    public static final List<String[]> staff = new ArrayList<>();

    static {
        areas.add(new ParkingArea(1, "VVIT Main Parking", "Kothanur", 20));
        areas.add(new ParkingArea(2, "City Center Parking", "Bengaluru", 30));
        areas.add(new ParkingArea(3, "Mall Parking", "Hennur", 25));

        users.add(new String[]{"Riddhika Sharma", "user", "user123", "KA01AB1234", "Car"});
        staff.add(new String[]{"Parking Staff", "staff", "staff123", "1"});
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
