/**
 * SMARTPROCURE (SIH 2026 - PS 26032) - SHARED CLIENT CORE
 * Multilingual Engine, Audio Chimes, Real-time SSE Listener, SMS Drawer
 */

const I18N = {
  en: {
    app_title: "SMARTPROCURE",
    app_tagline: "Digital Procurement Queue & Status Platform",
    nav_farmer: "Farmer Portal",
    nav_admin: "Centre Desk",
    nav_display: "Public TV Queue",
    lang_btn: "हिंदी",
    mob_nav_home: "Home",
    mob_nav_book: "Book Slot",
    mob_nav_queue: "Live Queue",
    mob_nav_sms: "SMS Alerts",
    network_offline: "Spotty connection: Working in resilient offline mode.",
    network_online: "Connected: Mandi gateway online & synchronized.",
    step_register: "Register",
    step_register_sub: "Farmer Profile",
    step_select: "Select",
    step_select_sub: "Centre & Slot",
    step_arrive: "Arrive",
    step_arrive_sub: "Check-in",
    step_queue: "Queue",
    step_queue_sub: "Live Position",
    step_procure: "Procure",
    step_procure_sub: "Weight & Quality",
    step_pay: "Pay",
    step_pay_sub: "DBT Status",
    call_next: "Call Next Farmer",
    gross_wt: "Gross Weight (kg)",
    tare_wt: "Tare Weight (kg)",
    net_wt: "Net Weight (Qtl)",
    total_payable: "Total Payable (₹)",
    moisture_test: "Moisture Content (%)",
    quality_grade: "Quality Grade",
    record_procurement: "Record Procurement & Generate J-Form",
    dbt_payout: "Direct Bank Transfer (DBT)",
    live_waiting: "Farmers Waiting in Queue",
    est_wait: "Estimated Waiting Time"
  },
  hi: {
    app_title: "स्मार्टप्रोक्योर",
    app_tagline: "किसानों के लिए डिजिटल शेड्यूलिंग, कतार व खरीद स्थिति पोर्टल",
    nav_farmer: "किसान पोर्टल",
    nav_admin: "केंद्र ऑपरेटर",
    nav_display: "सार्वजनिक टीवी कतार",
    lang_btn: "English",
    mob_nav_home: "मुख्य",
    mob_nav_book: "स्लॉट बुक",
    mob_nav_queue: "लाइव कतार",
    mob_nav_sms: "एसएमएस",
    network_offline: "ऑफ़लाइन मोड: नेटवर्क कमजोर है। विवरण सुरक्षित है।",
    network_online: "ऑनलाइन वापस: मंडी सर्वर कनेक्ट हो गया।",
    step_register: "पंजीकरण",
    step_register_sub: "किसान प्रोफाइल",
    step_select: "चयन करें",
    step_select_sub: "केंद्र व स्लॉट",
    step_arrive: "आगमन",
    step_arrive_sub: "चेक-इन",
    step_queue: "लाइव कतार",
    step_queue_sub: "स्थान व समय",
    step_procure: "खरीद तौल",
    step_procure_sub: "वजन व गुणवत्ता",
    step_pay: "भुगतान",
    step_pay_sub: "DBT स्थिति",
    call_next: "अगला किसान बुलाएं",
    gross_wt: "सकल वजन (किग्रा)",
    tare_wt: "खाली वाहन वजन (किग्रा)",
    net_wt: "शुद्ध वजन (क्विंटल)",
    total_payable: "कुल देय राशि (₹)",
    moisture_test: "नमी प्रतिशत (%)",
    quality_grade: "गुणवत्ता ग्रेड",
    record_procurement: "खरीद दर्ज करें व जे-फॉर्म बनाएं",
    dbt_payout: "प्रत्यक्ष लाभ अंतरण (DBT)",
    live_waiting: "कतार में प्रतीक्षारत किसान",
    est_wait: "अनुमानित प्रतीक्षा समय"
  }
};

let currentLang = localStorage.getItem('smartprocure_lang') || 'en';

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('smartprocure_lang', lang);
  document.documentElement.lang = lang;
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (I18N[lang] && I18N[lang][key]) {
      el.textContent = I18N[lang][key];
    }
  });

  const langBtn = document.getElementById('lang-toggle-btn');
  if (langBtn) {
    langBtn.innerHTML = lang === 'en' ? '🇮🇳 <span>हिंदी</span>' : '🇬🇧 <span>English</span>';
  }

  const mobLangLabel = document.getElementById('mob-lang-label');
  if (mobLangLabel) {
    mobLangLabel.textContent = lang === 'en' ? 'हिंदी' : 'English';
  }
}

function toggleLanguage() {
  setLanguage(currentLang === 'en' ? 'hi' : 'en');
}

// Speech Synthesis Announcement for Rural & Sunlight Accessibility
function speakAnnouncement(text, lang = currentLang) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.88; // Clear cadence for noisy Mandi environments
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis error:", err);
  }
}

// Synthesized Audio Chime & Announcement via Web Audio API
function playChime(type = 'chime') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    if (type === 'call') {
      // Pleasant airport-style two-tone chime
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880.00, now + 0.25); // A5
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    } else {
      // Soft notification ping
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.15); // E5
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    }

    osc1.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 1.3);
  } catch (e) {
    console.warn("Audio chime error:", e);
  }
}

// Toast Alert System
function showToast(title, message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div style="font-size: 1.3rem;">${type === 'success' ? '✅' : type === 'error' ? '❌' : '🔔'}</div>
    <div class="toast-content">
      <h4>${title}</h4>
      <p>${message}</p>
    </div>
  `;

  container.appendChild(toast);
  playChime(type === 'error' ? 'ping' : 'chime');

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// SMS Notification Drawer Manager
const SMSDrawer = {
  unreadCount: 0,

  init() {
    const btn = document.getElementById('floating-sms-btn');
    const backdrop = document.getElementById('sms-drawer-backdrop');
    const closeBtn = document.getElementById('sms-close-btn');

    if (btn) btn.addEventListener('click', () => this.open());
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });
    }
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    this.fetchLogs();
  },

  open() {
    const backdrop = document.getElementById('sms-drawer-backdrop');
    if (backdrop) {
      backdrop.classList.add('active');
      this.unreadCount = 0;
      this.updateBadge();
    }
  },

  close() {
    const backdrop = document.getElementById('sms-drawer-backdrop');
    if (backdrop) backdrop.classList.remove('active');
  },

  updateBadge() {
    const badge = document.getElementById('sms-badge-count');
    if (badge) {
      badge.textContent = this.unreadCount;
      badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
    }
    const mobBadge = document.getElementById('sms-badge-count-mob');
    if (mobBadge) {
      mobBadge.textContent = this.unreadCount;
      mobBadge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
    }
  },

  async fetchLogs() {
    try {
      const activeFarmer = JSON.parse(localStorage.getItem('smartprocure_farmer') || 'null');
      const phoneParam = activeFarmer ? `?phone=${activeFarmer.phone}` : '';
      const res = await fetch(`/api/sms/logs${phoneParam}`);
      const data = await res.json();
      if (data.success && data.logs) {
        this.renderLogs(data.logs);
      }
    } catch (e) {
      console.warn("SMS log error:", e);
    }
  },

  renderLogs(logs) {
    const body = document.getElementById('sms-phone-body');
    if (!body) return;

    if (logs.length === 0) {
      body.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: #94a3b8;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📱</div>
          <p style="font-weight:700; color:#cbd5e1;">No SMS notifications yet.</p>
          <small style="color:#64748b;">Official alerts for bookings, token calls, and direct bank payments will appear here.</small>
        </div>
      `;
      return;
    }

    body.innerHTML = logs.map(sms => {
      let badgeClass = 'badge-booking';
      if (sms.notification_type === 'token_called') badgeClass = 'badge-called';
      if (sms.notification_type === 'weighment_done') badgeClass = 'badge-weighment';
      if (sms.notification_type === 'dbt_credited') badgeClass = 'badge-dbt';

      const timeStr = sms.sent_at ? new Date(sms.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';

      return `
        <div class="sms-bubble">
          <div class="sms-bubble-meta">
            <span class="sms-sender">🏛️ DoCA-GOV-SMS</span>
            <span>${timeStr}</span>
          </div>
          <p class="sms-text">${sms.message_content}</p>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.4rem;">
            <span class="sms-badge-tag ${badgeClass}">${sms.notification_type.replace(/_/g, ' ')}</span>
            <button type="button" onclick="speakAnnouncement('${sms.message_content.replace(/'/g, "\\'")}')" 
                    style="background:none; border:none; color:#38bdf8; cursor:pointer; font-size:0.9rem; padding:0.2rem 0.4rem;" 
                    title="Listen in Hindi/English" aria-label="Listen to SMS">
              🔊 सुनें
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  addIncomingSMS(sms) {
    this.unreadCount++;
    this.updateBadge();
    showToast("New Official SMS Alert", sms.message || sms.message_content, "info");
    this.fetchLogs();
  }
};

// Touch swipe-down-to-close listener for Mobile Bottom-Sheet Drawer
function initMobileSheetTouch() {
  const sheet = document.querySelector('.sms-phone-container');
  if (!sheet) return;

  let touchStartY = 0;
  let touchCurrentY = 0;

  sheet.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchCurrentY = touchStartY;
  }, { passive: true });

  sheet.addEventListener('touchmove', (e) => {
    touchCurrentY = e.touches[0].clientY;
    const deltaY = touchCurrentY - touchStartY;
    if (deltaY > 0 && window.innerWidth <= 768) {
      sheet.style.transform = `translateY(${deltaY}px)`;
    }
  }, { passive: true });

  sheet.addEventListener('touchend', () => {
    const deltaY = touchCurrentY - touchStartY;
    if (deltaY > 100 && window.innerWidth <= 768) {
      SMSDrawer.close();
    }
    sheet.style.transform = '';
    touchStartY = 0;
    touchCurrentY = 0;
  });
}

// Network Connectivity Watcher (Spotty Rural Connectivity Resilience)
function initNetworkWatcher() {
  const banner = document.getElementById('network-status-banner');
  const icon = document.getElementById('network-status-icon');
  const text = document.getElementById('network-status-text');

  function updateStatus() {
    if (!navigator.onLine) {
      if (banner) {
        banner.style.display = 'flex';
        banner.className = 'network-status-banner offline';
        if (icon) icon.textContent = '📡❌';
        if (text) text.textContent = I18N[currentLang]?.network_offline || "Spotty connection: Working in resilient offline mode.";
      }
      showToast("Network Offline", "Spotty Mandi signal. Data saved in offline mode.", "error");
    } else {
      if (banner && banner.style.display !== 'none') {
        banner.className = 'network-status-banner online';
        if (icon) icon.textContent = '✅';
        if (text) text.textContent = I18N[currentLang]?.network_online || "Connected: Mandi gateway online.";
        setTimeout(() => { banner.style.display = 'none'; }, 3000);
        showToast("Online", "Connected to SmartProcure gateway.", "success");
      }
    }
  }

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  if (!navigator.onLine) updateStatus();
}

// Global Server-Sent Events (SSE) Real-time Listener
function initRealtimeStream() {
  if (!window.EventSource) return;

  const eventSource = new EventSource('/api/queue/stream');

  eventSource.onmessage = (e) => {
    try {
      const payload = JSON.parse(e.data);
      if (!payload || !payload.event) return;

      // Dispatch window event for specific pages to consume
      window.dispatchEvent(new CustomEvent(`smartprocure:${payload.event}`, { detail: payload.data }));

      if (payload.event === 'token_called') {
        playChime('call');
        const announcement = `टोकन नंबर ${payload.data.token_number} काउंटर ${payload.data.desk_name} पर आएं`;
        speakAnnouncement(announcement, 'hi');
        showToast("Token Called to Counter!", `Token ${payload.data.token_number} called to ${payload.data.desk_name}`, "info");
        SMSDrawer.fetchLogs();
      } else if (payload.event === 'payment_credited') {
        playChime('chime');
        showToast("DBT Payment Credited!", `Rs. ${payload.data.amount} transferred (UTR: ${payload.data.utr})`, "success");
        SMSDrawer.fetchLogs();
      } else if (payload.event === 'procurement_completed') {
        SMSDrawer.fetchLogs();
      }
    } catch (err) {
      console.warn("SSE parse error:", err);
    }
  };

  eventSource.onerror = () => {
    // Automatically attempts reconnect
  };
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  setLanguage(currentLang);
  SMSDrawer.init();
  initMobileSheetTouch();
  initNetworkWatcher();
  initRealtimeStream();

  const langBtn = document.getElementById('lang-toggle-btn');
  if (langBtn) {
    langBtn.addEventListener('click', toggleLanguage);
  }
});
