package com.parking;

import java.awt.*;
import javax.swing.*;
import javax.swing.table.DefaultTableModel;

public class UserDashboard extends BaseDashboard {
    // BUG-07 FIX: store logged-in user's data from DataStore
    private final String[] currentUser;

    private final DefaultTableModel areaModel = new DefaultTableModel(
        new String[]{"Parking Area", "Location", "Total Slots", "Available", "Status"}, 0) {
        public boolean isCellEditable(int r, int c) { return false; }
    };
    private final DefaultTableModel historyModel = new DefaultTableModel(
        new String[]{"Vehicle", "Area", "Slot", "Entry", "Exit", "Amount", "Status"}, 0) {
        public boolean isCellEditable(int r, int c) { return false; }
    };
    private final JTable areaTable = new JTable(areaModel);
    private final JTable historyTable = new JTable(historyModel);

    // BUG-07 FIX: constructor now accepts the logged-in user's String[] data
    public UserDashboard(LoginFrame loginFrame, String[] userData) {
        super(loginFrame, "User / Client Dashboard");
        this.currentUser = userData;
        build();
        refresh();
    }

    private void build() {
        JPanel root = new JPanel(new BorderLayout(15, 15));
        root.setOpaque(false);

        // BUG-07 FIX: use currentUser[0] (name) instead of hardcoded "Riddhika"
        root.add(header("User Dashboard", "Welcome, " + currentUser[0] + " \u2022 Client"), BorderLayout.NORTH);

        JPanel center = new JPanel(new BorderLayout(15, 15));
        center.setOpaque(false);

        JPanel cards = new JPanel(new GridLayout(1, 4, 12, 12));
        cards.setOpaque(false);
        cards.add(UI.card("Parking Areas", String.valueOf(DataStore.areas.size())));
        cards.add(UI.card("Total Slots", String.valueOf(DataStore.totalSlots())));
        cards.add(UI.card("Available Now", String.valueOf(DataStore.totalSlots() - DataStore.totalOccupied())));

        // BUG-06 FIX: count only THIS user's records (by their vehicle number)
        long myRecordsCount = DataStore.records.stream()
            .filter(r -> r.getVehicleNumber().equalsIgnoreCase(currentUser[3]))
            .count();
        cards.add(UI.card("My Records", String.valueOf(myRecordsCount)));
        center.add(cards, BorderLayout.NORTH);

        JTabbedPane tabs = new JTabbedPane();
        JPanel areas = new JPanel(new BorderLayout(10, 10));
        areas.setBackground(UI.BG);
        areas.add(new JScrollPane(areaTable), BorderLayout.CENTER);
        JButton book = UI.button("Book Available Slot");
        book.addActionListener(e -> bookSlot());
        areas.add(book, BorderLayout.SOUTH);

        JPanel history = new JPanel(new BorderLayout());
        history.setBackground(UI.BG);
        history.add(new JScrollPane(historyTable));

        tabs.addTab("Find & Book Parking", areas);
        tabs.addTab("My Parking History", history);
        center.add(tabs, BorderLayout.CENTER);

        root.add(center, BorderLayout.CENTER);
        setBody(root);
    }

    private void refresh() {
        areaModel.setRowCount(0);
        for (ParkingArea a : DataStore.areas)
            areaModel.addRow(new Object[]{a.getName(), a.getLocation(), a.getSlots().size(),
                a.availableCount(), a.availableCount() > 0 ? "AVAILABLE" : "FULL"});

        // BUG-02 FIX: only show records belonging to the current user's vehicle number
        historyModel.setRowCount(0);
        for (ParkingRecord r : DataStore.records) {
            if (r.getVehicleNumber().equalsIgnoreCase(currentUser[3])) {
                historyModel.addRow(new Object[]{r.getVehicleNumber(), r.getAreaName(), r.getSlotNumber(),
                    r.entryText(), r.exitText(), "\u20b9" + String.format("%.2f", r.getAmount()), r.getStatus()});
            }
        }
    }

    private void bookSlot() {
        String[] names = DataStore.areas.stream().map(ParkingArea::getName).toArray(String[]::new);
        String selected = (String) JOptionPane.showInputDialog(this, "Select parking area:", "Book Slot",
            JOptionPane.QUESTION_MESSAGE, null, names, names.length > 0 ? names[0] : null);
        if (selected == null) return;

        ParkingArea area = DataStore.areas.stream().filter(a -> a.getName().equals(selected)).findFirst().orElse(null);
        if (area == null || area.firstAvailableSlot() == null) {
            JOptionPane.showMessageDialog(this, "No slot is available in this parking area.");
            return;
        }

        // BUG-01 FIX: pre-fill with logged-in user's actual vehicle number (currentUser[3])
        JTextField vehicle = new JTextField(currentUser[3]);
        JComboBox<String> type = new JComboBox<>(new String[]{"Car", "Bike", "SUV", "Other"});
        // Pre-select user's vehicle type (currentUser[4])
        type.setSelectedItem(currentUser[4]);

        JPanel p = new JPanel(new GridLayout(2, 2, 8, 8));
        p.add(new JLabel("Vehicle Number")); p.add(vehicle);
        p.add(new JLabel("Vehicle Type")); p.add(type);

        if (JOptionPane.showConfirmDialog(this, p, "Vehicle Details", JOptionPane.OK_CANCEL_OPTION) != JOptionPane.OK_OPTION) return;
        if (vehicle.getText().trim().isEmpty()) {
            JOptionPane.showMessageDialog(this, "Vehicle number cannot be empty.");
            return;
        }

        ParkingSlot slot = area.firstAvailableSlot();
        Vehicle v = new Vehicle(vehicle.getText().trim().toUpperCase(), (String) type.getSelectedItem());
        slot.park(v);
        DataStore.records.add(new ParkingRecord(v.getNumber(), v.getType(), area.getName(), slot.getNumber()));

        JOptionPane.showMessageDialog(this, "Slot " + slot.getNumber() + " booked successfully!");
        refresh();
    }
}
