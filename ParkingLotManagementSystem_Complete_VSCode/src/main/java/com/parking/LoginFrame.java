package com.parking;

import java.awt.*;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import javax.swing.*;
import javax.swing.border.EmptyBorder;

public class LoginFrame extends JFrame {
    private final JTextField username = new JTextField();
    private final JPasswordField password = new JPasswordField();
    private final JComboBox<String> role = new JComboBox<>(new String[]{
        "User / Client", "Parking Area Staff", "Administrator"
    });

    // Area selection — only visible when Staff role is chosen
    private final JLabel areaLabel = new JLabel("Parking Area");
    private final JComboBox<String> areaSelector;
    private final JPanel areaRow = new JPanel();

    public LoginFrame() {
        setTitle("Parking Lot Management System - Login");
        UI.configure(this);

        // Build area names from DataStore for the dropdown
        String[] areaNames = new String[DataStore.areas.size()];
        for (int i = 0; i < DataStore.areas.size(); i++)
            areaNames[i] = DataStore.areas.get(i).getName();
        areaSelector = new JComboBox<>(areaNames);

        build();
    }

    private void build() {
        JPanel root = new JPanel(new GridBagLayout());
        root.setBackground(UI.BG);

        JPanel box = new JPanel();
        box.setPreferredSize(new Dimension(430, 530));
        box.setLayout(new BoxLayout(box, BoxLayout.Y_AXIS));
        box.setBackground(Color.WHITE);
        box.setBorder(new EmptyBorder(35, 45, 35, 45));

        JLabel heading = UI.title("Parking Management");
        heading.setAlignmentX(Component.CENTER_ALIGNMENT);
        JLabel sub = new JLabel("Sign in to continue");
        sub.setAlignmentX(Component.CENTER_ALIGNMENT);

        box.add(heading);
        box.add(Box.createVerticalStrut(8));
        box.add(sub);
        box.add(Box.createVerticalStrut(30));

        box.add(new JLabel("Login as"));
        box.add(Box.createVerticalStrut(6));
        role.setMaximumSize(new Dimension(Integer.MAX_VALUE, 38));
        box.add(role);

        // Area selection row — shown only when Staff role is selected
        box.add(Box.createVerticalStrut(16));
        areaRow.setLayout(new BoxLayout(areaRow, BoxLayout.Y_AXIS));
        areaRow.setOpaque(false);
        areaRow.setMaximumSize(new Dimension(Integer.MAX_VALUE, 62));
        areaLabel.setAlignmentX(Component.LEFT_ALIGNMENT);
        areaSelector.setMaximumSize(new Dimension(Integer.MAX_VALUE, 38));
        areaRow.add(areaLabel);
        areaRow.add(Box.createVerticalStrut(6));
        areaRow.add(areaSelector);
        areaRow.setVisible(false); // hidden by default
        box.add(areaRow);

        // Show/hide area row based on role selection
        role.addActionListener(e -> {
            boolean isStaff = role.getSelectedIndex() == 1;
            areaRow.setVisible(isStaff);
            box.setPreferredSize(new Dimension(430, isStaff ? 590 : 530));
            box.revalidate();
            root.revalidate();
            pack();
            setLocationRelativeTo(null);
        });

        box.add(Box.createVerticalStrut(16));
        box.add(new JLabel("Username"));
        box.add(Box.createVerticalStrut(6));
        username.setMaximumSize(new Dimension(Integer.MAX_VALUE, 38));
        box.add(username);

        box.add(Box.createVerticalStrut(16));
        box.add(new JLabel("Password"));
        box.add(Box.createVerticalStrut(6));
        password.setMaximumSize(new Dimension(Integer.MAX_VALUE, 38));
        box.add(password);

        // Enter key on password field triggers login
        password.addKeyListener(new KeyAdapter() {
            @Override
            public void keyPressed(KeyEvent e) {
                if (e.getKeyCode() == KeyEvent.VK_ENTER) login();
            }
        });
        // Enter key on username field moves focus to password
        username.addKeyListener(new KeyAdapter() {
            @Override
            public void keyPressed(KeyEvent e) {
                if (e.getKeyCode() == KeyEvent.VK_ENTER) password.requestFocus();
            }
        });

        box.add(Box.createVerticalStrut(25));
        JButton loginBtn = UI.button("LOGIN");
        loginBtn.setAlignmentX(Component.CENTER_ALIGNMENT);
        loginBtn.addActionListener(e -> login());
        box.add(loginBtn);

        box.add(Box.createVerticalStrut(18));
        JLabel demo = new JLabel("<html><center>Demo: user/user123 &nbsp; staff/staff123 &nbsp; admin/admin123</center></html>");
        demo.setAlignmentX(Component.CENTER_ALIGNMENT);
        demo.setForeground(new Color(90, 98, 110));
        box.add(demo);

        root.add(box);
        setContentPane(root);
    }

    private void login() {
        String u = username.getText().trim();
        String p = new String(password.getPassword());
        int r = role.getSelectedIndex();

        if (r == 0) {
            // User login — find matching user from DataStore.users String[] array
            for (String[] userData : DataStore.users) {
                if (userData[1].equals(u) && userData[2].equals(p)) {
                    new UserDashboard(this, userData).setVisible(true);
                    setVisible(false);
                    return;
                }
            }
            JOptionPane.showMessageDialog(this, "Invalid credentials for the selected role.", "Login Failed", JOptionPane.ERROR_MESSAGE);

        } else if (r == 1) {
            // Staff login — validate credentials then open dashboard for selected area
            for (String[] staffData : DataStore.staff) {
                if (staffData[1].equals(u) && staffData[2].equals(p)) {
                    // Get the area the staff selected from the area dropdown
                    String selectedAreaName = (String) areaSelector.getSelectedItem();
                    ParkingArea selectedArea = null;
                    for (ParkingArea a : DataStore.areas)
                        if (a.getName().equals(selectedAreaName)) { selectedArea = a; break; }
                    if (selectedArea == null) selectedArea = DataStore.areaById(1); // fallback
                    new StaffDashboard(this, staffData, selectedArea).setVisible(true);
                    setVisible(false);
                    return;
                }
            }
            JOptionPane.showMessageDialog(this, "Invalid credentials for the selected role.", "Login Failed", JOptionPane.ERROR_MESSAGE);

        } else if (r == 2 && u.equals("admin") && p.equals("admin123")) {
            new AdminDashboard(this).setVisible(true);
            setVisible(false);
        } else {
            JOptionPane.showMessageDialog(this, "Invalid credentials for the selected role.", "Login Failed", JOptionPane.ERROR_MESSAGE);
        }
    }
}
