package com.parking;

import java.awt.*;
import javax.swing.*;
import javax.swing.table.DefaultTableModel;

public class AdminDashboard extends BaseDashboard {
    private final DefaultTableModel areaModel = new DefaultTableModel(
        new String[]{"Parking Area", "Location", "Total", "Occupied", "Available", "Occupancy"}, 0) {
        public boolean isCellEditable(int r, int c) { return false; }
    };
    private final DefaultTableModel recordModel = new DefaultTableModel(
        new String[]{"Vehicle", "Type", "Parking Area", "Slot", "Entry", "Exit", "Amount", "Status"}, 0) {
        public boolean isCellEditable(int r, int c) { return false; }
    };
    private final JTable areas = new JTable(areaModel);
    private final JTable records = new JTable(recordModel);

    // BUG-04 FIX: store references to stat card value labels so refresh() can update them
    private JLabel lblTotalAreas, lblTotalSlots, lblOccupied, lblAvailable, lblRevenue;

    public AdminDashboard(LoginFrame loginFrame) {
        super(loginFrame, "Administrator Dashboard");
        build();
        refresh();
    }

    private void build() {
        JPanel root = new JPanel(new BorderLayout(15, 15));
        root.setOpaque(false);
        root.add(header("Administrator Dashboard", "Centralized access \u2022 All parking areas"), BorderLayout.NORTH);

        JPanel center = new JPanel(new BorderLayout(12, 12));
        center.setOpaque(false);

        // BUG-04 FIX: build cards with stored label references, refresh() will update values
        JPanel cards = new JPanel(new GridLayout(1, 5, 10, 10));
        cards.setOpaque(false);

        JPanel c1 = buildLiveCard("Parking Areas");  lblTotalAreas = getLiveCardLabel(c1);
        JPanel c2 = buildLiveCard("Total Slots");    lblTotalSlots = getLiveCardLabel(c2);
        JPanel c3 = buildLiveCard("Occupied");       lblOccupied   = getLiveCardLabel(c3);
        JPanel c4 = buildLiveCard("Available");      lblAvailable  = getLiveCardLabel(c4);
        JPanel c5 = buildLiveCard("Revenue");        lblRevenue    = getLiveCardLabel(c5);
        cards.add(c1); cards.add(c2); cards.add(c3); cards.add(c4); cards.add(c5);
        center.add(cards, BorderLayout.NORTH);

        JTabbedPane tabs = new JTabbedPane();

        JPanel overview = new JPanel(new BorderLayout());
        overview.setBackground(UI.BG);
        JButton refreshBtn = UI.button("Refresh");
        refreshBtn.addActionListener(e -> refresh());
        overview.add(new JScrollPane(areas), BorderLayout.CENTER);
        overview.add(refreshBtn, BorderLayout.SOUTH);

        JPanel allRecords = new JPanel(new BorderLayout());
        allRecords.setBackground(UI.BG);
        allRecords.add(new JScrollPane(records), BorderLayout.CENTER);

        // Users tab — display from DataStore.users String[] array
        JPanel usersPanel = new JPanel(new BorderLayout());
        usersPanel.setBackground(UI.BG);
        String[] cols = {"Name", "Username", "Vehicle", "Type"};
        DefaultTableModel m = new DefaultTableModel(cols, 0);
        for (String[] u : DataStore.users) m.addRow(new Object[]{u[0], u[1], u[3], u[4]});
        usersPanel.add(new JScrollPane(new JTable(m)));

        // Staff tab — display from DataStore.staff String[] array
        JPanel staffPanel = new JPanel(new BorderLayout());
        staffPanel.setBackground(UI.BG);
        String[] sc = {"Name", "Username", "Assigned Parking ID"};
        DefaultTableModel sm = new DefaultTableModel(sc, 0);
        for (String[] s : DataStore.staff) sm.addRow(new Object[]{s[0], s[1], s[3]});
        staffPanel.add(new JScrollPane(new JTable(sm)));

        tabs.addTab("All Parking Areas", overview);
        tabs.addTab("Parking Records", allRecords);
        tabs.addTab("Users", usersPanel);
        tabs.addTab("Staff", staffPanel);

        center.add(tabs, BorderLayout.CENTER);
        root.add(center, BorderLayout.CENTER);
        setBody(root);
    }

    // Helper: create a card panel with a named value label (for live updates)
    private JPanel buildLiveCard(String title) {
        JPanel p = new JPanel(new BorderLayout(5, 5));
        p.setBackground(Color.WHITE);
        p.setBorder(javax.swing.BorderFactory.createCompoundBorder(
            javax.swing.BorderFactory.createLineBorder(new Color(220, 224, 230)),
            new javax.swing.border.EmptyBorder(14, 16, 14, 16)
        ));
        JLabel t = new JLabel(title);
        t.setForeground(new Color(90, 98, 110));
        JLabel v = new JLabel("—");
        v.setFont(new java.awt.Font("SansSerif", java.awt.Font.BOLD, 22));
        p.add(t, BorderLayout.NORTH);
        p.add(v, BorderLayout.CENTER);
        return p;
    }

    // Helper: get the value JLabel from a live card panel (it's in BorderLayout.CENTER)
    private JLabel getLiveCardLabel(JPanel card) {
        return (JLabel) ((BorderLayout) card.getLayout()).getLayoutComponent(BorderLayout.CENTER);
    }

    private void refresh() {
        // BUG-04 FIX: update stat card labels with current live data
        lblTotalAreas.setText(String.valueOf(DataStore.areas.size()));
        lblTotalSlots.setText(String.valueOf(DataStore.totalSlots()));
        lblOccupied.setText(String.valueOf(DataStore.totalOccupied()));
        lblAvailable.setText(String.valueOf(DataStore.totalSlots() - DataStore.totalOccupied()));
        lblRevenue.setText("\u20b9" + String.format("%.2f", DataStore.totalRevenue()));

        // Refresh areas table
        areaModel.setRowCount(0);
        for (ParkingArea a : DataStore.areas) {
            int total = a.getSlots().size(), occ = a.occupiedCount();
            areaModel.addRow(new Object[]{a.getName(), a.getLocation(), total, occ, total - occ,
                String.format("%.1f%%", 100.0 * occ / total)});
        }

        // Refresh records table
        recordModel.setRowCount(0);
        for (ParkingRecord r : DataStore.records)
            recordModel.addRow(new Object[]{r.getVehicleNumber(), r.getVehicleType(), r.getAreaName(),
                r.getSlotNumber(), r.entryText(), r.exitText(), "\u20b9" + String.format("%.2f", r.getAmount()), r.getStatus()});
    }
}
