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
    scrollWheelZoom: !isMobile,
    touchZoom: true
  }).setView([22.5, 78.9], 5);

  // 100% Free OpenStreetMap tile layer (No API key, No watermarks)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(leafletMap);

  // Trigger map resize recalculations
  [100, 300, 800, 1500].forEach(delay => {
    setTimeout(() => {
      if (leafletMap) leafletMap.invalidateSize();
    }, delay);
  });

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
  renderCentresMapAndList(typeof CENTRES_DATA !== 'undefined' ? CENTRES_DATA : []);

  // Auto-fit map bounds to encompass all centres
  if (leafletMarkers.length > 0) {
    const group = L.featureGroup(leafletMarkers.map(m => m.marker));
    leafletMap.fitBounds(group.getBounds().pad(0.15));
  }

}

function renderCentresMapAndList(centresList, userLat = null, userLng = null) {
  if (!leafletMap) return;

  // Clear existing markers
  leafletMarkers.forEach(m => leafletMap.removeLayer(m.marker));
  leafletMarkers = [];

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

  const listContainer = document.getElementById('centres-list-container');
  if (listContainer) {
    listContainer.innerHTML = '';
  }

  const countBadge = document.getElementById('centres-count-badge');
  if (countBadge) countBadge.textContent = `${centresList.length} centres`;

  const mobCount = document.getElementById('mob-centre-count');
  if (mobCount) mobCount.textContent = centresList.length;

  centresList.forEach((centre, index) => {
    if (!centre.latitude || !centre.longitude) return;

    const gmapsUrl = centre.google_maps_url || `https://www.google.com/maps/dir/?api=1&destination=${centre.latitude},${centre.longitude}`;
    const distText = centre.distance_km != null ? `⚡ ${centre.distance_km} km away` : '';
    const waitText = centre.estimated_wait_mins ? `🟢 Wait: ${centre.estimated_wait_mins}` : '🟢 Low Queue';

    // 1. Leaflet Marker & Popup
    const popupHtml = `
      <div class="map-popup-content">
        <div class="map-popup-name">🌾 ${centre.name}</div>
        <div class="map-popup-addr">📍 ${centre.location_address}</div>
        ${distText ? `<div style="font-size: 0.72rem; font-weight: 700; color: #0284c7; margin: 0.25rem 0;">${distText}</div>` : ''}
        <div style="margin-top: 0.6rem; display: flex; gap: 0.5rem; justify-content: space-between; align-items: center;">
          <a href="${gmapsUrl}" target="_blank" class="btn-directions-clean">📍 Directions</a>
          <a href="/farmer/login" onclick="bookSlotForCentre('${centre.id}', event)" class="btn-book-clean">Book Slot →</a>
        </div>
      </div>
    `;

    const marker = L.marker([centre.latitude, centre.longitude], { icon: greenIcon })
      .addTo(leafletMap)
      .bindPopup(popupHtml);

    leafletMarkers.push({ id: centre.id, marker, centre });

    // 2. Render List Item
    if (listContainer) {
      const itemEl = document.createElement('div');
      itemEl.className = 'centre-list-item';
      itemEl.id = `centre-list-${centre.id}`;
      itemEl.tabIndex = 0;
      itemEl.onclick = () => focusMapCentre(centre.id, centre.latitude, centre.longitude);

      itemEl.innerHTML = `
        <div class="centre-item-top">
          <div class="centre-item-name">${index === 0 && distText ? '⭐ NEAREST: ' : ''}${centre.name}</div>
          <div class="centre-item-status-wrap">
            ${distText ? `<span class="dist-badge">${distText}</span>` : ''}
            <span class="centre-queue-pill">${waitText}</span>
          </div>
        </div>
        <div class="centre-item-address">📍 ${centre.location_address}</div>
        <div class="centre-item-actions">
          <a href="${gmapsUrl}" target="_blank" onclick="event.stopPropagation()" class="btn-directions-clean">
            📍 Directions
          </a>
          <a href="/farmer/login" onclick="bookSlotForCentre('${centre.id}', event)" class="btn-book-clean">
            Book Slot →
          </a>
        </div>
      `;
      listContainer.appendChild(itemEl);
    }
  });
}

function bookSlotForCentre(centreId, e) {
  if (e) {
    e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
  }
  try {
    sessionStorage.setItem('smartprocure_preselect_centre', centreId);
    localStorage.setItem('smartprocure_preselect_centre', centreId);
  } catch (err) {}

  const isLoggedIn = localStorage.getItem('smartprocure_farmer');
  if (isLoggedIn) {
    window.location.href = `/farmer/dashboard?centre_id=${encodeURIComponent(centreId)}#book`;
  } else {
    window.location.href = `/farmer/login?centre_id=${encodeURIComponent(centreId)}`;
  }
}

async function fetchAndUpdateNearestCentres(lat, lng) {
  try {
    const cropId = document.getElementById('map-crop-filter')?.value || '';
    const url = `/api/centres/nearest?lat=${lat}&lng=${lng}${cropId ? '&crop_id=' + cropId : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.success && data.centres.length > 0) {
      renderCentresMapAndList(data.centres, lat, lng);
    }
  } catch (e) {
    console.warn('Failed to fetch nearest centres API', e);
  }
}

function filterCentresByCrop() {
  const cropId = document.getElementById('map-crop-filter')?.value;
  if (!cropId) {
    renderCentresMapAndList(typeof CENTRES_DATA !== 'undefined' ? CENTRES_DATA : []);
    return;
  }
  showToast('🌾 Filtering procurement centres accepting selected crop...', 'info');
  // Re-render
  renderCentresMapAndList(typeof CENTRES_DATA !== 'undefined' ? CENTRES_DATA : []);
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
    async pos => {
      const { latitude, longitude } = pos.coords;
      if (leafletMap) {
        leafletMap.flyTo([latitude, longitude], 9, { duration: 1.5 });
        L.circle([latitude, longitude], { radius: 25000, color: '#16a34a', fillOpacity: 0.08 }).addTo(leafletMap);
        L.marker([latitude, longitude], {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:#3b82f6;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:0.9rem;">📍</div>`,
            iconSize: [30, 30], iconAnchor: [15, 15]
          })
        }).addTo(leafletMap).bindPopup('📍 Your Current Location').openPopup();
      }
      await fetchAndUpdateNearestCentres(latitude, longitude);
      showToast('📍 Location found! Centres sorted by distance.', 'success');
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
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lon);
      if (leafletMap) {
        leafletMap.flyTo([userLat, userLng], 9, { duration: 1.5 });
      }
      await fetchAndUpdateNearestCentres(userLat, userLng);
      showToast(`📍 Showing centres sorted by distance from ${display_name.split(',')[0]}`, 'success');
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

// ─── Crop Grid Expansion Toggle ──────────────────────
let isAllCropsShown = false;

function toggleShowAllCrops() {
  const hiddenCards = document.querySelectorAll('.crop-price-card.crop-card-hidden');
  const btn = document.getElementById('btn-toggle-crops');
  const txt = document.getElementById('lbl-toggle-crops-text');
  const icon = document.getElementById('lbl-toggle-crops-icon');
  const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'en';

  isAllCropsShown = !isAllCropsShown;

  hiddenCards.forEach(card => {
    if (isAllCropsShown) {
      card.style.display = 'flex';
      card.classList.add('animate-fade-in');
    } else {
      card.style.display = 'none';
      card.classList.remove('animate-fade-in');
    }
  });

  if (btn) {
    if (isAllCropsShown) {
      btn.classList.add('expanded');
      if (icon) icon.textContent = '↑';
      if (txt) {
        txt.setAttribute('data-i18n', 'btn_show_less_crops');
        txt.textContent = (typeof I18N !== 'undefined' && I18N[currentLang] && I18N[currentLang].btn_show_less_crops)
          ? I18N[currentLang].btn_show_less_crops
          : 'Show Less';
      }
    } else {
      btn.classList.remove('expanded');
      if (icon) icon.textContent = '↓';
      if (txt) {
        txt.setAttribute('data-i18n', 'btn_show_all_crops');
        txt.textContent = (typeof I18N !== 'undefined' && I18N[currentLang] && I18N[currentLang].btn_show_all_crops)
          ? I18N[currentLang].btn_show_all_crops
          : 'Show All';
      }
      const grid = document.getElementById('crop-prices-grid');
      if (grid) {
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
}

// ─── Landing Page Track Progress ────────────────────
let currentLandingTrackQuery = '';
let currentLandingBookingsData = null;

async function trackLandingToken(queryOverride = null) {
  const input = document.getElementById('landing-track-input');
  const btn = document.getElementById('landing-track-btn');
  const container = document.getElementById('landing-track-result');
  if (!container) return;

  const rawQuery = queryOverride !== null ? queryOverride : (input ? input.value.trim() : '');
  if (!rawQuery) {
    const isHi = typeof currentLang !== 'undefined' && currentLang === 'hi';
    container.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 2.5rem 1rem; background: #f8fafc; border-radius: 1rem; border: 1px dashed #cbd5e1;">
        <span class="empty-state-icon" style="font-size: 2.5rem; display: block; margin-bottom: 0.75rem;">🎫</span>
        <div class="empty-state-title" style="font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-bottom: 0.4rem;">${isHi ? 'टोकन नंबर दर्ज करें' : 'Enter Token Number'}</div>
        <div class="empty-state-desc" style="font-size: 0.9rem; color: #64748b; max-width: 480px; margin: 0 auto;">${isHi ? 'लाइव स्थिति देखने के लिए ऊपर अपना टोकन नंबर दर्ज करें।' : 'Enter your token number above to track progress live.'}</div>
      </div>
    `;
    return;
  }

  currentLandingTrackQuery = rawQuery;
  const isHi = typeof currentLang !== 'undefined' && currentLang === 'hi';

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>⏳ ${isHi ? 'खोज जारी है...' : 'Fetching...'}</span>`;
  }
  container.innerHTML = `<div style="text-align:center; padding: 2.5rem; color:#64748b; font-weight:600;">⏳ ${isHi ? 'लाइव प्रगति प्राप्त की जा रही है...' : 'Fetching live queue progress...'}</div>`;

  try {
    const res = await fetch(`/api/farmer/track?token=${encodeURIComponent(rawQuery)}`);
    const data = await res.json();

    if (!data.success || !data.booking) {
      container.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 2.5rem 1rem; background: #fef2f2; border-radius: 1rem; border: 1px solid #fca5a5;">
          <span class="empty-state-icon" style="font-size: 2.5rem; display: block; margin-bottom: 0.75rem;">❌</span>
          <div class="empty-state-title" style="font-size: 1.1rem; font-weight: 800; color: #991b1b; margin-bottom: 0.4rem;">${isHi ? 'टोकन नहीं मिला' : 'Token Not Found'}</div>
          <div class="empty-state-desc" style="font-size: 0.9rem; color: #b91c1c; max-width: 480px; margin: 0 auto;">${isHi ? `"${rawQuery}" के लिए कोई बुकिंग नहीं मिली। कृपया टोकन नंबर जांचें।` : `No booking found for token "${rawQuery}". Please verify your token number.`}</div>
        </div>
      `;
      return;
    }

    currentLandingBookingsData = data;
    renderLandingTrackResults(data);

  } catch (e) {
    container.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 2.5rem 1rem; background: #fffbebfb; border-radius: 1rem; border: 1px solid #fcd34d;">
        <span class="empty-state-icon" style="font-size: 2.5rem; display: block; margin-bottom: 0.75rem;">⚠️</span>
        <div class="empty-state-title" style="font-size: 1.1rem; font-weight: 800; color: #92400e; margin-bottom: 0.4rem;">${isHi ? 'कनेक्शन त्रुटि' : 'Network Error'}</div>
        <div class="empty-state-desc" style="font-size: 0.9rem; color: #b45309; max-width: 480px; margin: 0 auto;">${isHi ? 'प्रगति लोड करने में विफलता। कृपया पुनः प्रयास करें।' : 'Failed to fetch status. Please check connection and try again.'}</div>
      </div>
    `;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span data-i18n="track_btn_search">${isHi ? '🔍 स्थिति देखें' : '🔍 Track Progress'}</span>`;
    }
  }
}

function renderLandingTrackResults(data) {
  const container = document.getElementById('landing-track-result');
  if (!container) return;

  const isHi = typeof currentLang !== 'undefined' && currentLang === 'hi';
  const b = data ? data.booking : null;
  if (!b) return;

  const isCancelled = b.booking_status === 'cancelled';

  const steps = [
    { key: 'booked', icon: isCancelled ? '🚫' : '📋', label: isHi ? 'स्लॉट बुक हुआ' : 'Slot Booked', desc: isCancelled ? (isHi ? 'यह बुकिंग रद्द कर दी गई है' : 'This booking slot has been cancelled') : (isHi ? 'आपका स्लॉट सफलतापूर्वक कंफर्म हो गया है' : 'Your time slot has been confirmed') },
    { key: 'checked_in', icon: '✅', label: isHi ? 'मंडी आगमन व चेक-इन' : 'Arrived & Checked In', desc: isHi ? 'मंडी गेट पर चेक-इन' : 'Checked in at Mandi gate' },
    { key: 'called', icon: '📢', label: isHi ? 'काउंटर पर बुलावा' : 'Called to Desk', desc: b.desk_name ? (isHi ? `${b.desk_name} पर आएं` : `Proceed to ${b.desk_name}`) : (isHi ? 'आपका टोकन नंबर काउंटर पर पुकारा गया है' : 'Your token has been called to the counter') },
    { key: 'completed', icon: '⚖️', label: isHi ? 'तौल व गुणवत्ता पूर्ण' : 'Procurement Done', desc: b.receipt_number ? (isHi ? `जे-फॉर्म रसीद: ${b.receipt_number}` : `Receipt: ${b.receipt_number}`) : (isHi ? 'वजन और गुणवत्ता की जांच पूर्ण' : 'Weighment & quality check completed') },
    { key: 'paid', icon: '💳', label: isHi ? 'बैंक खाते में भुगतान' : 'Payment Credited', desc: b.dbt_reference_utr ? `UTR: ${b.dbt_reference_utr}` : (isHi ? 'आपके बैंक खाते में सीधी DBT राशि हस्तांतरण' : 'Direct DBT transfer to your bank account') }
  ];

  const statusOrder = ['booked', 'checked_in', 'called', 'completed'];
  const currentIdx = statusOrder.indexOf(b.booking_status);
  const isPaid = b.payment_status === 'credited';

  let liveBannerHtml = '';
  if (isCancelled) {
    liveBannerHtml = `
      <div style="background: linear-gradient(135deg, #ef4444, #991b1b); color: white; border-radius: 0.75rem; padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);">
        <span style="font-size: 1.6rem;">🚫</span>
        <div>
          <div style="font-size: 1.1rem; font-weight: 800;">${isHi ? 'बुकिंग रद्द कर दी गई है' : 'Booking Cancelled'}</div>
          <div style="font-size: 0.82rem; opacity: 0.9;">${isHi ? 'यह टोकन नंबर रद्द कर दिया गया है और अब वैध नहीं है।' : 'This booking token has been cancelled and is no longer active in the queue.'}</div>
        </div>
      </div>
    `;
  } else if (b.booking_status === 'checked_in') {
    const pos = b.queue_position || 1;
    const wait = b.estimated_wait_minutes !== undefined ? b.estimated_wait_minutes : (pos - 1) * 10;
    liveBannerHtml = `
      <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; border-radius: 0.75rem; padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);">
        <div>
          <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.9;">${isHi ? '🔴 लाइव कतार स्थान' : '🔴 LIVE QUEUE POSITION'}</div>
          <div style="font-size: 1.4rem; font-weight: 900;">${isHi ? `लाइन में नंबर #${pos}` : `#${pos} in Line`}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.9;">${isHi ? '⏱️ अनुमानित प्रतीक्षा समय' : '⏱️ ESTIMATED WAIT'}</div>
          <div style="font-size: 1.4rem; font-weight: 900;">${wait > 0 ? `~${wait} ${isHi ? 'मिनट' : 'mins'}` : (isHi ? 'अगला नंबर आपका' : 'Next Up')}</div>
        </div>
      </div>
    `;
  } else if (b.booking_status === 'called') {
    liveBannerHtml = `
      <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border-radius: 0.75rem; padding: 1rem 1.25rem; margin-bottom: 1.5rem; text-align: center; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
        <div style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;">📢 ${isHi ? 'तुरंत काउंटर पर पहुंचें!' : 'YOUR TOKEN IS CALLED!'}</div>
        <div style="font-size: 1.3rem; font-weight: 900; margin-top: 0.2rem;">${b.desk_name ? (isHi ? `${b.desk_name} पर जाएं` : `Please proceed to ${b.desk_name}`) : (isHi ? 'कृपया खरीद काउंटर पर उपस्थित हों' : 'Please proceed to counter')}</div>
      </div>
    `;
  } else if (b.booking_status === 'completed') {
    liveBannerHtml = `
      <div style="background: linear-gradient(135deg, #059669, #047857); color: white; border-radius: 0.75rem; padding: 0.85rem 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
        <span style="font-size: 1.5rem;">🎉</span>
        <div>
          <div style="font-weight: 800; font-size: 1rem;">${isHi ? 'खरीद प्रक्रिया पूर्ण हो गई है!' : 'Procurement Completed!'}</div>
          <div style="font-size: 0.8rem; opacity: 0.9;">${isHi ? 'डिजिटल जे-फॉर्म रसीद जारी कर दी गई है।' : 'Digital J-Form receipt generated & payment sent via DBT.'}</div>
        </div>
      </div>
    `;
  } else if (b.booking_status === 'booked') {
    liveBannerHtml = `
      <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border-radius: 0.75rem; padding: 0.85rem 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
        <span style="font-size: 1.5rem;">📅</span>
        <div>
          <div style="font-weight: 800; font-size: 0.95rem;">${isHi ? `स्लॉट निर्धारित: ${b.booking_date} (${b.time_slot})` : `Slot Booked: ${b.booking_date} (${b.time_slot})`}</div>
          <div style="font-size: 0.8rem; opacity: 0.9;">${isHi ? 'मंडी पहुंचने पर चेक-इन करें ताकि आपका नाम लाइव कतार में आए।' : 'Please check in when you arrive at Mandi gate to join the live line.'}</div>
        </div>
      </div>
    `;
  }

  const stepsHtml = steps.map((step, i) => {
    let stepDone = false;
    let stepActive = false;
    let isStepCancelled = false;

    if (isCancelled) {
      if (i === 0) {
        isStepCancelled = true;
      }
    } else {
      stepDone = (i < currentIdx) || (step.key === 'paid' && isPaid) || (step.key === 'completed' && b.booking_status === 'completed');
      stepActive = (i === currentIdx && !stepDone) || (step.key === 'paid' && b.payment_status === 'initiated');
    }

    const dotBg = isStepCancelled ? '#ef4444' : stepDone ? '#10b981' : stepActive ? '#3b82f6' : '#f1f5f9';
    const dotBorder = isStepCancelled ? '#dc2626' : stepDone ? '#059669' : stepActive ? '#1d4ed8' : '#cbd5e1';
    const cardBg = isStepCancelled ? '#fef2f2' : stepActive ? '#eff6ff' : '#f8fafc';
    const cardBorder = isStepCancelled ? '#fca5a5' : stepActive ? '#bfdbfe' : '#e2e8f0';

    return `
      <div style="display: flex; gap: 1rem; align-items: flex-start; position: relative; margin-bottom: 1.25rem;">
        <div style="width: 38px; height: 38px; border-radius: 50%; background: ${dotBg}; color: ${stepDone || stepActive || isStepCancelled ? 'white' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 800; flex-shrink: 0; border: 2px solid ${dotBorder}; box-shadow: ${stepActive ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none'};">
          ${isStepCancelled ? '🚫' : stepDone ? '✓' : step.icon}
        </div>
        <div style="flex: 1; background: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 0.75rem; padding: 0.85rem 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 800; font-size: 0.95rem; color: ${isStepCancelled ? '#991b1b' : '#0f172a'};">${step.label}</div>
            <div style="font-size: 0.72rem; font-weight: 700; ${isStepCancelled ? 'color:#dc2626;' : stepDone ? 'color:#16a34a;' : stepActive ? 'color:#2563eb;' : 'color:#94a3b8;'}">
              ${isStepCancelled ? (isHi ? '🚫 रद्द' : '🚫 Cancelled') : stepDone ? (isHi ? '✓ पूर्ण' : '✓ Completed') : stepActive ? (isHi ? '● प्रगति पर' : '● In Progress') : (isHi ? '○ लंबित' : '○ Pending')}
            </div>
          </div>
          <div style="font-size: 0.82rem; color: ${isStepCancelled ? '#b91c1c' : '#64748b'}; margin-top: 0.25rem;">${step.desc}</div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    ${liveBannerHtml}
    
    <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
      <div>
        <div style="font-size: 0.72rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">${isHi ? 'डिजिटल टोकन नंबर' : 'TOKEN NUMBER'}</div>
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.1rem;">
          <span style="font-size: 1.5rem; font-weight: 900; color: #0f172a; font-family: monospace; letter-spacing: 0.04em;">${b.token_number}</span>
          ${isCancelled ? `<span style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 0.2rem 0.6rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">${isHi ? '🚫 रद्द (CANCELLED)' : '🚫 CANCELLED'}</span>` : ''}
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 0.85rem; font-weight: 800; color: #0f172a;">👤 ${b.farmer_name || 'Farmer'}</div>
        <div style="font-size: 0.8rem; color: #64748b;">🏢 ${b.centre_name || 'Procurement Centre'}</div>
        <div style="font-size: 0.78rem; color: #16a34a; font-weight: 700; margin-top: 0.1rem;">🌾 ${b.crop_name} (${b.crop_hindi || ''})</div>
      </div>
    </div>

    <!-- Timeline -->
    <div style="margin-bottom: 1.5rem;">
      ${stepsHtml}
    </div>

    ${b.total_payable_amount ? `
      <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #86efac; border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.25rem; text-align: center;">
        <div style="font-size: 0.72rem; font-weight: 700; color: #15803d; text-transform: uppercase;">${isHi ? 'कुल देय राशि (DBT)' : 'TOTAL PAYABLE AMOUNT'}</div>
        <div style="font-size: 1.8rem; font-weight: 900; color: #15803d; margin: 0.2rem 0;">₹${b.total_payable_amount.toLocaleString('en-IN')}</div>
        <div style="font-size: 0.8rem; color: #166534;">${b.crop_name} • ${b.net_weight_quintals} Quintals</div>
      </div>
    ` : ''}

    <!-- Action Bar -->
    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; justify-content: space-between; pt: 0.5rem;">
      <button type="button" class="btn btn-secondary btn-sm" onclick="trackLandingToken(currentLandingTrackQuery)" style="padding: 0.55rem 1rem; border-radius: 0.5rem; font-size: 0.82rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.4rem; background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; cursor: pointer;">
        🔄 ${isHi ? 'अपडेट स्थिति' : 'Refresh Live Status'}
      </button>

      ${b.receipt_number ? `
        <a href="/receipt/${b.receipt_number}" target="_blank" class="btn btn-primary btn-sm" style="padding: 0.55rem 1rem; border-radius: 0.5rem; font-size: 0.82rem; font-weight: 700; color: white; background: #16a34a; text-decoration: none; display: inline-flex; align-items: center; gap: 0.4rem;">
          📄 ${isHi ? 'जे-फॉर्म रसीद देखें' : 'View J-Form Receipt'}
        </a>
      ` : ''}
    </div>
  `;
}

document.addEventListener('languageChanged', () => {
  if (currentLandingBookingsData) {
    renderLandingTrackResults(currentLandingBookingsData);
  }
});

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

