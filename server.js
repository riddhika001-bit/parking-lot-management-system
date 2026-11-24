const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// In-Memory Data Store (Aligned with schema.sql & DataStore.java)
// ==========================================
// Selectable cities/locations shown on the login screen.
let locations = [
  { id: 1, name: 'Bengaluru' },
  { id: 2, name: 'Mysuru' },
  { id: 3, name: 'Mangaluru' }
];

let areas = [
  { id: 1, name: 'VVIT Main Parking', location: 'Kothanur, Bengaluru', city: 'Bengaluru', totalSlots: 20, rates: { bike: 10, car: 30, heavy: 50 } },
  { id: 2, name: 'City Center Parking', location: 'MG Road, Bengaluru', city: 'Bengaluru', totalSlots: 30, rates: { bike: 10, car: 30, heavy: 50 } },
  { id: 3, name: 'Mall Parking', location: 'Hennur, Bengaluru', city: 'Bengaluru', totalSlots: 25, rates: { bike: 10, car: 30, heavy: 50 } },
  { id: 4, name: 'Palace Grounds Parking', location: 'Sayyaji Rao Road, Mysuru', city: 'Mysuru', totalSlots: 18, rates: { bike: 10, car: 30, heavy: 50 } },
  { id: 5, name: 'Coastal City Mall Parking', location: 'Kadri, Mangaluru', city: 'Mangaluru', totalSlots: 22, rates: { bike: 10, car: 30, heavy: 50 } }
];

// Initialize slots
let slots = [];
areas.forEach(area => {
  for (let i = 1; i <= area.totalSlots; i++) {
    slots.push({
      slotId: `${area.id}-${i}`,
      parkingId: area.id,
      slotNumber: i,
      status: 'AVAILABLE', // AVAILABLE or OCCUPIED
      vehicleNumber: null,
      vehicleType: null,
      entryTime: null
    });
  }
});

let users = [
  { id: 1, name: 'Riddhika Sharma', username: 'user', password: 'user123', vehicleNumber: 'KA01AB1234', vehicleType: 'Car', phone: '+91 98765 43210' },
  { id: 2, name: 'Rahul Verma', username: 'rahul', password: 'user123', vehicleNumber: 'KA05CD5678', vehicleType: 'SUV', phone: '+91 98765 43211' },
  { id: 3, name: 'Priya Patel', username: 'priya', password: 'user123', vehicleNumber: 'KA03EF9012', vehicleType: 'Bike', phone: '+91 98765 43212' }
];

let staff = [
  { id: 1, name: 'Vikram Joshi (Staff)', username: 'staff', password: 'staff123', parkingId: 1 },
  { id: 2, name: 'Amit Kumar (Staff)', username: 'staff2', password: 'staff123', parkingId: 2 }
];

let admins = [
  { id: 1, name: 'System Administrator', username: 'admin', password: 'admin123' },
  { id: 2, name: 'Operations Manager', username: 'manager', password: 'admin123' }
];

let records = [];
let nextRecordId = 1;

// ==========================================
// Rate Calculation Helper
// ==========================================
function getRateForVehicle(area, vehicleType) {
  if (!area || !area.rates) return 40;
  const type = String(vehicleType || '').toLowerCase();
  if (type === 'bike' || type === 'scooter' || type === 'two-wheeler' || type === 'two wheeler') {
    return area.rates.bike || 10;
  }
  if (type === 'car' || type === 'sedan' || type === 'hatchback' || type === 'suv' || type === 'muv' || type === 'four-wheeler' || type === 'four wheeler') {
    return area.rates.car || 30;
  }
  if (type === 'heavy' || type === 'truck' || type === 'bus' || type === 'lorry' || type === 'heavy vehicle') {
    return area.rates.heavy || 50;
  }
  return area.rates.car || 30; // default to car rate
}

// ==========================================
// Authentication Sessions (server-side)
// ==========================================
const sessions = {};

function createToken() {
  return 'pk_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getSession(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.body && req.body.token);
  return token && sessions[token] ? sessions[token] : null;
}

// Middleware: require a valid session (optionally restricted to specific roles)
function requireAuth(roles) {
  return (req, res, next) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ error: 'Authentication required. Please log in.' });
    if (roles && !roles.includes(session.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    req.session = session;
    next();
  };
}

// Seed a couple of initial parked vehicles for realistic demo
function seedInitialData() {
  const area1 = areas[0];
  const slot1 = slots.find(s => s.parkingId === 1 && s.slotNumber === 1);
  if (slot1) {
    slot1.status = 'OCCUPIED';
    slot1.vehicleNumber = 'KA01AB1234';
    slot1.vehicleType = 'Car';
    slot1.entryTime = Date.now() - 45 * 60 * 1000; // 45 mins ago
    records.push({
      recordId: nextRecordId++,
      userId: 1,
      vehicleNumber: 'KA01AB1234',
      vehicleType: 'Car',
      parkingId: area1.id,
      areaName: area1.name,
      slotNumber: slot1.slotNumber,
      entryTime: slot1.entryTime,
      exitTime: null,
      durationMinutes: null,
      amount: 0,
      status: 'PARKED'
    });
  }

  const slot2 = slots.find(s => s.parkingId === 1 && s.slotNumber === 5);
  if (slot2) {
    slot2.status = 'OCCUPIED';
    slot2.vehicleNumber = 'KA05CD5678';
    slot2.vehicleType = 'SUV';
    slot2.entryTime = Date.now() - 110 * 60 * 1000; // 1 hr 50 mins ago
    records.push({
      recordId: nextRecordId++,
      userId: 2,
      vehicleNumber: 'KA05CD5678',
      vehicleType: 'SUV',
      parkingId: area1.id,
      areaName: area1.name,
      slotNumber: slot2.slotNumber,
      entryTime: slot2.entryTime,
      exitTime: null,
      durationMinutes: null,
      amount: 0,
      status: 'PARKED'
    });
  }

  // One completed record
  records.push({
    recordId: nextRecordId++,
    userId: 3,
    vehicleNumber: 'KA03EF9012',
    vehicleType: 'Bike',
    parkingId: area1.id,
    areaName: area1.name,
    slotNumber: 8,
    entryTime: Date.now() - 180 * 60 * 1000,
    exitTime: Date.now() - 60 * 60 * 1000,
    durationMinutes: 120,
    amount: 80.00,
    status: 'COMPLETED'
  });
}
seedInitialData();

// ==========================================
// Server-Sent Events (SSE) for Real-Time Sync
// ==========================================
let clients = [];

function broadcastUpdate(eventType, payload) {
  const data = JSON.stringify({ type: eventType, payload, timestamp: Date.now() });
  clients.forEach(c => {
    try {
      c.res.write(`data: ${data}\n\n`);
    } catch (e) {
      // client disconnected
    }
  });
}

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now() + Math.random();
  clients.push({ id: clientId, res });

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
});

// ==========================================
// Authentication APIs
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// List selectable parking facilities (used by the login screen)
app.get('/api/locations', (req, res) => {
  res.json({ locations: areas });
});

// Login — validates credentials for the selected role
app.post('/api/login', (req, res) => {
  const { role, username, password, areaId } = req.body;

  if (!role || !username || !password) {
    return res.status(400).json({ error: 'Role, username and password are required.' });
  }

  const uName = String(username).trim();
  let profile = null;

  if (role === 'user') {
    profile = users.find(u => u.username.toLowerCase() === uName.toLowerCase() && u.password === password);
  } else if (role === 'staff') {
    profile = staff.find(s => s.username.toLowerCase() === uName.toLowerCase() && s.password === password);
  } else if (role === 'admin') {
    profile = admins.find(a => a.username.toLowerCase() === uName.toLowerCase() && a.password === password);
  } else {
    return res.status(400).json({ error: 'Invalid role selected.' });
  }

  if (!profile) {
    return res.status(401).json({ error: `Invalid username or password for the ${role} role.` });
  }

  // Area is required for user & staff, and filters which facilities they see
  let area = null;
  if (role !== 'admin') {
    area = areas.find(a => a.id === parseInt(areaId));
    if (!area) {
      return res.status(400).json({ error: 'Please select a valid parking facility.' });
    }
  }

  const token = createToken();
  const session = {
    token,
    role,
    userId: profile.id,
    username: profile.username,
    name: profile.name,
    areaId: area ? area.id : null,
    locationName: area ? area.location : 'All Locations',
    createdAt: Date.now()
  };
  sessions[token] = session;

  res.json({
    success: true,
    token,
    session,
    profile: { ...profile, password: undefined }
  });
});

// Current session lookup (used to restore a login after refresh)
app.get('/api/session', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'No active session.' });
  res.json({ session });
});

// Logout — invalidate the token
app.post('/api/logout', (req, res) => {
  const session = getSession(req);
  if (session) delete sessions[session.token];
  res.json({ success: true });
});

// ==========================================
// REST APIs
// ==========================================

// Get full system state
app.get('/api/state', requireAuth(), (req, res) => {
  const areasWithStats = areas.map(a => {
    const areaSlots = slots.filter(s => s.parkingId === a.id);
    const occupied = areaSlots.filter(s => s.status === 'OCCUPIED').length;
    const revenue = records
      .filter(r => r.parkingId === a.id)
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    return {
      ...a,
      totalSlots: areaSlots.length,
      occupied,
      available: areaSlots.length - occupied,
      occupancyRate: areaSlots.length ? Math.round((occupied / areaSlots.length) * 100) : 0,
      revenue
    };
  });

  const totalSlotsCount = slots.length;
  const totalOccupiedCount = slots.filter(s => s.status === 'OCCUPIED').length;
  const totalRevenue = records.reduce((sum, r) => sum + (r.amount || 0), 0);

  res.json({
    areas: areasWithStats,
    slots,
    records,
    users,
    staff,
    locations,
    stats: {
      totalAreas: areas.length,
      totalSlots: totalSlotsCount,
      totalOccupied: totalOccupiedCount,
      totalAvailable: totalSlotsCount - totalOccupiedCount,
      totalRevenue,
      occupancyPercentage: totalSlotsCount ? Math.round((totalOccupiedCount / totalSlotsCount) * 100) : 0
    }
  });
});

// Vehicle Entry (or Slot Booking)
app.post('/api/entry', requireAuth(['user', 'staff', 'admin']), (req, res) => {
  const { parkingId, vehicleNumber, vehicleType, slotNumber, userId } = req.body;
  
  if (!parkingId || !vehicleNumber || !vehicleType) {
    return res.status(400).json({ error: 'Missing required parameters: parkingId, vehicleNumber, vehicleType' });
  }

  const vNum = vehicleNumber.trim().toUpperCase();

  // Check if vehicle is already parked
  const activeRecord = records.find(r => r.vehicleNumber.toUpperCase() === vNum && r.status === 'PARKED');
  if (activeRecord) {
    return res.status(400).json({ error: `Vehicle ${vNum} is already parked in ${activeRecord.areaName} (Slot #${activeRecord.slotNumber})` });
  }

  const area = areas.find(a => a.id === parseInt(parkingId));
  if (!area) return res.status(404).json({ error: 'Parking area not found' });

  // Find slot
  let targetSlot = null;
  if (slotNumber) {
    targetSlot = slots.find(s => s.parkingId === area.id && s.slotNumber === parseInt(slotNumber) && s.status === 'AVAILABLE');
    if (!targetSlot) return res.status(400).json({ error: `Slot #${slotNumber} in ${area.name} is not available.` });
  } else {
    targetSlot = slots.find(s => s.parkingId === area.id && s.status === 'AVAILABLE');
    if (!targetSlot) return res.status(400).json({ error: `Parking area '${area.name}' is completely full!` });
  }

  // Update slot
  targetSlot.status = 'OCCUPIED';
  targetSlot.vehicleNumber = vNum;
  targetSlot.vehicleType = vehicleType;
  targetSlot.entryTime = Date.now();

  // Create record
  const newRecord = {
    recordId: nextRecordId++,
    userId: userId || null,
    vehicleNumber: vNum,
    vehicleType,
    parkingId: area.id,
    areaName: area.name,
    slotNumber: targetSlot.slotNumber,
    entryTime: targetSlot.entryTime,
    exitTime: null,
    durationMinutes: null,
    amount: 0,
    status: 'PARKED'
  };
  records.unshift(newRecord);

  broadcastUpdate('DATA_CHANGED', { action: 'ENTRY', record: newRecord, slot: targetSlot });
  res.json({ success: true, message: `Vehicle ${vNum} parked in Slot #${targetSlot.slotNumber} of ${area.name}!`, record: newRecord });
});

// Vehicle Exit / Release Slot & Bill
app.post('/api/exit', requireAuth(['user', 'staff', 'admin']), (req, res) => {
  const { vehicleNumber } = req.body;
  if (!vehicleNumber) return res.status(400).json({ error: 'Vehicle number required' });

  const vNum = vehicleNumber.trim().toUpperCase();
  const record = records.find(r => r.vehicleNumber.toUpperCase() === vNum && r.status === 'PARKED');
  if (!record) {
    return res.status(404).json({ error: `No active parked record found for vehicle ${vNum}` });
  }

  const slot = slots.find(s => s.parkingId === record.parkingId && s.slotNumber === record.slotNumber);
  const area = areas.find(a => a.id === record.parkingId);
  const rate = getRateForVehicle(area, record.vehicleType);

  const exitTime = Date.now();
  const durationMs = Math.max(60000, exitTime - record.entryTime);
  const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
  const hours = Math.max(1, Math.ceil(durationMinutes / 60));
  const amount = hours * rate;

  if (slot) {
    slot.status = 'AVAILABLE';
    slot.vehicleNumber = null;
    slot.vehicleType = null;
    slot.entryTime = null;
  }

  record.exitTime = exitTime;
  record.durationMinutes = durationMinutes;
  record.amount = amount;
  record.status = 'COMPLETED';

  broadcastUpdate('DATA_CHANGED', { action: 'EXIT', record, slot });
  res.json({
    success: true,
    message: `Exit completed for ${vNum}! Charge: ₹${amount.toFixed(2)} (${durationMinutes} mins)`,
    receipt: {
      recordId: record.recordId,
      vehicleNumber: vNum,
      vehicleType: record.vehicleType,
      areaName: record.areaName,
      slotNumber: record.slotNumber,
      entryTime: new Date(record.entryTime).toLocaleString(),
      exitTime: new Date(exitTime).toLocaleString(),
      durationMinutes,
      ratePerHour: rate,
      amount
    }
  });
});

// Add New Parking Area (Admin)
app.post('/api/areas', requireAuth(['admin']), (req, res) => {
  const { name, location, totalSlots, rates, city } = req.body;
  if (!name || !location || !totalSlots) {
    return res.status(400).json({ error: 'Name, location and total slots required' });
  }

  const newId = areas.length ? Math.max(...areas.map(a => a.id)) + 1 : 1;
  const count = parseInt(totalSlots);
  const newRates = rates || { bike: 10, car: 30, heavy: 50 };

  const newArea = { id: newId, name, location, city: city || 'Bengaluru', totalSlots: count, rates: newRates };
  areas.push(newArea);

  for (let i = 1; i <= count; i++) {
    slots.push({
      slotId: `${newId}-${i}`,
      parkingId: newId,
      slotNumber: i,
      status: 'AVAILABLE',
      vehicleNumber: null,
      vehicleType: null,
      entryTime: null
    });
  }

  broadcastUpdate('DATA_CHANGED', { action: 'AREA_ADDED', area: newArea });
  res.json({ success: true, area: newArea });
});

// Reset demo data
app.post('/api/reset', requireAuth(['admin']), (req, res) => {
  records = [];
  nextRecordId = 1;
  slots.forEach(s => {
    s.status = 'AVAILABLE';
    s.vehicleNumber = null;
    s.vehicleType = null;
    s.entryTime = null;
  });
  seedInitialData();
  broadcastUpdate('DATA_CHANGED', { action: 'RESET' });
  res.json({ success: true, message: 'Demo data restored' });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚗 ParkPulse Smart Parking System Server Running!`);
  console.log(`🌐 Open in browser: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
