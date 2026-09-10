/* ===================================================
   SMARTPROCURE — Farmer Dashboard JavaScript
   =================================================== */

let farmerSession = null;
let selectedSlot = null;

// ─── Session & Auth Guard ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const raw = localStorage.getItem('smartprocure_farmer');
  if (!raw) {
    window.location.href = '/farmer/login';
    return;
  }

  farmerSession = JSON.parse(raw);
  populateFarmerHeader();
  populateProfile();
  loadSummaryStats();
  loadMyBookings();
  loadPaymentStatus();
  initBookingForm();

  // Handle URL hash navigation (e.g. from mobile bottom nav #book or #track)
  const initialTab = window.location.hash.replace('#', '') || 'book';
  if (['book', 'bookings', 'track', 'payment', 'profile'].includes(initialTab)) {
    switchTab(initialTab);
  } else {
    switchTab('book');
  }

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['book', 'bookings', 'track', 'payment', 'profile'].includes(hash)) {
      switchTab(hash);
    }
  });
});

function logoutFarmer(e) {
  e.preventDefault();
  localStorage.removeItem('smartprocure_farmer');
  window.location.href = '/farmer/login';
}

// ─── Header Population ─────────────────────────────
function populateFarmerHeader() {
  const f = farmerSession;
  const nameEl = document.getElementById('dash-farmer-name');
  const kisanEl = document.getElementById('dash-kisan-id');
  const distEl = document.getElementById('dash-district');
  const phoneEl = document.getElementById('dash-phone-badge');

  if (nameEl) nameEl.textContent = f.full_name || 'Farmer';
  if (kisanEl) kisanEl.textContent = `Kisan ID: ${f.kisan_id || '--'}`;
  if (distEl) distEl.textContent = `${f.village || ''} ${f.district || ''}, ${f.state || ''}`.trim();
  if (phoneEl) phoneEl.textContent = `📱 +91 ${f.phone}`;
}

// ─── Tab Switching ──────────────────────────────────
function switchTab(tabName) {
  // Hide all panels
  document.querySelectorAll('.dashboard-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.dashboard-tab-btn').forEach(b => b.classList.remove('active'));

  // Show selected
  const panel = document.getElementById('panel-' + tabName);
  const btn = document.getElementById('tab-btn-' + tabName);
  if (panel) panel.classList.add('active');
  if (btn) {
    btn.classList.add('active');
    // On mobile screens, scroll the active tab smoothly into view
    if (window.innerWidth <= 768) {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  try {
    history.replaceState(null, null, '#' + tabName);
  } catch(e) {}
}

// ─── Mobile Quantity Steppers & Vehicle Helpers ──────
function adjustBookingQty(delta) {
  const input = document.getElementById('book-qty-input');
  if (!input) return;
  let val = (parseFloat(input.value) || 40) + delta;
  if (val < 1) val = 1;
  if (val > 1000) val = 1000;
  input.value = val;
  updateMSPPreview();
}

function setBookingQty(val) {
  const input = document.getElementById('book-qty-input');
  if (!input) return;
  input.value = val;
  updateMSPPreview();
}

function setVehicle(v) {
  const input = document.getElementById('book-vehicle-input');
  if (!input) return;
  input.value = v;
}

// ─── Summary Stats ─────────────────────────────────
async function loadSummaryStats() {
  if (!farmerSession) return;
  try {
    const res = await fetch(`/api/farmer/track?phone=${farmerSession.phone}`);
    const data = await res.json();
    if (!data.success) return;

    const bookings = data.bookings || [];
    const completedQty = bookings.reduce((sum, b) => sum + (b.net_weight_quintals || 0), 0);
    const totalPay = bookings.reduce((sum, b) => sum + (b.total_payable_amount || 0), 0);
    const activeBook = bookings.find(b => ['booked','checked_in','called'].includes(b.booking_status));

    const el = id => document.getElementById(id);
    if (el('sum-total-bookings')) el('sum-total-bookings').textContent = bookings.length;
    if (el('sum-total-qty')) el('sum-total-qty').textContent = completedQty > 0 ? completedQty.toFixed(1) + ' Qtl' : '--';
    if (el('sum-total-payment')) el('sum-total-payment').textContent = totalPay > 0 ? '₹' + totalPay.toLocaleString('en-IN') : '--';
    if (el('sum-active-token')) el('sum-active-token').textContent = activeBook ? activeBook.token_number : '--';

    // Badge count
    const badgeEl = document.getElementById('bookings-count-badge');
    if (badgeEl && bookings.length > 0) {
      badgeEl.textContent = bookings.length;
      badgeEl.style.display = '';
    }
  } catch(e) { console.warn('Stats load error', e); }
}

// ─── Booking Form ───────────────────────────────────
function initBookingForm() {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('book-date-input');
  if (dateInput) {
    dateInput.value = today;
    dateInput.min = today;
  }

  // Restore draft if saved
  try {
    const draft = JSON.parse(localStorage.getItem('smartprocure_draft_booking') || 'null');
    if (draft) {
      if (draft.centreId && document.getElementById('book-centre-select')) document.getElementById('book-centre-select').value = draft.centreId;
      if (draft.cropId && document.getElementById('book-crop-select')) document.getElementById('book-crop-select').value = draft.cropId;
      if (draft.qty && document.getElementById('book-qty-input')) document.getElementById('book-qty-input').value = draft.qty;
      if (draft.vehicle && document.getElementById('book-vehicle-input')) document.getElementById('book-vehicle-input').value = draft.vehicle;
    }
  } catch(e) {}

  updateBookingPreview();
  loadSlots();
  updateMSPPreview();
}

function updateMSPPreview() {
  const cropSel = document.getElementById('book-crop-select');
  if (!cropSel) return;
  const opt = cropSel.options[cropSel.selectedIndex];
  const msp = parseFloat(opt.dataset.msp || 0);
  const qty = parseFloat(document.getElementById('book-qty-input')?.value || 40);
  const total = msp * qty;

  const mspEl = document.getElementById('preview-msp');
  const totalEl = document.getElementById('preview-total');
  const cropEl = document.getElementById('preview-crop');
  const kgEl = document.getElementById('preview-kg-sub');

  if (mspEl) mspEl.textContent = '₹' + msp.toLocaleString('en-IN');
  if (totalEl) totalEl.textContent = total > 0 ? '₹' + total.toLocaleString('en-IN', {maximumFractionDigits: 0}) : '₹—';
  if (cropEl) cropEl.textContent = opt.text.split('(')[0].trim();
  if (kgEl) kgEl.textContent = ((qty || 0) * 100).toLocaleString('en-IN') + ' kg';

  updateBookingPreview();

  // Save draft locally for rural spotty network resilience
  try {
    const draft = {
      centreId: document.getElementById('book-centre-select')?.value,
      cropId: cropSel.value,
      date: document.getElementById('book-date-input')?.value,
      qty: qty,
      vehicle: document.getElementById('book-vehicle-input')?.value
    };
    localStorage.setItem('smartprocure_draft_booking', JSON.stringify(draft));
  } catch(e) {}
}

function updateBookingPreview() {
  const centreSel = document.getElementById('book-centre-select');
  const dateInput = document.getElementById('book-date-input');
  const qtyInput = document.getElementById('book-qty-input');

  if (!centreSel) return;

  const centreText = centreSel.options[centreSel.selectedIndex]?.text?.split('—')[0]?.trim() || '—';
  const dateVal = dateInput?.value ? new Date(dateInput.value).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : '—';
  const qty = qtyInput?.value ? qtyInput.value + ' Qtl' : '—';

  const el = id => document.getElementById(id);
  if (el('preview-centre')) el('preview-centre').textContent = centreText;
  if (el('preview-date')) el('preview-date').textContent = dateVal;
  if (el('preview-qty')) el('preview-qty').textContent = qty;
}

async function loadSlots() {
  const centreId = document.getElementById('book-centre-select')?.value;
  const date = document.getElementById('book-date-input')?.value;
  const container = document.getElementById('slots-grid-container');
  if (!container || !centreId || !date) return;

  container.innerHTML = '<div style="text-align:center;padding:1rem;color:#94a3b8;font-size:0.85rem;">⏳ Loading slots...</div>';
  selectedSlot = null;
  document.getElementById('preview-slot').textContent = '—';

  try {
    const res = await fetch(`/api/slots?centre_id=${centreId}&date=${date}`);
    const data = await res.json();
    if (!data.success || !data.slots.length) {
      container.innerHTML = '<div style="text-align:center;padding:1rem;color:#94a3b8;">No slots available for this date</div>';
      return;
    }

    container.innerHTML = data.slots.map(slot => {
      const isFull = slot.available === 0;
      const pct = slot.capacity > 0 ? Math.round((slot.booked / slot.capacity) * 100) : 0;
      const pctColor = pct < 50 ? '#16a34a' : pct < 80 ? '#d97706' : '#ef4444';
      return `
        <div class="slot-item ${isFull ? 'disabled' : 'available'}"
             onclick="${isFull ? '' : `selectBookingSlot(this, '${slot.slot_label}')`}"
             style="${isFull ? 'opacity:0.45;cursor:not-allowed;' : 'cursor:pointer;'}">
          <div class="slot-time">${slot.slot_label}</div>
          <div class="slot-capacity" style="color:${pctColor};font-size:0.72rem;font-weight:700;">
            ${isFull ? '🔴 FULL' : `${slot.available} left`}
          </div>
          <div style="height:3px;background:#e2e8f0;border-radius:2px;margin-top:0.4rem;">
            <div style="height:100%;width:${pct}%;background:${pctColor};border-radius:2px;transition:width 0.4s;"></div>
          </div>
        </div>
      `;
    }).join('');
  } catch(e) {
    container.innerHTML = '<div style="text-align:center;padding:1rem;color:#ef4444;">Error loading slots</div>';
  }
}

function selectBookingSlot(el, slotLabel) {
  document.querySelectorAll('#slots-grid-container .slot-item').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  selectedSlot = slotLabel;
  const slotEl = document.getElementById('preview-slot');
  if (slotEl) slotEl.textContent = slotLabel;
}

async function confirmBooking() {
  if (!farmerSession) return showToast('Please login first', 'error');
  if (!selectedSlot) return showToast('Please select a time slot', 'error');

  const centreId = document.getElementById('book-centre-select')?.value;
  const cropId = document.getElementById('book-crop-select')?.value;
  const date = document.getElementById('book-date-input')?.value;
  const qty = document.getElementById('book-qty-input')?.value;
  const vehicle = document.getElementById('book-vehicle-input')?.value;

  if (!centreId || !cropId || !date) return showToast('Please fill all booking details', 'error');

  const btn = document.getElementById('btn-confirm-booking');
  btn.disabled = true; btn.textContent = '⏳ Booking...';

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        farmer_id: farmerSession.id,
        centre_id: centreId,
        crop_id: cropId,
        booking_date: date,
        time_slot: selectedSlot,
        estimated_quantity_quintals: parseFloat(qty) || 40,
        vehicle_number: vehicle || 'TRACTOR-TROLLEY'
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('🎫 ' + data.message, 'success');
      // Show token
      const tokenEl = document.getElementById('new-token-display');
      const tokenBox = document.getElementById('token-success-display');
      if (tokenEl) tokenEl.textContent = data.booking.token_number;
      if (tokenBox) tokenBox.style.display = '';

      // Reload stats & bookings
      loadSummaryStats();
      loadMyBookings();
      loadPaymentStatus();

      // Switch to bookings tab after 2s
      setTimeout(() => switchTab('bookings'), 2500);
    } else {
      showToast(data.error || 'Booking failed', 'error');
    }
  } catch(e) {
    showToast('Network error. Please try again.', 'error');
  }
  btn.disabled = false; btn.textContent = '🎫 Confirm Slot & Generate Digital Token';
}

// ─── My Bookings ────────────────────────────────────
async function loadMyBookings() {
  if (!farmerSession) return;
  const container = document.getElementById('bookings-list-container');
  if (!container) return;

  try {
    const res = await fetch(`/api/farmer/track?phone=${farmerSession.phone}`);
    const data = await res.json();
    if (!data.success || !data.bookings.length) {
      container.innerHTML = `<div class="empty-state">
        <span class="empty-state-icon">🎫</span>
        <div class="empty-state-title">No Bookings Yet</div>
        <div class="empty-state-desc">Book your first procurement slot to get started!</div>
      </div>`;
      return;
    }

    const statusColors = {
      booked: 'status-booked', checked_in: 'status-checked_in',
      called: 'status-called', completed: 'status-completed', cancelled: 'status-cancelled'
    };

    container.innerHTML = data.bookings.map(b => `
      <div class="booking-history-card">
        <div class="booking-card-top">
          <div class="booking-token-chip">${b.token_number}</div>
          <div class="booking-status-pill ${statusColors[b.booking_status] || 'status-booked'}">
            ${(b.booking_status||'booked').replace('_',' ').toUpperCase()}
          </div>
        </div>
        <div class="booking-card-details">
          <div class="booking-detail-item">
            <div class="label">📅 Date</div>
            <div class="value">${new Date(b.booking_date).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}</div>
          </div>
          <div class="booking-detail-item">
            <div class="label">⏰ Time Slot</div>
            <div class="value">${b.time_slot}</div>
          </div>
          <div class="booking-detail-item">
            <div class="label">🌾 Crop</div>
            <div class="value">${b.crop_name} (${b.crop_hindi})</div>
          </div>
          <div class="booking-detail-item">
            <div class="label">🏢 Centre</div>
            <div class="value" style="font-size:0.76rem;">${b.centre_name}</div>
          </div>
          ${b.receipt_number ? `
          <div class="booking-detail-item">
            <div class="label">📄 Receipt</div>
            <div class="value"><a href="/receipt/${b.receipt_number}" target="_blank" style="color:#16a34a;font-weight:700;">${b.receipt_number}</a></div>
          </div>
          <div class="booking-detail-item">
            <div class="label">💰 Amount</div>
            <div class="value" style="color:#16a34a;">₹${(b.total_payable_amount||0).toLocaleString('en-IN')}</div>
          </div>
          ` : ''}
        </div>
        <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-secondary btn-sm" onclick="quickTrack('${b.token_number}')">📍 Track</button>
          ${b.booking_status === 'booked' ? `<button class="btn btn-primary btn-sm" onclick="checkInToken('${b.id}')">✅ Check-In at Mandi</button>` : ''}
        </div>
      </div>
    `).join('');
  } catch(e) {
    console.warn('Bookings load error', e);
  }
}

async function checkInToken(bookingId) {
  try {
    const res = await fetch(`/api/bookings/${bookingId}/check-in`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('✅ ' + data.message, 'success');
      loadMyBookings();
      loadSummaryStats();
    } else {
      showToast(data.error, 'error');
    }
  } catch(e) { showToast('Error checking in', 'error'); }
}

// ─── Token Tracker ──────────────────────────────────
function quickTrack(token) {
  document.getElementById('track-token-input').value = token;
  switchTab('track');
  trackToken();
}

async function trackToken() {
  const input = document.getElementById('track-token-input');
  const token = input?.value.trim();
  if (!token) return showToast('Please enter a token number', 'error');

  const container = document.getElementById('track-result-container');
  container.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8;">⏳ Fetching status...</div>';

  try {
    const res = await fetch(`/api/farmer/track?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    if (!data.success) {
      container.innerHTML = `<div class="empty-state"><span class="empty-state-icon">❌</span><div class="empty-state-title">Token Not Found</div><div class="empty-state-desc">No booking found for token "${token}"</div></div>`;
      return;
    }

    const b = data.booking;
    const steps = [
      { key: 'booked',     icon: '📋', label: 'Slot Booked',         desc: 'Your time slot has been confirmed' },
      { key: 'checked_in', icon: '✅', label: 'Arrived & Checked In', desc: 'You have checked in at the Mandi gate' },
      { key: 'called',     icon: '📢', label: 'Called to Desk',       desc: b.desk_name ? `Called to ${b.desk_name}` : 'Your token has been called to the counter' },
      { key: 'completed',  icon: '⚖️', label: 'Procurement Done',     desc: b.receipt_number ? `Receipt: ${b.receipt_number}` : 'Weighment & quality check completed' },
      { key: 'paid',       icon: '💳', label: 'Payment Credited',     desc: b.dbt_reference_utr ? `UTR: ${b.dbt_reference_utr}` : 'DBT transfer to your bank account' }
    ];

    const statusOrder = ['booked', 'checked_in', 'called', 'completed'];
    const currentIdx = statusOrder.indexOf(b.booking_status);
    const isPaid = b.payment_status === 'credited';

    const stepsHtml = steps.map((step, i) => {
      const isDone = (i < currentIdx) || (step.key === 'paid' && isPaid) || (step.key === 'completed' && b.booking_status === 'completed');
      const isActive = (i === currentIdx && !isDone) || (step.key === 'paid' && b.payment_status === 'initiated');
      return `
        <div class="timeline-step ${isDone ? 'done' : isActive ? 'active' : 'pending'}">
          <div class="timeline-icon">${step.icon}</div>
          <div class="timeline-body">
            <div class="timeline-title">${step.label}</div>
            <div class="timeline-desc">${step.desc}</div>
            ${isDone ? `<div class="timeline-time">✓ Completed</div>` : isActive ? `<div class="timeline-time" style="color:#ca8a04;">● In Progress</div>` : '<div class="timeline-time" style="color:#cbd5e1;">○ Pending</div>'}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="progress-timeline">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <div style="font-size:0.72rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem;">Token</div>
            <div style="font-size:1.2rem;font-weight:900;color:#0f172a;font-family:monospace;">${b.token_number}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.72rem;color:#94a3b8;margin-bottom:0.25rem;">Farmer</div>
            <div style="font-weight:700;color:#0f172a;">${b.farmer_name}</div>
            <div style="font-size:0.78rem;color:#64748b;">${b.centre_name}</div>
          </div>
        </div>
        ${stepsHtml}
        ${b.total_payable_amount ? `
        <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #86efac;border-radius:0.75rem;padding:1rem;margin-top:1rem;text-align:center;">
          <div style="font-size:0.72rem;color:#94a3b8;margin-bottom:0.25rem;">TOTAL PAYABLE AMOUNT</div>
          <div style="font-size:2rem;font-weight:900;color:#16a34a;">₹${b.total_payable_amount.toLocaleString('en-IN')}</div>
          <div style="font-size:0.78rem;color:#64748b;margin-top:0.2rem;">${b.crop_name} • ${b.net_weight_quintals} Qtl</div>
        </div>
        ` : ''}

        <div style="margin-top:1.25rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="speakAnnouncement('टोकन नंबर ${b.token_number}, स्थिति: ${b.booking_status}')">
            🔊 स्थिति सुनें (Audio)
          </button>
          ${b.booking_status === 'booked' ? `
            <button type="button" class="btn btn-primary btn-sm" onclick="checkInToken('${b.id}')">
              ✅ Check-In at Mandi Gate
            </button>
          ` : ''}
          ${b.receipt_number ? `
            <a href="/receipt/${b.receipt_number}" target="_blank" class="btn btn-secondary btn-sm" style="color:#16a34a;">
              📄 View J-Form Receipt
            </a>
          ` : ''}
        </div>
      </div>
    `;
  } catch(e) {
    container.innerHTML = '<div class="empty-state"><span class="empty-state-icon">⚠️</span><div class="empty-state-title">Error</div><div class="empty-state-desc">Failed to fetch tracking info. Please try again.</div></div>';
  }
}

// ─── Payment Status ─────────────────────────────────
async function loadPaymentStatus() {
  if (!farmerSession) return;
  const container = document.getElementById('payment-cards-container');
  if (!container) return;

  try {
    const res = await fetch(`/api/farmer/track?phone=${farmerSession.phone}`);
    const data = await res.json();
    if (!data.success) return;

    const withPayment = (data.bookings || []).filter(b => b.receipt_number);
    if (!withPayment.length) {
      container.innerHTML = `<div class="empty-state"><span class="empty-state-icon">💳</span><div class="empty-state-title">No Payment Records Yet</div><div class="empty-state-desc">Payment details will appear here after your produce is weighed at the Mandi</div></div>`;
      return;
    }

    container.innerHTML = withPayment.map(b => {
      const isPaid = b.payment_status === 'credited';
      return `
        <div class="passbook-card">
          <div class="passbook-header">
            <div>
              <div style="font-size:0.72rem; color:#64748b; font-weight:700; text-transform:uppercase;">🏛️ Mandi Procurement DBT Credit</div>
              <div style="font-size:0.95rem; font-weight:800; color:#0f172a;">${b.crop_name} (${b.net_weight_quintals||'--'} Qtl)</div>
            </div>
            <div style="text-align:right;">
              <span style="display:inline-block; padding:0.3rem 0.75rem; border-radius:1rem; font-size:0.75rem; font-weight:800; background:${isPaid?'#dcfce7':'#fef9c3'}; color:${isPaid?'#15803d':'#854d0e'};">
                ${isPaid ? '✅ CREDITED TO BANK' : '⏳ PROCESSING'}
              </span>
            </div>
          </div>

          <div style="margin-bottom:0.85rem;">
            <div style="font-size:0.7rem; color:#64748b; text-transform:uppercase; font-weight:600;">Disbursed Amount (₹)</div>
            <div class="passbook-amount">₹${(b.total_payable_amount||0).toLocaleString('en-IN')}</div>
          </div>

          <div class="passbook-grid">
            <div>
              <span style="color:#64748b;">Receipt (J-Form):</span><br>
              <a href="/receipt/${b.receipt_number}" target="_blank" style="color:#16a34a; font-weight:800; text-decoration:underline;">
                📄 ${b.receipt_number} &nearr;
              </a>
            </div>
            <div>
              <span style="color:#64748b;">Digital Token:</span><br>
              <strong style="color:#0f172a; font-family:monospace;">${b.token_number}</strong>
            </div>
            <div>
              <span style="color:#64748b;">Mandi Centre:</span><br>
              <strong>${b.centre_name}</strong>
            </div>
            <div>
              <span style="color:#64748b;">PFMS / DBT UTR:</span><br>
              <strong style="font-family:monospace; color:#0f172a;">${b.dbt_reference_utr || 'PFMS-PENDING'}</strong>
              ${b.dbt_reference_utr ? `<button type="button" onclick="navigator.clipboard.writeText('${b.dbt_reference_utr}'); showToast('Copied','UTR copied to clipboard','success');" style="background:none; border:none; cursor:pointer; font-size:0.85rem; color:#2563eb; margin-left:4px;" title="Copy UTR" aria-label="Copy UTR">📋</button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch(e) { console.warn('Payment load error', e); }
}

// ─── Profile ────────────────────────────────────────
function populateProfile() {
  if (!farmerSession) return;
  const f = farmerSession;
  const el = id => document.getElementById(id);
  if (el('profile-name')) el('profile-name').textContent = f.full_name || '--';
  if (el('profile-kisan-id')) el('profile-kisan-id').textContent = `Kisan ID: ${f.kisan_id || '--'}`;
  if (el('profile-joined')) el('profile-joined').textContent = `Registered: ${f.created_at ? new Date(f.created_at).toLocaleDateString('en-IN') : '--'}`;
  if (el('profile-phone')) el('profile-phone').textContent = `+91 ${f.phone || '--'}`;
  if (el('profile-aadhaar')) el('profile-aadhaar').textContent = f.aadhaar_masked || '--';
  if (el('profile-state')) el('profile-state').textContent = f.state || '--';
  if (el('profile-location')) el('profile-location').textContent = `${f.district || '--'}${f.village ? ', ' + f.village : ''}`;
  if (el('profile-bank-acc')) el('profile-bank-acc').textContent = f.bank_account_no ? '•••• ' + f.bank_account_no.slice(-4) : '--';
  if (el('profile-ifsc')) el('profile-ifsc').textContent = `${f.bank_ifsc || '--'} (${f.bank_name || '--'})`;
  if (el('profile-upi')) el('profile-upi').textContent = f.upi_id || 'Not set';
  
  if (el('profile-doc-link')) {
    if (f.document_url) {
      el('profile-doc-link').innerHTML = `
        <a href="${f.document_url}" target="_blank" style="color:#22c55e; font-weight:700; display:inline-flex; align-items:center; gap:0.35rem; text-decoration:underline;">
          📄 View Verified Document (Supabase Storage) &nearr;
        </a>
      `;
    } else {
      el('profile-doc-link').textContent = 'No document attached';
    }
  }
}

// ─── Real-time Live Call Alert Modal ────────────────
function showCallAlertModal(token, deskName) {
  const existing = document.getElementById('farmer-call-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'farmer-call-modal';
  modal.style.cssText = `
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.85);
    z-index: 10000; display: flex; align-items: center; justify-content: center;
    padding: 1.5rem; backdrop-filter: blur(8px); animation: fadeIn 0.3s ease;
  `;

  modal.innerHTML = `
    <div style="background: linear-gradient(135deg, #0f172a, #1e293b); border: 2px solid #22c55e; border-radius: 1.25rem; max-width: 480px; width: 100%; padding: 2rem; text-align: center; color: white; box-shadow: 0 25px 50px -12px rgba(34,197,94,0.35);">
      <div style="font-size: 3.5rem; margin-bottom: 0.5rem; animation: bounce 1s infinite;">📢</div>
      <div style="font-size: 0.8rem; font-weight: 800; color: #4ade80; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.5rem;">
        ⚡ YOU ARE CALLED TO INSPECTION BAY!
      </div>
      <h2 style="font-size: 2rem; font-weight: 900; font-family: monospace; color: #fff; margin: 0.5rem 0;">
        ${token}
      </h2>
      <p style="font-size: 1.05rem; color: #cbd5e1; margin: 1rem 0 1.5rem;">
        Please proceed immediately to <strong>${deskName || 'Counter Bay'}</strong> for verification & weighing.
      </p>
      <button onclick="document.getElementById('farmer-call-modal').remove()" style="background: #22c55e; color: #0f172a; font-weight: 800; font-size: 1rem; border: none; padding: 0.85rem 2rem; border-radius: 0.6rem; cursor: pointer; width: 100%;">
        ✅ I am on my way to counter
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  // Audio Speech Announcement
  if ('speechSynthesis' in window) {
    try {
      const msg = new SpeechSynthesisUtterance(`Token ${token}, please proceed to ${deskName || 'Counter Desk'}`);
      msg.rate = 0.95;
      window.speechSynthesis.speak(msg);
    } catch(e) {}
  }
}

// ─── Real-time Updates (Supabase Realtime) ──────────
function initFarmerRealtime() {
  if (window.supabaseClient && farmerSession) {
    try {
      const channel = window.supabaseClient.channel('farmer-dashboard-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'slot_bookings', filter: `farmer_id=eq.${farmerSession.id}` }, payload => {
          console.log('[Supabase Realtime] Farmer slot_bookings change:', payload);
          loadSummaryStats();
          loadMyBookings();
          
          if (payload.new && payload.new.booking_status === 'called') {
            showCallAlertModal(payload.new.token_number, 'Assigned Counter Desk');
          } else if (payload.new && payload.new.booking_status === 'completed') {
            showToast('⚖️ Procurement weighment completed! Receipt generated.', 'success');
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_transactions', filter: `farmer_id=eq.${farmerSession.id}` }, payload => {
          console.log('[Supabase Realtime] Farmer payment change:', payload);
          loadSummaryStats();
          loadPaymentStatus();
          showToast('💰 Direct Benefit Transfer (DBT) updated!', 'success');
        })
        .subscribe((status) => {
          console.log('[Supabase Realtime] Farmer subscription status:', status);
        });
    } catch(e) {
      console.warn('Farmer Realtime init error:', e);
    }
  }
}

// ─── Event Listeners ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const qtyEl = document.getElementById('book-qty-input');
  if (qtyEl) qtyEl.addEventListener('input', updateMSPPreview);
  const vehicleEl = document.getElementById('book-vehicle-input');
  if (vehicleEl) vehicleEl.addEventListener('input', updateBookingPreview);
  const centreEl = document.getElementById('book-centre-select');
  if (centreEl) centreEl.addEventListener('change', updateBookingPreview);
  const dateEl = document.getElementById('book-date-input');
  if (dateEl) dateEl.addEventListener('change', updateBookingPreview);

  initFarmerRealtime();
});
