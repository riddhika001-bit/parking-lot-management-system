CREATE DATABASE IF NOT EXISTS parking_management;
USE parking_management;

CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(20),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    vehicle_number VARCHAR(30),
    vehicle_type VARCHAR(30)
);

CREATE TABLE parking_areas (
    parking_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    total_slots INT NOT NULL
);

CREATE TABLE staff (
    staff_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    parking_id INT,
    FOREIGN KEY (parking_id) REFERENCES parking_areas(parking_id)
);

CREATE TABLE parking_slots (
    slot_id INT PRIMARY KEY AUTO_INCREMENT,
    parking_id INT NOT NULL,
    slot_number INT NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    FOREIGN KEY (parking_id) REFERENCES parking_areas(parking_id)
);

CREATE TABLE parking_records (
    record_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    vehicle_number VARCHAR(30) NOT NULL,
    vehicle_type VARCHAR(30),
    parking_id INT NOT NULL,
    slot_number INT NOT NULL,
    entry_time DATETIME NOT NULL,
    exit_time DATETIME,
    duration_minutes INT,
    amount DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'PARKED'
);
