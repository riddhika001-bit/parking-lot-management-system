package com.parking;

import java.awt.*;
import javax.swing.*;

public abstract class BaseDashboard extends JFrame {
    protected final LoginFrame loginFrame;
    protected final JPanel content = new JPanel(new BorderLayout(15, 15));

    protected BaseDashboard(LoginFrame loginFrame, String title) {
        this.loginFrame = loginFrame;
        setTitle(title);
        UI.configure(this);
        content.setBackground(UI.BG);
        content.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));
        setContentPane(content);
    }

    protected JPanel header(String title, String role) {
        JPanel h = new JPanel(new BorderLayout());
        h.setBackground(Color.WHITE);
        h.setBorder(BorderFactory.createEmptyBorder(12, 16, 12, 16));
        JPanel left = new JPanel(new GridLayout(2,1));
        left.setOpaque(false);
        JLabel t = UI.title(title);
        JLabel r = new JLabel(role);
        r.setForeground(new Color(90, 98, 110));
        left.add(t); left.add(r);
        h.add(left, BorderLayout.WEST);

        JButton logout = UI.button("Logout");
        logout.addActionListener(e -> {
            dispose();
            loginFrame.setVisible(true);
        });
        h.add(logout, BorderLayout.EAST);
        return h;
    }

    protected void setBody(JComponent c) {
        content.add(c, BorderLayout.CENTER);
    }
}
