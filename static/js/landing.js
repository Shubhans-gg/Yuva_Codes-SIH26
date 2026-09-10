/* ===================================================
   SMARTPROCURE — Landing Page JavaScript
   =================================================== */

let leafletMap, leafletMarkers = [];

// ─── Particle Animation (Skipped on mobile to save budget phone CPU & battery) ────
function createParticles() {
  if (window.innerWidth <= 768) return; // Prevent battery drain on budget devices
  const container = document.getElementById('hero-particles');
  if (!container) return;
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('div');
    p.className = 'hero-particle';
    const size = Math.random() * 70 + 25;
    const colors = ['rgba(34,197,94', 'rgba(59,130,246', 'rgba(167,243,208', 'rgba(255,255,255'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${Math.random() * 100}%;
      background: radial-gradient(circle, ${color},0.35) 0%, ${color},0) 70%);
      animation-duration: ${Math.random() * 10 + 8}s;
      animation-delay: ${Math.random() * 6}s;
    `;
    container.appendChild(p);
  }
}

// ─── MSP Ticker ────────────────────────────────────
async function loadMSPTicker() {
  try {
    const res = await fetch('/api/crops');
    const data = await res.json();
    if (!data.success || !data.crops.length) return;

    const track = document.getElementById('msp-ticker-track');
    if (!track) return;

    // Create duplicate for seamless loop
    const items = data.crops.map(crop => `
      <div class="ticker-item">
        <span class="ticker-crop-name">${crop.crop_name}</span>
        <span class="ticker-crop-hindi">${crop.hindi_name}</span>
        <span class="ticker-msp">₹${crop.msp_rate_per_quintal.toLocaleString('en-IN')}/Qtl</span>
        <span class="ticker-category">${crop.category}</span>
      </div>
    `).join('');

    // Double for infinite scroll
    track.innerHTML = items + items;
  } catch(e) { console.warn('Ticker load failed', e); }
}

// ─── Mobile Map / List View Toggle ─────────────────
function setMobileMapView(mode) {
  const grid = document.querySelector('.map-container-grid');
  const btnList = document.getElementById('btn-view-list');
  const btnMap = document.getElementById('btn-view-map');
  if (!grid) return;

  if (mode === 'map') {
    grid.classList.remove('view-list');
    grid.classList.add('view-map');
    if (btnMap) btnMap.classList.add('active');
    if (btnList) btnList.classList.remove('active');
    if (leafletMap) {
      setTimeout(() => leafletMap.invalidateSize(), 200);
    }
  } else {
    grid.classList.remove('view-map');
    grid.classList.add('view-list');
    if (btnList) btnList.classList.add('active');
    if (btnMap) btnMap.classList.remove('active');
  }
}

// ─── Leaflet Map ────────────────────────────────────
function initMap() {
  if (!document.getElementById('leaflet-map')) return;

  const isMobile = window.innerWidth <= 768;
  const grid = document.querySelector('.map-container-grid');
  if (isMobile && grid) {
    grid.classList.add('view-list'); // Default to clean list on mobile
  }

  leafletMap = L.map('leaflet-map', {
    scrollWheelZoom: !isMobile, // Prevents gesture trapping on mobile scroll
    touchZoom: true
  }).setView([22.5, 80.5], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(leafletMap);

  // Custom green marker icon
  const greenIcon = L.divIcon({
    className: '',
    html: `<div style="
      background: linear-gradient(135deg, #16a34a, #22c55e);
      color: white; font-size: 1.1rem; width: 36px; height: 36px;
      border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    "><span style="transform: rotate(45deg);">🌾</span></div>`,
    iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36]
  });

  // Plot all centres from server-side data
  if (typeof CENTRES_DATA !== 'undefined') {
    CENTRES_DATA.forEach(centre => {
      if (!centre.latitude || !centre.longitude) return;

      const marker = L.marker([centre.latitude, centre.longitude], { icon: greenIcon })
        .addTo(leafletMap)
        .bindPopup(`
          <div class="map-popup-content">
            <div class="map-popup-name">🌾 ${centre.name}</div>
            <div class="map-popup-addr">📍 ${centre.location_address}</div>
            <div class="map-popup-caps">
              ${centre.daily_capacity} slots/day &nbsp;•&nbsp;
              ${centre.active_counters} counters &nbsp;•&nbsp;
              ${centre.opening_time} – ${centre.closing_time}
            </div>
            <div style="margin-top: 0.5rem;">
              <a href="/farmer/login" style="
                background: #16a34a; color: white; padding: 0.35rem 0.8rem;
                border-radius: 0.4rem; font-size: 0.75rem; font-weight: 700;
                text-decoration: none; display: inline-block;
              ">📋 Book Slot Here</a>
            </div>
          </div>
        `);

      leafletMarkers.push({ id: centre.id, marker, centre });
    });
  }
}

function focusMapCentre(centreId, lat, lng) {
  if (window.innerWidth <= 768) {
    setMobileMapView('map');
  }

  if (!leafletMap) return;
  setTimeout(() => {
    leafletMap.flyTo([lat, lng], 13, { duration: 1.2 });
    const found = leafletMarkers.find(m => m.id === centreId);
    if (found) found.marker.openPopup();
  }, 150);

  // Highlight in list
  document.querySelectorAll('.centre-list-item').forEach(el => {
    el.style.background = '';
    el.style.borderLeft = '';
  });
  const item = document.getElementById('centre-list-' + centreId);
  if (item) {
    item.style.background = '#f0fdf4';
    item.style.borderLeft = '3px solid #16a34a';
    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ─── Geolocation ───────────────────────────────────
function geoLocateMe() {
  const btn = document.getElementById('btn-geolocate');
  if (!navigator.geolocation) return showToast('Geolocation not supported', 'error');
  btn.textContent = '📡 Locating...';
  btn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      if (leafletMap) {
        leafletMap.flyTo([latitude, longitude], 10, { duration: 1.5 });
        L.circle([latitude, longitude], { radius: 15000, color: '#16a34a', fillOpacity: 0.08 }).addTo(leafletMap);
        L.marker([latitude, longitude], {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:#3b82f6;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:0.85rem;">📍</div>`,
            iconSize: [28, 28], iconAnchor: [14, 14]
          })
        }).addTo(leafletMap).bindPopup('📍 Your Location').openPopup();
      }
      showToast('📍 Location found! Showing nearby centres.', 'success');
      btn.textContent = '📍 Use My Location'; btn.disabled = false;
    },
    err => {
      showToast('Could not access location. Please allow location access.', 'error');
      btn.textContent = '📍 Use My Location'; btn.disabled = false;
    }
  );
}

// ─── Nominatim Search ──────────────────────────────
async function searchMapLocation() {
  const query = document.getElementById('map-search-input').value.trim();
  if (!query) return showToast('Please enter a city or district to search', 'error');

  const btn = document.getElementById('btn-search-map');
  btn.textContent = '🔍 Searching...'; btn.disabled = true;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' India')}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const results = await res.json();
    if (results.length > 0) {
      const { lat, lon, display_name } = results[0];
      if (leafletMap) {
        leafletMap.flyTo([parseFloat(lat), parseFloat(lon)], 11, { duration: 1.5 });
        showToast(`📍 Showing centres near ${display_name.split(',')[0]}`, 'success');
      }
    } else {
      showToast('Location not found. Try a broader search term.', 'error');
    }
  } catch(e) {
    showToast('Search failed. Please check your internet connection.', 'error');
  }
  btn.textContent = '🔍 Search'; btn.disabled = false;
}

// ─── Live Analytics Counter ─────────────────────────
async function loadHeroStats() {
  try {
    const res = await fetch('/api/analytics/summary');
    const data = await res.json();
    if (data.success) {
      const m = data.metrics;
      const el = document.getElementById('stat-farmers-count');
      if (el) el.textContent = m.total_registered_farmers.toLocaleString('en-IN') + '+';
    }
  } catch(e) { /* silent */ }
}

// ─── Enter key for search ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  loadMSPTicker();
  initMap();
  loadHeroStats();

  const searchInput = document.getElementById('map-search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') searchMapLocation();
    });
  }
});
