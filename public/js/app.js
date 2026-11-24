/**
 * ParkPulse — Real-Time Interactive Frontend Logic
 */

// ==========================================
// Application State
// ==========================================
let state = {
  areas: [],
  slots: [],
  records: [],
  users: [],
  staff: [],
  stats: {}
};

let currentUserId = 1;
let selectedUserAreaId = 1;
let selectedStaffAreaId = 1;
let activeAdminSubtab = 'admin-tab-areas';
let activeTimerInterval = null;

// Authentication session & login state
let currentSession = null;          // { role, userId, name, username, areaId, locationName }
let selectedLoginRole = 'user';     // role currently selected on the login screen
let availableLocations = [];        // locations loaded from the server
let realtimeStarted = false;

// ==========================================
// Auth Helpers
// ==========================================
function getToken() {
  return localStorage.getItem('parkpulse_token') || '';
}

function setToken(token) {
  if (token) localStorage.setItem('parkpulse_token', token);
  else localStorage.removeItem('parkpulse_token');
}

function authHeaders(extra) {
  return Object.assign({ 'Authorization': `Bearer ${getToken()}` }, extra || {});
}

// ==========================================
// Rate Helpers
// ==========================================
function getRateForVehicle(area, vehicleType) {
  if (!area || !area.rates) return 30;
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

function formatRates(area) {
  if (!area || !area.rates) return '₹30/hr';
  return `Bike: ₹${area.rates.bike}/hr • Car: ₹${area.rates.car}/hr • Heavy: ₹${area.rates.heavy}/hr`;
}

// Multi-Tab Local Synchronization via BroadcastChannel
const syncChannel = ('BroadcastChannel' in window) ? new BroadcastChannel('parkpulse_sync') : null;
if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (currentSession && event.data && event.data.type === 'REFRESH') {
      fetchSystemState(false);
    }
  };
}

// ==========================================
// Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupModals();
  setupEventListeners();
  setupLogin();
  loadLoginLocations();

  // Active ticket live counter tick every second
  setInterval(tickActiveTicketTimer, 1000);

  // Attempt to restore an existing login session
  restoreSession();
});

// ==========================================
// Real-Time Server-Sent Events (SSE)
// ==========================================
function initRealtimeSync() {
  const syncStatusEl = document.getElementById('syncStatus');

  try {
    const eventSource = new EventSource('/api/events');

    eventSource.onopen = () => {
      syncStatusEl.innerHTML = `<span class="pulse-dot"></span><span class="sync-text">Live Sync</span>`;
      syncStatusEl.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    };

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'DATA_CHANGED') {
          fetchSystemState(false);
          handleRealtimeNotification(data.payload);
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.onerror = () => {
      syncStatusEl.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:#f59e0b"></span><span class="sync-text">Reconnecting...</span>`;
      syncStatusEl.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    };
  } catch (err) {
    console.warn('SSE not supported or failed to initialize:', err);
  }
}

function handleRealtimeNotification(payload) {
  if (!payload) return;
  if (payload.action === 'ENTRY') {
    showToast(`🚗 Vehicle <strong>${payload.record.vehicleNumber}</strong> parked in Slot #${payload.record.slotNumber} (${payload.record.areaName})`);
  } else if (payload.action === 'EXIT') {
    showToast(`💳 Payment completed for <strong>${payload.record.vehicleNumber}</strong>: ₹${payload.record.amount.toFixed(2)}`);
  } else if (payload.action === 'AREA_ADDED') {
    showToast(`🏢 New Facility <strong>${payload.area.name}</strong> added to the network!`);
  } else if (payload.action === 'RESET') {
    showToast(`🔄 Demo data restored to initial state.`);
  }
}

// ==========================================
// API Operations
// ==========================================
async function fetchSystemState(showInitialToast = false) {
  try {
    const res = await fetch('/api/state', { headers: authHeaders() });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) throw new Error('Failed to load state');
    state = await res.json();

    if (state.locations && state.locations.length) {
      availableLocations = state.locations;
      populateAddAreaCityOptions();
    }

    renderApp();
    if (showInitialToast) {
      showToast('System synced with live server', 'info');
    }
  } catch (err) {
    console.error('Error fetching state:', err);
    showToast('Failed to connect to parking server', 'error');
  }
}

function getApiErrorMessage(err) {
  if (err instanceof TypeError) {
    return 'Cannot reach the parking server. Start it with "npm run start:web" from the repository root.';
  }
  return err.message || 'The request failed.';
}

function handleUnauthorized() {
  setToken('');
  currentSession = null;
  document.body.classList.remove('authenticated');
  showToast('Your session expired. Please sign in again.', 'error');
}

// ==========================================
// Authentication & Login
// ==========================================
async function loadLoginLocations() {
  const select = document.getElementById('loginLocation');
  if (!select) return;
  try {
    const res = await fetch('/api/locations');
    const data = await res.json();
    availableLocations = data.locations || [];
    select.innerHTML = '<option value="">Select a parking facility…</option>' +
      availableLocations.map(a => `<option value="${a.id}">${a.name} (${a.location})</option>`).join('');
  } catch (err) {
    select.innerHTML = '<option value="">Unable to load facilities</option>';
  }
}

function setupLogin() {
  document.querySelectorAll('.role-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedLoginRole = tab.getAttribute('data-role');
      applyLoginRoleUI();
    });
  });

  const form = document.getElementById('loginForm');
  if (form) form.addEventListener('submit', handleLogin);

  const logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  applyLoginRoleUI();
}

function applyLoginRoleUI() {
  const isAdmin = selectedLoginRole === 'admin';
  const locGroup = document.getElementById('loginLocationGroup');
  if (locGroup) locGroup.style.display = isAdmin ? 'none' : '';

  const hints = {
    user: 'Demo user: <code>user / user123</code> &middot; also <code>rahul</code>, <code>priya</code>',
    staff: 'Demo staff: <code>staff / staff123</code> &middot; also <code>staff2</code>',
    admin: 'Demo admin: <code>admin / admin123</code> &middot; also <code>manager</code>'
  };
  const hint = document.getElementById('loginHint');
  if (hint) hint.innerHTML = hints[selectedLoginRole] || '';

  const err = document.getElementById('loginError');
  if (err) err.classList.remove('show');
}

async function handleLogin(e) {
  e.preventDefault();
  const errBox = document.getElementById('loginError');
  const submitBtn = document.getElementById('loginSubmitBtn');
  errBox.classList.remove('show');

  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const areaId = document.getElementById('loginLocation').value;

  if (selectedLoginRole !== 'admin' && !areaId) {
    errBox.textContent = 'Please select a parking facility.';
    errBox.classList.add('show');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: selectedLoginRole, username, password, areaId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    setToken(data.token);
    currentSession = data.session;
    await onLoginSuccess();
  } catch (err) {
    errBox.textContent = err.message;
    errBox.classList.add('show');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
}

async function onLoginSuccess() {
  document.body.classList.add('authenticated');
  document.getElementById('loginPassword').value = '';

  applyRoleUI();
  renderSessionChip();

  if (currentSession.role === 'user') {
    currentUserId = currentSession.userId;
    const sel = document.getElementById('currentUserSelect');
    if (sel) sel.value = String(currentSession.userId);
  }

  await fetchSystemState();

  applyAssignedAreaDefaults();
  if (!realtimeStarted) { initRealtimeSync(); realtimeStarted = true; }

  renderApp();
  showToast(`Welcome, ${currentSession.name}!`, 'success');
}

async function restoreSession() {
  if (!getToken()) return;
  try {
    const res = await fetch('/api/session', { headers: authHeaders() });
    if (!res.ok) throw new Error('no session');
    const data = await res.json();
    currentSession = data.session;

    document.body.classList.add('authenticated');
    applyRoleUI();
    renderSessionChip();

    if (currentSession.role === 'user') {
      currentUserId = currentSession.userId;
      const sel = document.getElementById('currentUserSelect');
      if (sel) sel.value = String(currentSession.userId);
    }

    await fetchSystemState();
    applyAssignedAreaDefaults();
    if (!realtimeStarted) { initRealtimeSync(); realtimeStarted = true; }
    renderApp();
  } catch (err) {
    setToken('');
    currentSession = null;
    document.body.classList.remove('authenticated');
  }
}

function applyAssignedAreaDefaults() {
  if (currentSession.role === 'staff') {
    const me = state.staff.find(s => s.id === currentSession.userId);
    if (me && me.parkingId) selectedStaffAreaId = me.parkingId;
  }
  const visible = getVisibleAreas();
  if (visible.length) {
    if (!visible.some(a => a.id === selectedUserAreaId)) selectedUserAreaId = visible[0].id;
    if (!visible.some(a => a.id === selectedStaffAreaId)) selectedStaffAreaId = visible[0].id;
  }
}

function applyRoleUI() {
  const role = currentSession ? currentSession.role : null;

  document.querySelectorAll('.nav-tab').forEach(tab => {
    const allowed = tab.getAttribute('data-role');
    tab.style.display = (!role || allowed === role || (role === 'admin' && allowed === 'admin')) ? '' : 'none';
  });

  const firstTab = document.querySelector(`.nav-tab[data-role="${role}"]`);
  if (firstTab) firstTab.click();

  const picker = document.getElementById('userProfilePicker');
  if (picker) picker.style.display = role === 'admin' ? 'flex' : 'none';
  const resetBtn = document.getElementById('btnResetDemo');
  if (resetBtn) resetBtn.style.display = role === 'admin' ? 'flex' : 'none';
}

function renderSessionChip() {
  if (!currentSession) return;
  const roleLabels = { user: '👤 User', staff: '🛡️ Staff', admin: '⚙️ Admin' };
  const roleEl = document.getElementById('sessionRole');
  const nameEl = document.getElementById('sessionName');
  const locEl = document.getElementById('sessionLocation');
  if (roleEl) roleEl.textContent = roleLabels[currentSession.role] || currentSession.role;
  if (nameEl) nameEl.textContent = currentSession.name;
  if (locEl) locEl.textContent = `📍 ${currentSession.locationName}`;
}

function getVisibleAreas() {
  if (!currentSession || currentSession.role === 'admin' ||
      !currentSession.areaId) {
    return state.areas;
  }
  return state.areas.filter(a => a.id === currentSession.areaId);
}

async function logout() {
  if (!confirm('Sign out of ParkPulse?')) return;
  try {
    await fetch('/api/logout', { method: 'POST', headers: authHeaders() });
  } catch (e) { /* ignore */ }

  setToken('');
  currentSession = null;
  state = { areas: [], slots: [], records: [], users: [], staff: [], locations: [], stats: {} };
  document.body.classList.remove('authenticated');

  document.querySelectorAll('.nav-tab').forEach(t => { t.style.display = ''; t.classList.remove('active'); });
  const userTab = document.getElementById('tabUser');
  if (userTab) userTab.classList.add('active');
  document.querySelectorAll('.dashboard-view').forEach(v => v.classList.remove('active'));
  const userView = document.getElementById('user-view');
  if (userView) userView.classList.add('active');

  const err = document.getElementById('loginError');
  if (err) err.classList.remove('show');
  const form = document.getElementById('loginForm');
  if (form) form.reset();
  await loadLoginLocations();
}

function populateAddAreaCityOptions() {
  const sel = document.getElementById('addAreaCity');
  if (!sel) return;
  const locs = availableLocations.length ? availableLocations : (state.locations || []);
  sel.innerHTML = locs.map(l => `<option value="${l.name}">${l.name}</option>`).join('');
}

function notifyLocalTabs() {
  if (syncChannel) {
    syncChannel.postMessage({ type: 'REFRESH', timestamp: Date.now() });
  }
}

// ==========================================
// Master App Renderer
// ==========================================
function renderApp() {
  renderUserDashboard();
  renderStaffDashboard();
  renderAdminDashboard();
  renderMultiView();
}

// ==========================================
// 1. User Dashboard Renderer
// ==========================================
function renderUserDashboard() {
  const currentUser = state.users.find(u => u.id === currentUserId) || state.users[0];
  if (!currentUser) return;

  // Header user vehicle badge
  document.getElementById('userVehicleBadge').textContent = `🚗 ${currentUser.vehicleNumber} • ${currentUser.vehicleType}`;

  // Stat cards
  const visibleAreas = getVisibleAreas();
  document.getElementById('userStatAreas').textContent = visibleAreas.length;
  document.getElementById('userStatAvailableSlots').textContent =
    visibleAreas.reduce((sum, a) => sum + (a.available || 0), 0);

  // User active pass check
  const activeRecord = state.records.find(
    r => r.vehicleNumber.toUpperCase() === currentUser.vehicleNumber.toUpperCase() && r.status === 'PARKED'
  );
  document.getElementById('userStatActivePasses').textContent = activeRecord ? '1' : '0';

  // Total spent by this user
  const userSpent = state.records
    .filter(r => r.vehicleNumber.toUpperCase() === currentUser.vehicleNumber.toUpperCase() && r.status === 'COMPLETED')
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  document.getElementById('userStatTotalSpent').textContent = `₹${userSpent.toFixed(2)}`;

  // Active Ticket Banner
  const ticketBox = document.getElementById('userActiveTicketBox');
  if (activeRecord) {
    ticketBox.style.display = 'block';
    document.getElementById('ticketAreaName').textContent = activeRecord.areaName;
    document.getElementById('ticketSlotNumber').textContent = `#${activeRecord.slotNumber}`;
    document.getElementById('ticketEntryTime').textContent = new Date(activeRecord.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const area = state.areas.find(a => a.id === activeRecord.parkingId);
    const rate = getRateForVehicle(area, activeRecord.vehicleType);
    document.getElementById('ticketRateBadge').textContent = `₹${rate} / hr`;
  } else {
    ticketBox.style.display = 'none';
  }

  // Area Selection Chips
  const areaChipsContainer = document.getElementById('userAreaChips');
  areaChipsContainer.innerHTML = '';
  visibleAreas.forEach(area => {
    const chip = document.createElement('button');
    chip.className = `area-chip ${area.id === selectedUserAreaId ? 'active' : ''}`;
    chip.innerHTML = `${area.name} <span style="opacity:0.75">(${area.available} free)</span>`;
    chip.addEventListener('click', () => {
      selectedUserAreaId = area.id;
      renderUserDashboard();
    });
    areaChipsContainer.appendChild(chip);
  });

  // Render 2D Slots Grid for the selected area
  const userSlotsGrid = document.getElementById('userSlotsGrid');
  userSlotsGrid.innerHTML = '';
  const areaSlots = state.slots.filter(s => s.parkingId === selectedUserAreaId);

  areaSlots.forEach(slot => {
    const isOccupied = slot.status === 'OCCUPIED';
    const isMine = isOccupied && slot.vehicleNumber && currentUser && (slot.vehicleNumber.toUpperCase() === currentUser.vehicleNumber.toUpperCase());

    const stall = document.createElement('div');
    stall.className = `slot-stall ${isMine ? 'my-vehicle' : (isOccupied ? 'occupied' : 'available')}`;
    
    stall.innerHTML = `
      <div class="stall-header">
        <span class="stall-num">#${slot.slotNumber}</span>
        <span class="stall-tag ${isMine ? 'tag-mine' : (isOccupied ? 'tag-busy' : 'tag-free')}">
          ${isMine ? 'YOU' : (isOccupied ? 'BUSY' : 'FREE')}
        </span>
      </div>
      <div class="stall-content">
        <div class="stall-car-icon">${isMine ? '🚙' : (isOccupied ? '🚗' : '🅿️')}</div>
        ${isOccupied ? `<span class="stall-plate">${slot.vehicleNumber || 'OCCUPIED'}</span>` : ''}
      </div>
      <div class="stall-action-hint">
        ${isMine ? 'Click to Exit' : (isOccupied ? 'Occupied' : 'Click to Book')}
      </div>
    `;

    stall.addEventListener('click', () => {
      if (isMine) {
        exitUserVehicle(slot.vehicleNumber);
      } else if (!isOccupied) {
        openBookingModal(selectedUserAreaId, slot.slotNumber);
      } else {
        showToast(`Slot #${slot.slotNumber} is occupied by ${slot.vehicleNumber}`, 'info');
      }
    });

    userSlotsGrid.appendChild(stall);
  });

  // User History Table
  const historyBody = document.getElementById('userHistoryTableBody');
  const userRecords = state.records.filter(
    r => r.vehicleNumber.toUpperCase() === currentUser.vehicleNumber.toUpperCase()
  );
  document.getElementById('userHistoryCount').textContent = `${userRecords.length} records`;

  if (!userRecords.length) {
    historyBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#6b7280;padding:24px;">No parking sessions found for ${currentUser.vehicleNumber}.</td></tr>`;
  } else {
    historyBody.innerHTML = userRecords.map(r => `
      <tr>
        <td><strong>${r.areaName}</strong></td>
        <td><span class="badge badge-info">#${r.slotNumber}</span></td>
        <td>${new Date(r.entryTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
        <td>${r.exitTime ? new Date(r.exitTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
        <td>${r.durationMinutes ? `${r.durationMinutes} mins` : '<span class="text-amber">In Progress</span>'}</td>
        <td><strong class="${r.amount > 0 ? 'text-emerald' : ''}">₹${(r.amount || 0).toFixed(2)}</strong></td>
        <td>
          <span class="badge ${r.status === 'PARKED' ? 'badge-warning' : 'badge-success'}">
            ${r.status}
          </span>
        </td>
        <td>
          ${r.status === 'COMPLETED'
            ? `<button type="button" class="btn btn-secondary btn-xs" onclick="showHistoryReceipt(${r.recordId})" aria-label="View receipt for parking record ${r.recordId}">🧾 Receipt</button>`
            : '<span class="text-muted">Available after checkout</span>'}
        </td>
      </tr>
    `).join('');
  }
}

function showHistoryReceipt(recordId) {
  const record = state.records.find(r => r.recordId === recordId && r.status === 'COMPLETED');
  if (!record) {
    showToast('Receipt is unavailable for this parking session.', 'error');
    return;
  }

  const area = state.areas.find(a => a.id === record.parkingId);
  showReceiptModal({
    recordId: record.recordId,
    areaName: record.areaName,
    slotNumber: record.slotNumber,
    vehicleNumber: record.vehicleNumber,
    vehicleType: record.vehicleType,
    entryTime: new Date(record.entryTime).toLocaleString(),
    exitTime: new Date(record.exitTime).toLocaleString(),
    durationMinutes: record.durationMinutes,
    ratePerHour: area ? area.ratePerHour : 40,
    amount: record.amount
  });
}

// Tick active ticket timer
function tickActiveTicketTimer() {
  const currentUser = state.users.find(u => u.id === currentUserId);
  if (!currentUser) return;
  const activeRecord = state.records.find(
    r => r.vehicleNumber.toUpperCase() === currentUser.vehicleNumber.toUpperCase() && r.status === 'PARKED'
  );

  if (activeRecord) {
    const elapsedMs = Math.max(0, Date.now() - activeRecord.entryTime);
    const mins = Math.floor(elapsedMs / 60000);
    const secs = Math.floor((elapsedMs % 60000) / 1000);
    const durationStr = `${String(mins).padStart(2, '0')}m : ${String(secs).padStart(2, '0')}s`;
    
    const counterEl = document.getElementById('ticketDurationCounter');
    if (counterEl) counterEl.textContent = durationStr;

    // Calculate dynamic bill
    const area = state.areas.find(a => a.id === activeRecord.parkingId);
    const rate = getRateForVehicle(area, activeRecord.vehicleType);
    const hours = Math.max(1, Math.ceil(Math.max(1, mins) / 60));
    const currentBill = hours * rate;

    const billEl = document.getElementById('ticketCurrentBill');
    if (billEl) billEl.textContent = `₹${currentBill.toFixed(2)}`;
  }
}

// ==========================================
// 2. Staff Dashboard Renderer
// ==========================================
function renderStaffDashboard() {
  const staffAreaSelect = document.getElementById('staffAreaSelect');
  
  // Populate dropdown once or if counts change
  const staffVisibleAreas = getVisibleAreas();
  const currentVal = staffAreaSelect.value;
  staffAreaSelect.innerHTML = staffVisibleAreas.map(a => `
    <option value="${a.id}" ${a.id === selectedStaffAreaId ? 'selected' : ''}>${a.name} (${a.location})</option>
  `).join('');

  const currentArea = staffVisibleAreas.find(a => a.id === selectedStaffAreaId) || staffVisibleAreas[0];
  if (!currentArea) return;

  // Staff Stats
  document.getElementById('staffStatTotalSlots').textContent = currentArea.totalSlots;
  document.getElementById('staffStatOccupied').textContent = currentArea.occupied;
  document.getElementById('staffStatAvailable').textContent = currentArea.available;
  document.getElementById('staffStatRevenue').textContent = `₹${currentArea.revenue.toFixed(2)}`;

  // Staff 2D Floor Plan
  const staffSlotsGrid = document.getElementById('staffSlotsGrid');
  staffSlotsGrid.innerHTML = '';
  const areaSlots = state.slots.filter(s => s.parkingId === currentArea.id);

  areaSlots.forEach(slot => {
    const isOccupied = slot.status === 'OCCUPIED';
    const stall = document.createElement('div');
    stall.className = `slot-stall ${isOccupied ? 'occupied' : 'available'}`;
    
    stall.innerHTML = `
      <div class="stall-header">
        <span class="stall-num">#${slot.slotNumber}</span>
        <span class="stall-tag ${isOccupied ? 'tag-busy' : 'tag-free'}">
          ${isOccupied ? 'OCCUPIED' : 'FREE'}
        </span>
      </div>
      <div class="stall-content">
        <div class="stall-car-icon">${isOccupied ? '🚘' : '🅿️'}</div>
        ${isOccupied ? `<span class="stall-plate">${slot.vehicleNumber}</span>` : ''}
      </div>
      <div class="stall-action-hint">
        ${isOccupied ? 'Click to Exit' : 'Click to Check-in'}
      </div>
    `;

    stall.addEventListener('click', () => {
      if (isOccupied) {
        openStaffExitModalWithPlate(slot.vehicleNumber);
      } else {
        openStaffEntryModalWithSlot(slot.slotNumber);
      }
    });

    staffSlotsGrid.appendChild(stall);
  });

  // Active Vehicles in this Area Table
  const activeTableBody = document.getElementById('staffActiveVehiclesTableBody');
  const activeRecords = state.records.filter(r => r.parkingId === currentArea.id && r.status === 'PARKED');
  document.getElementById('staffActiveCount').textContent = `${activeRecords.length} vehicles`;

  if (!activeRecords.length) {
    activeTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#6b7280;padding:20px;">No vehicles currently parked in ${currentArea.name}.</td></tr>`;
  } else {
    activeTableBody.innerHTML = activeRecords.map(r => {
      const elapsedMins = Math.max(1, Math.round((Date.now() - r.entryTime) / 60000));
      const hours = Math.max(1, Math.ceil(elapsedMins / 60));
      const rate = getRateForVehicle(currentArea, r.vehicleType);
      const estFee = hours * rate;

      return `
        <tr>
          <td><span class="badge badge-info">#${r.slotNumber}</span></td>
          <td><strong style="font-family:monospace;letter-spacing:0.5px;color:#fef08a;">${r.vehicleNumber}</strong></td>
          <td>${r.vehicleType}</td>
          <td>${new Date(r.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          <td>${elapsedMins} mins</td>
          <td><strong class="text-amber">₹${estFee.toFixed(2)}</strong></td>
          <td>
            <button class="btn btn-xs btn-warning" onclick="openStaffExitModalWithPlate('${r.vehicleNumber}')">
              Exit & Bill
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// ==========================================
// 3. Admin Dashboard Renderer
// ==========================================
function renderAdminDashboard() {
  document.getElementById('adminStatFacilities').textContent = state.stats.totalAreas || 0;
  document.getElementById('adminStatSlots').textContent = state.stats.totalSlots || 0;
  document.getElementById('adminStatOccupied').textContent = state.stats.totalOccupied || 0;
  document.getElementById('adminStatOccupancyPct').textContent = `${state.stats.occupancyPercentage || 0}%`;
  document.getElementById('adminStatRevenue').textContent = `₹${(state.stats.totalRevenue || 0).toFixed(2)}`;

  // Utilization Progress Bars
  const barsContainer = document.getElementById('adminFacilityBars');
  barsContainer.innerHTML = state.areas.map(a => {
    let color = '#10b981';
    if (a.occupancyRate > 85) color = '#f43f5e';
    else if (a.occupancyRate > 60) color = '#f59e0b';

    return `
      <div class="facility-bar-item">
        <div class="bar-meta">
          <strong>${a.name} <span style="font-weight:400;color:#9ca3af">(${a.location})</span></strong>
          <span><strong>${a.occupied} / ${a.totalSlots}</strong> slots (${a.occupancyRate}%) • ₹${a.revenue.toFixed(2)}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${Math.max(5, a.occupancyRate)}%; background: ${color}"></div>
        </div>
      </div>
    `;
  }).join('');

  // 1. All Areas Table
  const areasTableBody = document.getElementById('adminAreasTableBody');
  areasTableBody.innerHTML = state.areas.map(a => `
    <tr>
      <td>${a.id}</td>
      <td><strong>${a.name}</strong></td>
      <td>${a.location}</td>
      <td>${formatRates(a)}</td>
      <td>${a.totalSlots}</td>
      <td><span class="text-rose font-bold">${a.occupied}</span></td>
      <td><span class="text-emerald font-bold">${a.available}</span></td>
      <td>
        <span class="badge ${a.occupancyRate > 80 ? 'badge-danger' : (a.occupancyRate > 40 ? 'badge-warning' : 'badge-success')}">
          ${a.occupancyRate}%
        </span>
      </td>
      <td><strong class="text-emerald">₹${a.revenue.toFixed(2)}</strong></td>
    </tr>
  `).join('');

  // 2. Records Audit Trail
  renderAdminRecordsTable();

  // 3. Users Table
  const usersTableBody = document.getElementById('adminUsersTableBody');
  usersTableBody.innerHTML = state.users.map(u => {
    const isCurrentlyParked = state.records.some(r => r.vehicleNumber.toUpperCase() === u.vehicleNumber.toUpperCase() && r.status === 'PARKED');
    return `
      <tr>
        <td>#USR-${u.id}</td>
        <td><strong>${u.name}</strong></td>
        <td><code>${u.username}</code></td>
        <td>${u.phone || '—'}</td>
        <td><strong style="color:#fef08a">${u.vehicleNumber}</strong></td>
        <td>${u.vehicleType}</td>
        <td>
          <span class="badge ${isCurrentlyParked ? 'badge-warning' : 'badge-info'}">
            ${isCurrentlyParked ? 'PARKED' : 'IDLE'}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  // 4. Staff Table
  const staffTableBody = document.getElementById('adminStaffTableBody');
  staffTableBody.innerHTML = state.staff.map(s => {
    const assignedArea = state.areas.find(a => a.id === s.parkingId);
    return `
      <tr>
        <td>#STF-${s.id}</td>
        <td><strong>${s.name}</strong></td>
        <td><code>${s.username}</code></td>
        <td>${assignedArea ? assignedArea.name : `Area #${s.parkingId}`}</td>
        <td><span class="badge badge-success">Active Staff</span></td>
      </tr>
    `;
  }).join('');
}

function renderAdminRecordsTable() {
  const recordsTableBody = document.getElementById('adminRecordsTableBody');
  const search = (document.getElementById('adminRecordSearch').value || '').trim().toUpperCase();
  const filter = document.getElementById('adminRecordFilter').value;

  let filtered = state.records.filter(r => {
    if (filter !== 'ALL' && r.status !== filter) return false;
    if (search) {
      const matchPlate = r.vehicleNumber.toUpperCase().includes(search);
      const matchArea = r.areaName.toUpperCase().includes(search);
      const matchSlot = String(r.slotNumber) === search;
      return matchPlate || matchArea || matchSlot;
    }
    return true;
  });

  if (!filtered.length) {
    recordsTableBody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#6b7280;padding:24px;">No records match your search criteria.</td></tr>`;
  } else {
    recordsTableBody.innerHTML = filtered.map(r => `
      <tr>
        <td>#${r.recordId}</td>
        <td><strong style="font-family:monospace;color:#fef08a;">${r.vehicleNumber}</strong></td>
        <td>${r.vehicleType}</td>
        <td>${r.areaName}</td>
        <td><span class="badge badge-info">#${r.slotNumber}</span></td>
        <td>${new Date(r.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
        <td>${r.exitTime ? new Date(r.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
        <td>${r.durationMinutes ? `${r.durationMinutes}m` : 'In Progress'}</td>
        <td><strong class="${r.amount > 0 ? 'text-emerald' : ''}">₹${(r.amount || 0).toFixed(2)}</strong></td>
        <td>
          <span class="badge ${r.status === 'PARKED' ? 'badge-warning' : 'badge-success'}">
            ${r.status}
          </span>
        </td>
      </tr>
    `).join('');
  }
}

// ==========================================
// 4. Live Multi-View (Command Center) Renderer
// ==========================================
function renderMultiView() {
  const currentUser = state.users.find(u => u.id === currentUserId) || state.users[0];
  const staffArea = state.areas.find(a => a.id === selectedStaffAreaId) || state.areas[0];

  // User Panel Header & Mini Stats
  document.getElementById('mvUserSub').textContent = `${currentUser.name} (${currentUser.vehicleNumber})`;
  document.getElementById('mvUserFreeSlots').textContent = state.stats.totalAvailable || 0;
  
  const userActiveRecord = state.records.find(r => r.vehicleNumber.toUpperCase() === currentUser.vehicleNumber.toUpperCase() && r.status === 'PARKED');
  document.getElementById('mvUserActivePass').textContent = userActiveRecord ? `Slot #${userActiveRecord.slotNumber}` : 'None';

  // User Mini Slots (showing selectedUserAreaId)
  const userMiniSlots = document.getElementById('mvUserSlots');
  userMiniSlots.innerHTML = '';
  state.slots.filter(s => s.parkingId === selectedUserAreaId).slice(0, 16).forEach(s => {
    const isOcc = s.status === 'OCCUPIED';
    userMiniSlots.innerHTML += `
      <div class="mini-slot ${isOcc ? 'occupied' : 'available'}" title="${isOcc ? s.vehicleNumber : 'Available'}">
        #${s.slotNumber}
      </div>
    `;
  });

  // Staff Panel Header & Mini Stats
  if (staffArea) {
    document.getElementById('mvStaffSub').textContent = staffArea.name;
    document.getElementById('mvStaffOccupied').textContent = `${staffArea.occupied} / ${staffArea.totalSlots}`;
    document.getElementById('mvStaffRevenue').textContent = `₹${staffArea.revenue.toFixed(2)}`;

    const staffMiniSlots = document.getElementById('mvStaffSlots');
    staffMiniSlots.innerHTML = '';
    state.slots.filter(s => s.parkingId === staffArea.id).slice(0, 16).forEach(s => {
      const isOcc = s.status === 'OCCUPIED';
      staffMiniSlots.innerHTML += `
        <div class="mini-slot ${isOcc ? 'occupied' : 'available'}" title="${isOcc ? s.vehicleNumber : 'Free'}">
          #${s.slotNumber}
        </div>
      `;
    });
  }

  // Admin Panel Mini Stats & Live Audit Stream
  document.getElementById('mvAdminTotalVehicles').textContent = `${state.stats.totalOccupied} Parked`;
  document.getElementById('mvAdminRevenue').textContent = `₹${(state.stats.totalRevenue || 0).toFixed(2)}`;
  document.getElementById('mvAdminOccupancy').textContent = `${state.stats.occupancyPercentage || 0}%`;

  const streamContainer = document.getElementById('mvAdminAuditStream');
  streamContainer.innerHTML = state.records.slice(0, 5).map(r => `
    <div class="stream-item">
      <span><strong>${r.vehicleNumber}</strong> in ${r.areaName} (#${r.slotNumber})</span>
      <span class="badge ${r.status === 'PARKED' ? 'badge-warning' : 'badge-success'}">${r.status}</span>
    </div>
  `).join('');
}

// ==========================================
// Navigation & Sub-Tabs
// ==========================================
function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetView = tab.getAttribute('data-view');
      document.querySelectorAll('.dashboard-view').forEach(view => {
        view.classList.remove('active');
      });
      document.getElementById(targetView).classList.add('active');
    });
  });

  // Admin Sub-tabs
  const adminSubtabs = document.querySelectorAll('.sub-tab');
  adminSubtabs.forEach(tab => {
    tab.addEventListener('click', () => {
      adminSubtabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetContent = tab.getAttribute('data-subtab');
      document.querySelectorAll('.subtab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(targetContent).classList.add('active');
    });
  });
}

// ==========================================
// Event Listeners & Modals
// ==========================================
function setupEventListeners() {
  // User switcher
  document.getElementById('currentUserSelect').addEventListener('change', (e) => {
    currentUserId = parseInt(e.target.value);
    renderApp();
    const u = state.users.find(x => x.id === currentUserId);
    if (u) showToast(`Switched active profile to ${u.name}`);
  });

  // Staff Area switcher
  document.getElementById('staffAreaSelect').addEventListener('change', (e) => {
    selectedStaffAreaId = parseInt(e.target.value);
    renderStaffDashboard();
    renderMultiView();
  });

  // Reset Demo button
  document.getElementById('btnResetDemo').addEventListener('click', async () => {
    if (!confirm('Reset all parking records and slot allocations back to demo state?')) return;
    try {
      await fetch('/api/reset', { method: 'POST', headers: authHeaders() });
      await fetchSystemState();
      notifyLocalTabs();
      showToast('Demo data reset successfully!');
    } catch (err) {
      showToast('Reset failed', 'error');
    }
  });

  // Admin record search and filter
  document.getElementById('adminRecordSearch').addEventListener('input', renderAdminRecordsTable);
  document.getElementById('adminRecordFilter').addEventListener('change', renderAdminRecordsTable);

  // User Exit / Release Slot button
  document.getElementById('btnUserExitVehicle').addEventListener('click', () => {
    const currentUser = state.users.find(u => u.id === currentUserId);
    if (currentUser) exitUserVehicle(currentUser.vehicleNumber);
  });

  // Multi-view Quick buttons
  document.getElementById('btnMvBookModal').addEventListener('click', () => openBookingModal(selectedUserAreaId));
  document.getElementById('btnMvExitModal').addEventListener('click', () => openStaffExitModal());
}

// ==========================================
// Modals Setup
// ==========================================
function setupModals() {
  // Close buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      closeModal(modalId);
    });
  });

  // Close on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal.id);
    });
  });

  // 1. User Booking Form Submit
  document.getElementById('formBookSlot').addEventListener('submit', async (e) => {
    e.preventDefault();
    const areaId = document.getElementById('bookModalAreaSelect').value;
    const slotNumber = document.getElementById('bookModalSlotSelect').value;
    const vehicleNumber = document.getElementById('bookModalVehicle').value;
    const vehicleType = document.getElementById('bookModalType').value;

    try {
      const res = await fetch('/api/entry', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          parkingId: areaId,
          slotNumber: slotNumber || null,
          vehicleNumber,
          vehicleType,
          userId: currentUserId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed');

      closeModal('modalBookSlot');
      showToast(data.message, 'success');
      await fetchSystemState();
      notifyLocalTabs();
    } catch (err) {
      showToast(getApiErrorMessage(err), 'error');
    }
  });

  // 2. Staff Entry Form Submit
  document.getElementById('btnStaffNewEntry').addEventListener('click', () => openStaffEntryModalWithSlot());
  document.getElementById('formStaffEntry').addEventListener('submit', async (e) => {
    e.preventDefault();
    const areaId = document.getElementById('staffEntryAreaId').value;
    const slotNumber = document.getElementById('staffEntrySlotSelect').value;
    const vehicleNumber = document.getElementById('staffEntryPlate').value;
    const vehicleType = document.getElementById('staffEntryType').value;

    try {
      const res = await fetch('/api/entry', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          parkingId: areaId,
          slotNumber: slotNumber || null,
          vehicleNumber,
          vehicleType
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Entry failed');

      closeModal('modalStaffEntry');
      showToast(data.message, 'success');
      await fetchSystemState();
      notifyLocalTabs();
    } catch (err) {
      showToast(getApiErrorMessage(err), 'error');
    }
  });

  // 3. Staff Exit Form Submit
  document.getElementById('btnStaffProcessExit').addEventListener('click', () => openStaffExitModal());
  document.getElementById('formStaffExit').addEventListener('submit', async (e) => {
    e.preventDefault();
    const vehicleNumber = document.getElementById('staffExitPlateInput').value;
    if (!vehicleNumber) return;
    processVehicleExit(vehicleNumber);
  });

  // 4. Admin Add Facility Form Submit
  document.getElementById('btnAdminAddArea').addEventListener('click', () => openModal('modalAddArea'));
  document.getElementById('formAddArea').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('addAreaName').value;
    const location = document.getElementById('addAreaLocation').value;
    const totalSlots = document.getElementById('addAreaSlots').value;
    const bikeRate = document.getElementById('addAreaBikeRate').value;
    const carRate = document.getElementById('addAreaCarRate').value;
    const heavyRate = document.getElementById('addAreaHeavyRate').value;
    const citySelect = document.getElementById('addAreaCity');
    const city = citySelect ? citySelect.value : 'Bengaluru';

    try {
      const res = await fetch('/api/areas', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name, location, totalSlots, rates: { bike: parseFloat(bikeRate) || 10, car: parseFloat(carRate) || 30, heavy: parseFloat(heavyRate) || 50 }, city })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add facility');

      closeModal('modalAddArea');
      showToast(`Facility '${name}' added!`, 'success');
      await fetchSystemState();
      notifyLocalTabs();
    } catch (err) {
      showToast(getApiErrorMessage(err), 'error');
    }
  });
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// ==========================================
// Modal Helpers
// ==========================================
function openBookingModal(defaultAreaId, defaultSlotNum) {
  const currentUser = state.users.find(u => u.id === currentUserId) || state.users[0];
  const areaSelect = document.getElementById('bookModalAreaSelect');
  areaSelect.innerHTML = getVisibleAreas().map(a => `
    <option value="${a.id}" ${a.id === defaultAreaId ? 'selected' : ''}>
      ${a.name} (${formatRates(a)} • ${a.available} slots free)
    </option>
  `).join('');

  updateBookingModalSlots(defaultAreaId, defaultSlotNum);

  areaSelect.onchange = () => {
    updateBookingModalSlots(parseInt(areaSelect.value));
  };

  document.getElementById('bookModalVehicle').value = currentUser.vehicleNumber;
  document.getElementById('bookModalType').value = currentUser.vehicleType;
  openModal('modalBookSlot');
}

function updateBookingModalSlots(areaId, defaultSlotNum) {
  const slotSelect = document.getElementById('bookModalSlotSelect');
  const availableSlots = state.slots.filter(s => s.parkingId === areaId && s.status === 'AVAILABLE');
  
  slotSelect.innerHTML = '<option value="">Auto-allocate First Available</option>' + 
    availableSlots.map(s => `
      <option value="${s.slotNumber}" ${s.slotNumber === defaultSlotNum ? 'selected' : ''}>
        Slot #${s.slotNumber}
      </option>
    `).join('');

  const area = state.areas.find(a => a.id === areaId);
  if (area) {
    document.getElementById('bookModalPriceNotice').innerHTML = `Hourly Rates: <strong>${formatRates(area)}</strong> • ${area.location}`;
  }
}

function openStaffEntryModalWithSlot(slotNum) {
  const visible = getVisibleAreas();
  const currentArea = visible.find(a => a.id === selectedStaffAreaId) || visible[0];
  document.getElementById('staffEntryAreaDisplay').value = `${currentArea.name} (${currentArea.location})`;
  document.getElementById('staffEntryAreaId').value = currentArea.id;
  document.getElementById('staffEntryPlate').value = '';

  const slotSelect = document.getElementById('staffEntrySlotSelect');
  const availableSlots = state.slots.filter(s => s.parkingId === currentArea.id && s.status === 'AVAILABLE');
  slotSelect.innerHTML = '<option value="">Auto-allocate First Available</option>' + 
    availableSlots.map(s => `
      <option value="${s.slotNumber}" ${s.slotNumber === slotNum ? 'selected' : ''}>
        Slot #${s.slotNumber}
      </option>
    `).join('');

  openModal('modalStaffEntry');
}

function openStaffExitModalWithPlate(plateNumber) {
  openStaffExitModal(plateNumber);
}

function openStaffExitModal(defaultPlate = '') {
  document.getElementById('staffExitPlateInput').value = defaultPlate;
  
  // Quick plate suggestion pills
  const suggestionsBox = document.getElementById('staffExitPlateSuggestions');
  const activeRecords = state.records.filter(r => r.status === 'PARKED');
  
  if (!activeRecords.length) {
    suggestionsBox.innerHTML = '<span style="font-size:0.75rem;color:#9ca3af">No active parked vehicles to exit.</span>';
  } else {
    suggestionsBox.innerHTML = '<span style="font-size:0.75rem;color:#9ca3af;width:100%">Quick Select:</span>' +
      activeRecords.map(r => `
        <button type="button" class="plate-pill-btn" onclick="document.getElementById('staffExitPlateInput').value='${r.vehicleNumber}'">
          ${r.vehicleNumber} (#${r.slotNumber})
        </button>
      `).join('');
  }

  openModal('modalStaffExit');
}

async function exitUserVehicle(plate) {
  if (!confirm(`Are you sure you want to exit vehicle ${plate} and pay the parking charges?`)) return;
  processVehicleExit(plate);
}

async function processVehicleExit(vehicleNumber) {
  try {
    const res = await fetch('/api/exit', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ vehicleNumber })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Exit processing failed');

    closeModal('modalStaffExit');
    showReceiptModal(data.receipt);
    showToast(data.message, 'success');
    await fetchSystemState();
    notifyLocalTabs();
  } catch (err) {
    showToast(getApiErrorMessage(err), 'error');
  }
}

function showReceiptModal(receipt) {
  if (!receipt) return;
  const content = document.getElementById('receiptContent');
  content.innerHTML = `
    <div class="receipt-title">PARKPULSE GATE PASS</div>
    <div class="receipt-sub">Receipt #${receipt.recordId} • Official Tax Invoice</div>
    <div class="receipt-row"><span>Facility:</span><strong>${receipt.areaName}</strong></div>
    <div class="receipt-row"><span>Slot Number:</span><strong>Slot #${receipt.slotNumber}</strong></div>
    <div class="receipt-row"><span>Vehicle Plate:</span><strong>${receipt.vehicleNumber} (${receipt.vehicleType})</strong></div>
    <div class="receipt-row"><span>Entry Time:</span><span>${receipt.entryTime}</span></div>
    <div class="receipt-row"><span>Exit Time:</span><span>${receipt.exitTime}</span></div>
    <div class="receipt-row"><span>Total Duration:</span><strong>${receipt.durationMinutes} mins</strong></div>
    <div class="receipt-row"><span>Vehicle Type:</span><span>${receipt.vehicleType}</span></div>
    <div class="receipt-row"><span>Hourly Rate:</span><span>₹${receipt.ratePerHour}.00/hr</span></div>
    <div class="receipt-row receipt-total">
      <span>AMOUNT PAID:</span>
      <span style="color:#10b981;">₹${receipt.amount.toFixed(2)}</span>
    </div>
    <div style="text-align:center;margin-top:16px;color:#888;font-size:0.7rem;">
      Thank you for parking with ParkPulse! Drive safely.
    </div>
  `;
  openModal('modalReceipt');
}

// ==========================================
// Toast Notification System
// ==========================================
function showToast(message, type = 'info') {
  const hub = document.getElementById('toastHub');
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let icon = '🔔';
  if (type === 'success') icon = '✅';
  else if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span><div>${message}</div>`;
  hub.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Expose helpers globally
window.openStaffExitModalWithPlate = openStaffExitModalWithPlate;
