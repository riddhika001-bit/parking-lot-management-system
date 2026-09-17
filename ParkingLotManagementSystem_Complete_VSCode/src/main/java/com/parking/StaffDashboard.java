package com.parking;

import java.awt.*;
import javax.swing.*;
import javax.swing.table.DefaultTableModel;

public class StaffDashboard extends BaseDashboard {
    // Q-01 FIX: charge rate as a named constant, not a magic number
    private static final double RATE_PER_HOUR = 40.0;

    // BUG-05 FIX: area is now resolved from the staff member's actual assigned parking ID
    private final String[] currentStaff;
    private final ParkingArea area;

    private final DefaultTableModel slotModel = new DefaultTableModel(
        new String[]{"Slot", "Status", "Vehicle", "Type", "Entry Time"}, 0) {
        public boolean isCellEditable(int r, int c) { return false; }
    };
    private final JTable table = new JTable(slotModel);

    // Constructor now accepts the area chosen by staff at login
    public StaffDashboard(LoginFrame loginFrame, String[] staffData, ParkingArea selectedArea) {
        super(loginFrame, "Parking Area Staff Dashboard");
        this.currentStaff = staffData;
        this.area = selectedArea; // directly use the area staff selected at login
        build();
        refresh();
    }

    private void build() {
        JPanel root = new JPanel(new BorderLayout(15, 15));
        root.setOpaque(false);
        root.add(header("Parking Staff Dashboard", area.getName() + " \u2022 " + area.getLocation()), BorderLayout.NORTH);

        JPanel main = new JPanel(new BorderLayout(12, 12));
        main.setOpaque(false);

        JPanel cards = new JPanel(new GridLayout(1, 4, 12, 12));
        cards.setOpaque(false);
        cards.add(UI.card("Total Slots", String.valueOf(area.getSlots().size())));
        cards.add(UI.card("Occupied", String.valueOf(area.occupiedCount())));
        cards.add(UI.card("Available", String.valueOf(area.availableCount())));
        // Revenue card scoped to this area's records only
        cards.add(UI.card("Area Revenue", "\u20b9" + String.format("%.2f", areaRevenue())));
        main.add(cards, BorderLayout.NORTH);

        main.add(new JScrollPane(table), BorderLayout.CENTER);

        JPanel actions = new JPanel(new FlowLayout(FlowLayout.LEFT));
        actions.setOpaque(false);
        JButton entry = UI.button("Vehicle Entry");
        JButton exit = UI.button("Vehicle Exit");
        JButton refresh = UI.button("Refresh");
        entry.addActionListener(e -> vehicleEntry());
        exit.addActionListener(e -> vehicleExit());
        refresh.addActionListener(e -> refresh());
        actions.add(entry); actions.add(exit); actions.add(refresh);
        main.add(actions, BorderLayout.SOUTH);

        root.add(main, BorderLayout.CENTER);
        setBody(root);
    }

    // Revenue calculated only for this staff's assigned parking area
    private double areaRevenue() {
        double sum = 0;
        for (ParkingRecord r : DataStore.records)
            if (r.getAreaName().equals(area.getName())) sum += r.getAmount();
        return sum;
    }

    private void refresh() {
        slotModel.setRowCount(0);
        for (ParkingSlot s : area.getSlots()) {
            if (s.isOccupied())
                slotModel.addRow(new Object[]{s.getNumber(), "OCCUPIED", s.getVehicle().getNumber(),
                    s.getVehicle().getType(), new java.text.SimpleDateFormat("dd-MM-yyyy HH:mm")
                        .format(new java.util.Date(s.getEntryTime()))});
            else
                slotModel.addRow(new Object[]{s.getNumber(), "AVAILABLE", "-", "-", "-"});
        }
    }

    private void vehicleEntry() {
        ParkingSlot slot = area.firstAvailableSlot();
        if (slot == null) {
            JOptionPane.showMessageDialog(this, "Parking area is full.");
            return;
        }
        JTextField number = new JTextField();
        JComboBox<String> type = new JComboBox<>(new String[]{"Car", "Bike", "SUV", "Other"});
        JPanel p = new JPanel(new GridLayout(2, 2, 8, 8));
        p.add(new JLabel("Vehicle Number")); p.add(number);
        p.add(new JLabel("Vehicle Type")); p.add(type);
        if (JOptionPane.showConfirmDialog(this, p, "Vehicle Entry", JOptionPane.OK_CANCEL_OPTION) != JOptionPane.OK_OPTION) return;
        if (number.getText().trim().isEmpty()) {
            JOptionPane.showMessageDialog(this, "Vehicle number cannot be empty.");
            return;
        }

        if (DataStore.activeRecord(number.getText().trim()) != null) {
            JOptionPane.showMessageDialog(this, "This vehicle is already parked.");
            return;
        }

        Vehicle v = new Vehicle(number.getText().trim().toUpperCase(), (String) type.getSelectedItem());
        slot.park(v);
        DataStore.records.add(new ParkingRecord(v.getNumber(), v.getType(), area.getName(), slot.getNumber()));
        JOptionPane.showMessageDialog(this, "Vehicle entered. Slot allocated: " + slot.getNumber());
        refresh();
    }

    private void vehicleExit() {
        String number = JOptionPane.showInputDialog(this, "Enter vehicle number:");
        if (number == null || number.trim().isEmpty()) return;
        String vehicleNum = number.trim().toUpperCase();

        ParkingRecord record = DataStore.activeRecord(vehicleNum);
        if (record == null) {
            JOptionPane.showMessageDialog(this, "Active vehicle record not found.");
            return;
        }

        // BUG-03 FIX: search ALL parking areas for the slot, not just staff's assigned area
        for (ParkingArea searchArea : DataStore.areas) {
            for (ParkingSlot s : searchArea.getSlots()) {
                if (s.isOccupied() && s.getVehicle().getNumber().equalsIgnoreCase(vehicleNum)) {
                    long minutes = Math.max(1, (System.currentTimeMillis() - s.getEntryTime()) / 60000);
                    // Q-01 FIX: use the named constant RATE_PER_HOUR instead of magic number 40.0
                    double amount = Math.ceil(minutes / 60.0) * RATE_PER_HOUR;
                    s.free();
                    record.close(amount);
                    JOptionPane.showMessageDialog(this,
                        "Exit completed.\nDuration: " + minutes + " minutes\nCharge: \u20b9" + String.format("%.2f", amount));
                    refresh();
                    return;
                }
            }
        }

        // This message now only shows if slot truly cannot be found in any area
        JOptionPane.showMessageDialog(this, "Slot not found for this vehicle in any parking area.");
    }
}
