/* ===================================================
   SMARTPROCURE — Admin Dashboard JavaScript
   (Replaces admin.js for new /admin/dashboard route)
   =================================================== */

let adminSession = null;
let selectedStatusToken = null;
let selectedNewStatus = null;

// ─── Session & Auth Guard ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const raw = localStorage.getItem('smartprocure_admin');
  if (!raw) {
    window.location.href = '/admin/login';
    return;
  }
  adminSession = JSON.parse(raw);
  populateAdminHeader();
  loadAnalytics();
  loadAdminQueue();
  loadCompletedProcurements();

  // Auto-refresh queue every 15 seconds
  setInterval(loadAdminQueue, 15000);

  // SSE for real-time updates
  initSSE();
});

function logoutAdmin(e) {
  e.preventDefault();
  localStorage.removeItem('smartprocure_admin');
  window.location.href = '/admin/login';
}

// ─── Header Population ─────────────────────────────
function populateAdminHeader() {
  const a = adminSession;
  const nameEl = document.getElementById('admin-display-name');
  const roleEl = document.getElementById('admin-role-badge');
  const centreEl = document.getElementById('admin-centre-display');

  if (nameEl) nameEl.textContent = a.full_name || 'Admin';
  if (roleEl) roleEl.textContent = `Role: ${(a.role || 'operator').toUpperCase()}`;
  if (centreEl) centreEl.textContent = a.centre_name ? `📍 ${a.centre_name}` : '🏢 All Centres (Super Admin)';

  // Pre-select admin's centre if applicable
  if (a.centre_id) {
    const sel = document.getElementById('admin-centre-select');
    if (sel) sel.value = a.centre_id;
  }
}

// ─── Tab Switching ──────────────────────────────────
function switchAdminTab(tabName) {
  document.querySelectorAll('.dashboard-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.dashboard-tab-btn').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById('admin-panel-' + tabName);
  const btn = document.getElementById('admin-tab-btn-' + tabName);
  if (panel) panel.classList.add('active');
  if (btn) btn.classList.add('active');

  // Lazy load data when switching tabs
  if (tabName === 'analytics') loadAnalyticsCharts();
  if (tabName === 'queue') loadFullQueue();
  if (tabName === 'settlements') loadCompletedProcurements();
}

// ─── Analytics Summary ──────────────────────────────
async function loadAnalytics() {
  try {
    const res = await fetch('/api/analytics/summary');
    const data = await res.json();
    if (!data.success) return;
    const m = data.metrics;

    const el = id => document.getElementById(id);
    if (el('stat-total-farmers')) el('stat-total-farmers').textContent = m.total_registered_farmers.toLocaleString('en-IN');
    if (el('stat-total-bookings')) el('stat-total-bookings').textContent = m.total_slot_bookings.toLocaleString('en-IN');
    if (el('stat-total-quintals')) el('stat-total-quintals').textContent = m.total_procured_quintals.toLocaleString('en-IN') + ' Qtl';
    if (el('stat-total-payout')) el('stat-total-payout').textContent = '₹' + (m.total_payout_disbursed_inr / 100000).toFixed(2) + 'L';
  } catch(e) { console.warn('Analytics load error', e); }
}

function reloadAdminData() {
  loadAdminQueue();
  loadAnalytics();
  loadCompletedProcurements();
}

// ─── Live Queue ─────────────────────────────────────
async function loadAdminQueue() {
  const centreId = document.getElementById('admin-centre-select')?.value || 'CENTRE-01';
  try {
    const res = await fetch(`/api/queue/live?centre_id=${centreId}`);
    const data = await res.json();
    if (!data.success) return;

    const { queue, desks, stats } = data.data;

    // Update desks grid
    renderDesks(desks || []);

    // Update queue table (operations tab)
    renderQueueTable('live-queue-tbody', queue || []);

    // Update badge
    const badge = document.getElementById('badge-live-queue-count');
    const tabBadge = document.getElementById('admin-queue-count-badge');
    const count = (queue || []).length;
    if (badge) badge.textContent = count;
    if (tabBadge) tabBadge.textContent = count;
  } catch(e) { console.warn('Queue load error', e); }
}

async function loadFullQueue() {
  const centreId = document.getElementById('admin-centre-select')?.value || 'CENTRE-01';
  try {
    const res = await fetch(`/api/queue/live?centre_id=${centreId}`);
    const data = await res.json();
    if (!data.success) return;
    renderFullQueueTable('full-queue-tbody', data.data.queue || []);
  } catch(e) { console.warn('Full queue load error', e); }
}

function renderDesks(desks) {
  const grid = document.getElementById('admin-desks-grid');
  if (!grid) return;

  if (!desks.length) {
    grid.innerHTML = '<div style="color:#94a3b8;font-size:0.85rem;padding:1rem;">No desks configured for this centre</div>';
    return;
  }

  grid.innerHTML = desks.map(d => `
    <div class="desk-card ${d.status === 'active' ? 'active' : 'idle'}" onclick="callSpecificDesk('${d.id}')">
      <div class="desk-header">
        <span class="desk-number">Counter ${d.desk_number}</span>
        <span class="desk-status-dot ${d.status === 'active' ? 'active' : ''}"></span>
      </div>
      <div class="desk-name">${d.desk_name.split('-').slice(0,2).join('-').trim()}</div>
      <div class="desk-officer">${d.operator_name.split('(')[0].trim()}</div>
      ${d.current_token ? `
        <div class="desk-current-token">
          <span>NOW SERVING:</span>
          <strong>${d.current_token}</strong>
        </div>
      ` : '<div style="color:#94a3b8;font-size:0.78rem;margin-top:0.5rem;">Idle — Ready</div>'}
    </div>
  `).join('');
}

function renderQueueTable(tbodyId, queue) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (!queue.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#94a3b8;">No farmers currently in queue</td></tr>`;
    return;
  }
  tbody.innerHTML = queue.map((b, idx) => {
    const statusColors = { booked:'#dbeafe', checked_in:'#fef9c3', called:'#fed7aa', completed:'#dcfce7', cancelled:'#fee2e2' };
    const statusColor = statusColors[b.booking_status] || '#f1f5f9';
    return `
      <tr>
        <td><span style="font-family:monospace;font-weight:800;font-size:0.85rem;background:#0f172a;color:#4ade80;padding:0.25rem 0.6rem;border-radius:0.35rem;">${b.token_number}</span></td>
        <td>
          <div style="font-weight:700;font-size:0.88rem;">${b.farmer_name || '--'}</div>
          <div style="font-size:0.75rem;color:#64748b;">${b.farmer_phone || ''}</div>
        </td>
        <td style="font-size:0.85rem;">${b.crop_name || '--'}</td>
        <td style="font-size:0.82rem;">${b.time_slot || '--'}</td>
        <td><span style="background:${statusColor};color:#0f172a;font-size:0.7rem;font-weight:700;padding:0.2rem 0.5rem;border-radius:0.3rem;text-transform:uppercase;">${(b.booking_status||'').replace('_',' ')}</span></td>
        <td style="font-size:0.82rem;">
          ${b.desk_name ? `<span style="color:#d97706;font-weight:600;">${b.desk_name}</span>` : (b.booking_status === 'checked_in' ? `#${idx+1} in line` : '--')}
        </td>
        <td>
          <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
            ${b.booking_status === 'checked_in' ? `<button class="btn btn-primary btn-sm" onclick="callTokenToDesk('${b.token_number}')">📢 Call</button>` : ''}
            <button class="btn btn-secondary btn-sm" onclick="loadWeighbridgeToken('${b.token_number}')">⚖️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderFullQueueTable(tbodyId, queue) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (!queue.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:#94a3b8;">No bookings found for this centre</td></tr>`;
    return;
  }
  tbody.innerHTML = queue.map(b => `
    <tr>
      <td><span style="font-family:monospace;font-weight:800;font-size:0.85rem;">${b.token_number}</span></td>
      <td>
        <div style="font-weight:700;">${b.farmer_name || '--'}</div>
        <div style="font-size:0.75rem;color:#64748b;">${b.farmer_phone || ''}</div>
      </td>
      <td>${b.crop_name || '--'}</td>
      <td>${b.estimated_quantity_quintals || '--'} Qtl</td>
      <td>${b.time_slot || '--'}</td>
      <td><span class="booking-status-pill status-${b.booking_status}">${(b.booking_status||'').replace('_',' ')}</span></td>
      <td style="font-size:0.8rem;">${b.check_in_time ? new Date(b.check_in_time).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'}) : '--'}</td>
      <td>
        <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
          ${b.booking_status === 'checked_in' ? `<button class="btn btn-primary btn-sm" onclick="callTokenToDesk('${b.token_number}')">📢 Call</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="loadWeighbridgeToken('${b.token_number}')">⚖️ Weigh</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ─── Call Next Token ────────────────────────────────
async function callNextToken() {
  const centreId = document.getElementById('admin-centre-select')?.value || 'CENTRE-01';
  try {
    const res = await fetch('/api/admin/call-next', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ centre_id: centreId, desk_id: 'DESK-01' })
    });
    const data = await res.json();
    if (data.success) {
      showToast('📢 ' + data.message, 'success');
      loadAdminQueue();
    } else {
      showToast(data.error || 'No farmers in queue', 'error');
    }
  } catch(e) { showToast('Error calling next token', 'error'); }
}

async function callTokenToDesk(token) {
  const centreId = document.getElementById('admin-centre-select')?.value || 'CENTRE-01';
  try {
    const res = await fetch('/api/admin/call-next', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ centre_id: centreId, desk_id: 'DESK-01', token_number: token })
    });
    const data = await res.json();
    if (data.success) {
      showToast('📢 ' + data.message, 'success');
      loadAdminQueue();
    } else {
      showToast(data.error, 'error');
    }
  } catch(e) { showToast('Error', 'error'); }
}

async function callSpecificDesk(deskId) {
  const centreId = document.getElementById('admin-centre-select')?.value || 'CENTRE-01';
  try {
    const res = await fetch('/api/admin/call-next', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ centre_id: centreId, desk_id: deskId })
    });
    const data = await res.json();
    if (data.success) { showToast('📢 ' + data.message, 'success'); loadAdminQueue(); }
    else { showToast(data.error, 'error'); }
  } catch(e) { showToast('Error', 'error'); }
}

// ─── Weighbridge ────────────────────────────────────
function loadWeighbridgeToken(token) {
  switchAdminTab('weighbridge');
  document.getElementById('weigh-token-search').value = token;
  loadTokenForWeighment();
}

async function loadTokenForWeighment() {
  const token = document.getElementById('weigh-token-search')?.value.trim();
  if (!token) return showToast('Enter a token number', 'error');

  try {
    const res = await fetch(`/api/farmer/track?token=${token}`);
    const data = await res.json();
    if (!data.success) return showToast('Token not found', 'error');

    const b = data.booking;
    document.getElementById('procurement-token-hidden').value = token;
    document.getElementById('weigh-token-display').textContent = token;
    document.getElementById('weigh-farmer-name').textContent = `👤 ${b.farmer_name} — ${b.crop_name} • ${b.estimated_quantity_quintals} Qtl est.`;

    const infoBox = document.getElementById('weigh-token-info');
    if (infoBox) {
      infoBox.style.display = '';
      infoBox.innerHTML = `
        <div style="font-size:0.8rem;line-height:1.7;">
          <strong>🧑‍🌾 ${b.farmer_name}</strong> (${b.farmer_phone})<br>
          🌾 ${b.crop_name} &nbsp;|&nbsp; ${b.estimated_quantity_quintals} Qtl estimated<br>
          📅 ${b.booking_date} ${b.time_slot}<br>
          📊 MSP: ₹${parseFloat(b.msp_rate_per_quintal).toLocaleString('en-IN')}/Qtl
        </div>
      `;
    }
    updateScaleDisplay();
  } catch(e) { showToast('Error loading token', 'error'); }
}

function updateScaleDisplay() {
  const gross = parseFloat(document.getElementById('weigh-gross-kg')?.value || 0);
  const tare = parseFloat(document.getElementById('weigh-tare-kg')?.value || 0);
  const net = Math.max(0, gross - tare);
  const netEl = document.getElementById('scale-live-net-kg');
  const netQtl = (net / 100).toFixed(3);
  if (netEl) netEl.textContent = `${net.toLocaleString('en-IN')} kg`;
  if (document.getElementById('calc-net-qtl')) document.getElementById('calc-net-qtl').textContent = netQtl + ' Qtl';
}

async function handleWeighDocUpload(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const statusEl = document.getElementById('weigh-doc-status');
  if (statusEl) statusEl.innerHTML = `⏳ Uploading <strong>${file.name}</strong> to Supabase Storage...`;

  try {
    const url = await SupabaseAuth.uploadFile(file, 'weighbridge_slips');
    if (url) {
      document.getElementById('weigh-doc-url').value = url;
      if (statusEl) statusEl.innerHTML = `✅ <strong>${file.name}</strong> stored in Supabase Storage!`;
      showToast('Weighbridge slip uploaded to Supabase Storage!', 'success');
    }
  } catch(e) {
    if (statusEl) statusEl.textContent = `❌ Upload error: ${e.message}`;
    showToast('Failed to upload slip to storage.', 'error');
  }
}

async function recordProcurement(e) {
  e.preventDefault();
  const token = document.getElementById('procurement-token-hidden').value;
  if (!token) return showToast('Load a token first from the queue', 'error');

  const gross = parseFloat(document.getElementById('weigh-gross-kg').value);
  const tare = parseFloat(document.getElementById('weigh-tare-kg').value);
  const moisture = parseFloat(document.getElementById('weigh-moisture-pct').value);
  const grade = document.getElementById('weigh-quality-grade').value;
  const notes = document.getElementById('weigh-notes').value;
  const docUrl = document.getElementById('weigh-doc-url')?.value || '';

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = '⏳ Recording & Syncing with Supabase...';

  try {
    const res = await fetch('/api/procurement/record', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        token_number: token, gross_weight_kg: gross, tare_weight_kg: tare,
        moisture_percentage: moisture, quality_grade: grade, operator_notes: notes,
        document_url: docUrl,
        verified_by: adminSession.full_name || 'Procurement Officer'
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('✅ ' + data.message, 'success');
      loadAdminQueue();
      loadCompletedProcurements();
    } else {
      showToast(data.error, 'error');
    }
  } catch(ex) { showToast('Error recording procurement', 'error'); }
  btn.disabled = false; btn.textContent = '⚖️ Record Procurement & Issue Digital J-Form Receipt';
}

// ─── Status Update ──────────────────────────────────
async function lookupStatusToken() {
  const token = document.getElementById('status-token-input')?.value.trim();
  if (!token) return showToast('Enter a token number', 'error');

  try {
    const res = await fetch(`/api/farmer/track?token=${token}`);
    const data = await res.json();
    if (!data.success) return showToast('Token not found', 'error');

    const b = data.booking;
    selectedStatusToken = token;

    const infoBox = document.getElementById('status-booking-info');
    infoBox.style.display = '';
    infoBox.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
        <div>
          <div style="font-weight:800;font-size:0.9rem;">${b.token_number}</div>
          <div style="font-size:0.8rem;color:#64748b;">👤 ${b.farmer_name} &nbsp;|&nbsp; 🌾 ${b.crop_name} &nbsp;|&nbsp; 📅 ${b.booking_date}</div>
        </div>
        <span class="booking-status-pill status-${b.booking_status}">${(b.booking_status||'').replace('_',' ').toUpperCase()}</span>
      </div>
    `;

    document.getElementById('status-steps-grid').style.display = 'grid';
    document.getElementById('status-update-action').style.display = '';

    // Mark current status
    document.querySelectorAll('.status-step-btn').forEach(btn => btn.classList.remove('selected'));
    const curBtn = document.querySelector(`[data-status="${b.booking_status}"]`);
    if (curBtn) curBtn.classList.add('selected');
  } catch(e) { showToast('Error looking up token', 'error'); }
}

function selectStatus(status) {
  document.querySelectorAll('.status-step-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.querySelector(`[data-status="${status}"]`);
  if (btn) btn.classList.add('selected');
  selectedNewStatus = status;
}

async function applyStatusUpdate() {
  if (!selectedStatusToken) return showToast('Please look up a token first', 'error');
  if (!selectedNewStatus) return showToast('Please select a new status', 'error');

  // If moving to checked_in, use the check-in endpoint
  if (selectedNewStatus === 'checked_in') {
    try {
      const res = await fetch(`/api/bookings/${selectedStatusToken}/check-in`, { method: 'POST' });
      const data = await res.json();
      if (data.success) { showToast('✅ Status updated: Checked In', 'success'); loadAdminQueue(); }
      else showToast(data.error, 'error');
    } catch(e) { showToast('Error', 'error'); }
    return;
  }

  // For other status changes, call next
  if (selectedNewStatus === 'called') {
    await callTokenToDesk(selectedStatusToken);
    return;
  }

  showToast(`Status "${selectedNewStatus.replace('_',' ')}" selected. Use Weighbridge to complete procurement.`, 'info');
}

// ─── Completed Procurements & DBT ───────────────────
async function loadCompletedProcurements() {
  const centreId = document.getElementById('admin-centre-select')?.value || 'CENTRE-01';
  try {
    const res = await fetch(`/api/queue/live?centre_id=${centreId}`);
    const data = await res.json();
    const completed = (data.data?.queue || []).filter(b => b.booking_status === 'completed' || b.receipt_number);

    const tbody = document.getElementById('completed-procurements-tbody');
    if (!tbody) return;

    if (!completed.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8;">No completed procurements yet today</td></tr>`;
      return;
    }

    tbody.innerHTML = completed.map(b => {
      const isPaid = b.payment_status === 'credited';
      return `
        <tr>
          <td><span style="font-family:monospace;font-weight:800;">${b.token_number}</span></td>
          <td>
            <div style="font-weight:700;">${b.farmer_name || '--'}</div>
            <div style="font-size:0.75rem;color:#64748b;">${b.farmer_phone || ''}</div>
          </td>
          <td>${b.crop_name || '--'}</td>
          <td>${b.net_weight_quintals ? b.net_weight_quintals + ' Qtl' : '--'}</td>
          <td style="font-weight:700;color:#0f172a;">${b.total_payable_amount ? '₹'+b.total_payable_amount.toLocaleString('en-IN') : '--'}</td>
          <td>
            ${isPaid
              ? `<span style="background:#dcfce7;color:#15803d;font-size:0.72rem;font-weight:700;padding:0.25rem 0.6rem;border-radius:0.4rem;">✅ CREDITED</span>`
              : b.receipt_number
                ? `<button class="btn btn-primary btn-sm" onclick="processDBTPayout('${b.receipt_number}')">💸 Process DBT</button>`
                : `<span style="color:#94a3b8;font-size:0.8rem;">Awaiting weighment</span>`
            }
            ${b.receipt_number ? `<a href="/receipt/${b.receipt_number}" target="_blank" class="btn btn-secondary btn-sm" style="margin-left:0.35rem;">📄</a>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  } catch(e) { console.warn('Completed procurements error', e); }
}

async function processDBTPayout(receiptNumber) {
  try {
    const res = await fetch('/api/procurement/payout', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ receipt_number: receiptNumber })
    });
    const data = await res.json();
    if (data.success) {
      showToast('💸 ' + data.message, 'success');
      loadCompletedProcurements();
      loadAnalytics();
    } else {
      showToast(data.error, 'error');
    }
  } catch(e) { showToast('DBT processing error', 'error'); }
}

// ─── Analytics Charts ───────────────────────────────
async function loadAnalyticsCharts() {
  try {
    const res = await fetch('/api/analytics/summary');
    const data = await res.json();
    if (!data.success) return;
    const m = data.metrics;

    const kpiEl = document.getElementById('kpi-display');
    if (kpiEl) {
      kpiEl.innerHTML = [
        { label: 'Avg Mandi Turnaround', value: '~14 mins', icon: '⏱️', color: '#dbeafe' },
        { label: 'Queue Wait Reduction', value: m.time_reduction_percentage?.split('%')[0] + '%' || '68%', icon: '📉', color: '#dcfce7' },
        { label: 'Crowding Eliminated', value: '91%', icon: '👥', color: '#fef9c3' },
        { label: 'DBT Transfers Done', value: m.dbt_transfers_settled, icon: '💳', color: '#f3e8ff' },
        { label: 'Total Procurements', value: m.total_procurements, icon: '⚖️', color: '#ffe4e6' },
        { label: 'Registered Farmers', value: m.total_registered_farmers, icon: '👨‍🌾', color: '#ecfdf5' },
      ].map(k => `
        <div style="background:${k.color};border-radius:0.75rem;padding:1.25rem;text-align:center;">
          <div style="font-size:1.75rem;">${k.icon}</div>
          <div style="font-size:1.3rem;font-weight:900;color:#0f172a;margin-top:0.3rem;">${k.value}</div>
          <div style="font-size:0.72rem;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;margin-top:0.15rem;">${k.label}</div>
        </div>
      `).join('');
    }
  } catch(e) { console.warn('Analytics charts error', e); }
}

// ─── Real-time Updates (Supabase Realtime) ──────────
function initSSE() {
  if (window.supabaseClient) {
    try {
      const channel = window.supabaseClient.channel('admin-dashboard-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'slot_bookings' }, payload => {
          console.log('[Supabase Realtime] slot_bookings change:', payload);
          loadAdminQueue();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'counter_desks' }, payload => {
          console.log('[Supabase Realtime] counter_desks change:', payload);
          loadAdminQueue();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'procurement_records' }, payload => {
          console.log('[Supabase Realtime] procurement_records change:', payload);
          loadCompletedProcurements();
          loadAnalytics();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_transactions' }, payload => {
          console.log('[Supabase Realtime] payment_transactions change:', payload);
          loadCompletedProcurements();
          loadAnalytics();
        })
        .subscribe((status) => {
          console.log('[Supabase Realtime] Channel status:', status);
        });
    } catch(e) {
      console.warn('Supabase Realtime init error:', e);
    }
  }
}
