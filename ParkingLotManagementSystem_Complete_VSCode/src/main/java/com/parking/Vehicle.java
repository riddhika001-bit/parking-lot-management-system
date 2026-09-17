package com.parking;

public class Vehicle {
    private final String number;
    private final String type;

    public Vehicle(String number, String type) {
        this.number = number;
        this.type = type;
    }

    public String getNumber() { return number; }
    public String getType() { return type; }
}
