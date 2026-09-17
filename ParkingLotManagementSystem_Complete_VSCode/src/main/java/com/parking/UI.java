package com.parking;

import java.awt.*;
import javax.swing.*;
import javax.swing.border.EmptyBorder;

public final class UI {
    private UI() {}

    public static final Color NAV = new Color(31, 41, 55);
    public static final Color BG = new Color(245, 247, 250);
    public static final Color ACCENT = new Color(37, 99, 235);

    public static JButton button(String text) {
        JButton b = new JButton(text);
        b.setFocusPainted(false);
        b.setForeground(Color.WHITE);
        b.setBackground(ACCENT);
        b.setFont(new Font("SansSerif", Font.BOLD, 13));
        b.setBorder(new EmptyBorder(10, 16, 10, 16));
        return b;
    }

    public static JLabel title(String text) {
        JLabel l = new JLabel(text);
        l.setFont(new Font("SansSerif", Font.BOLD, 24));
        return l;
    }

    public static JPanel card(String title, String value) {
        JPanel p = new JPanel(new BorderLayout(5, 5));
        p.setBackground(Color.WHITE);
        p.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(220, 224, 230)),
            new EmptyBorder(14, 16, 14, 16)
        ));
        JLabel t = new JLabel(title);
        t.setForeground(new Color(90, 98, 110));
        JLabel v = new JLabel(value);
        v.setFont(new Font("SansSerif", Font.BOLD, 22));
        p.add(t, BorderLayout.NORTH);
        p.add(v, BorderLayout.CENTER);
        return p;
    }

    public static void configure(JFrame f) {
        f.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        f.setSize(1100, 700);
        f.setLocationRelativeTo(null);
    }
}
