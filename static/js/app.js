/**
 * SMARTPROCURE (SIH 2026 - PS 26032) - SHARED CLIENT CORE
 * Multilingual Engine, Audio Chimes, Real-time SSE Listener, SMS Drawer
 */

const I18N = {
  en: {
    app_title: "SMARTPROCURE",
    app_tagline: "Digital Procurement Queue & Status Platform",
    nav_home: "🏠 Home",
    nav_farmer: "👨‍🌾 Farmer Portal",
    nav_admin: "🏢 Admin Panel",
    nav_display: "📺 Live Queue",
    lang_btn: "हिंदी",
    mob_nav_home: "Home",
    mob_nav_book: "Book Slot",
    mob_nav_queue: "Live Queue",
    mob_nav_sms: "SMS Alerts",

    // Hero Section
    hero_title: 'Smart <span class="highlight">Procurement</span><br>for Every Farmer',
    hero_subtitle: "Book your Mandi slot, track live queue positions, and receive guaranteed MSP payments directly to your bank — all from your mobile.",
    btn_farmer_login: "👨‍🌾 Farmer Login / Signup",
    btn_admin_login: "🏢 Admin / Operator Login",
    stat_farmers: "Registered Farmers",
    stat_wait_reduction: "Queue Wait Reduction",
    stat_dbt: "DBT Direct to Bank",
    stat_crops: "Crops Supported",

    // MSP Section
    ticker_label: "📊 LIVE MSP 2026-27",
    msp_tag: "📊 Government Approved",
    msp_title: "2026-27 Minimum Support Prices (MSP)",
    msp_desc: "Officially notified MSP rates for Kharif & Rabi crops as per Cabinet Committee on Economic Affairs (CCEA)",
    per_quintal: "per Quintal (100 kg)",

    // Mandi Finder Section
    finder_tag: "📍 Find Nearby",
    finder_title: "Locate Nearest Procurement Centre",
    finder_desc: "Search by city or district to find government procurement Mandis near you",
    all_crops: "🌾 All Crops",
    search_placeholder: "Enter city, district or pincode... e.g. Karnal, Ludhiana",
    btn_use_location: "📍 Use My Location",
    btn_search: "🔍 Search",

    // How It Works Section
    how_tag: "⚡ Simple 6-Step Process",
    how_title: "How SmartProcure Works",
    how_desc: "From registration to payment in 6 easy steps — no paperwork, no queues",

    step1_badge: "STEP 01 • MOBILE REGISTRATION",
    step1_title: "1. Register via Mobile OTP",
    step1_desc: "Verify your mobile number with OTP, then enter your Aadhaar & bank details once.",
    step1_chip: "✨ One-Time Registration",

    step2_badge: "STEP 02 • SLOT BOOKING",
    step2_title: "2. Book a Guaranteed Slot",
    step2_desc: "Select your nearest Mandi, crop type, preferred date & time — get a digital token instantly.",
    step2_chip: "🎟️ Instant Digital Pass",

    step3_badge: "STEP 03 • MANDI ARRIVAL",
    step3_title: "3. Arrive & Quick Check-In",
    step3_desc: "Arrive at your booked time and check-in via phone. Skip the physical line entirely.",
    step3_chip: "🚫 Zero Physical Waiting",

    step4_badge: "STEP 04 • LIVE QUEUE",
    step4_title: "4. Track Live Queue Line",
    step4_desc: "Watch real-time token position and estimated wait time from your phone or tractor.",
    step4_chip: "📱 Live Phone Alerts",

    step5_badge: "STEP 05 • WEIGHMENT & QUALITY",
    step5_title: "5. Digital Weighbridge & Quality Check",
    step5_desc: "Computerized transparent weighment & certified grading receipt created on the spot.",
    step5_chip: "秤 100% Accurate Scale",

    step6_badge: "STEP 06 • DIRECT BANK PAYMENT",
    step6_title: "6. Direct Bank Transfer (DBT)",
    step6_desc: "Full MSP payment credited directly to your bank account via PFMS — zero middlemen or fees.",
    step6_chip: "💰 100% Money to Bank Account",

    // Bottom CTA Banner
    cta_title: "Ready to Sell Your Crop at MSP?",
    cta_desc: "Join thousands of farmers already benefiting from transparent, queue-free digital procurement",
    btn_register_farmer: "✍️ Register as Farmer",
    btn_already_login: "🔐 Already Registered? Login",

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
    nav_home: "🏠 मुख्य पृष्ठ",
    nav_farmer: "👨‍🌾 किसान पोर्टल",
    nav_admin: "🏢 एडमिन पैनल",
    nav_display: "📺 लाइव कतार",
    lang_btn: "English",
    mob_nav_home: "मुख्य",
    mob_nav_book: "स्लॉट बुक",
    mob_nav_queue: "लाइव कतार",
    mob_nav_sms: "एसएमएस",

    // Hero Section
    hero_title: 'हर किसान के लिए <span class="highlight">डिजिटल एवं सुगम</span><br>मंडी खरीद पोर्टल',
    hero_subtitle: "अपनी मंडी स्लॉट बुक करें, लाइव कतार स्थिति देखें और सीधा बैंक भुगतान (DBT) पाएं — अपने मोबाइल से आसान प्रक्रिया।",
    btn_farmer_login: "👨‍🌾 किसान लॉगिन / नया पंजीकरण",
    btn_admin_login: "🏢 ऑपरेटर / एडमिन लॉगिन",
    stat_farmers: "पंजीकृत किसान",
    stat_wait_reduction: "समय की बचत",
    stat_dbt: "सीधा बैंक भुगतान",
    stat_crops: "फसलें उपलब्ध",

    // MSP Section
    ticker_label: "📊 लाइव न्यूनतम समर्थन मूल्य (MSP)",
    msp_tag: "📊 सरकार द्वारा स्वीकृत",
    msp_title: "2026-27 न्यूनतम समर्थन मूल्य (MSP)",
    msp_desc: "आर्थिक मामलों की कैबिनेट समिति (CCEA) द्वारा अधिसूचित आधिकारिक फसल दरें",
    per_quintal: "प्रति क्विंटल (100 किग्रा)",

    // Mandi Finder Section
    finder_tag: "📍 नजदीकी केंद्र ढूंढें",
    finder_title: "नजदीकी सरकारी खरीद केंद्र (मंडी) खोजें",
    finder_desc: "अपने आसपास की सरकारी मंडियों और लाइव भीड़ की स्थिति देखने के लिए शहर, जिला या पिनकोड खोजें",
    all_crops: "🌾 सभी फसलें",
    search_placeholder: "शहर, जिला या पिनकोड दर्ज करें... जैसे करनाल, लुधियाना",
    btn_use_location: "📍 मेरा स्थान प्रयोग करें",
    btn_search: "🔍 खोजें",

    // How It Works Section (Hindi Vernacular - Easy for Farmer)
    how_tag: "⚡ सरल 6-चरण प्रक्रिया",
    how_title: "स्मार्टप्रोक्योर से फसल बेचना है बहुत आसान",
    how_desc: "रजिस्ट्रेशन से लेकर खाते में पैसे आने तक 6 आसान चरणों में — बिना कागजी कार्रवाई, बिना लंबी लाइन",

    step1_badge: "चरण 01 • मोबाइल रजिस्ट्रेशन",
    step1_title: "1. मोबाइल नंबर से रजिस्ट्रेशन",
    step1_desc: "अपने मोबाइल पर OTP प्राप्त करें। अपना नाम, आधार और बैंक खाता विवरण एक बार दर्ज करें।",
    step1_chip: "✨ केवल एक बार रजिस्ट्रेशन",

    step2_badge: "चरण 02 • स्लॉट बुकिंग",
    step2_title: "2. मंडी और अपनी पसंद का समय चुनें",
    step2_desc: "नजदीकी मंडी, फसल और तिथि चुनकर तुरंत डिजिटल पास (टोकन) प्राप्त करें।",
    step2_chip: "🎟️ तुरंत डिजिटल टोकन / पास",

    step3_badge: "चरण 03 • मंडी आगमन",
    step3_title: "3. तय समय पर मंडी आएं और चेक-इन करें",
    step3_desc: "अपने बुक किए गए समय पर मंडी पहुंचें और फोन से चेक-इन करके सीधी एंट्री पाएं।",
    step3_chip: "🚫 धूप में लाइन लगाने की जरूरत नहीं",

    step4_badge: "चरण 04 • लाइव कतार",
    step4_title: "4. फोन पर अपनी बारी (लाइव लाइन) देखें",
    step4_desc: "ट्रैक्टर या किसान विश्राम गृह में आराम से बैठकर देखें आपकी बारी आने में कितना समय है।",
    step4_chip: "📱 मोबाइल पर लाइव टोकन स्थिति",

    step5_badge: "चरण 05 • तौल एवं जांच",
    step5_title: "5. डिजिटल धर्म कांटा तौल व गुणवत्ता जांच",
    step5_desc: "कंप्यूटर द्वारा पारदर्शी तौल और सरकारी अधिकारी द्वारा सही ग्रेडिंग की रसीद पाएं।",
    step5_chip: "⚖️ 100% सही व निष्पक्ष तौल",

    step6_badge: "चरण 06 • 100% सीधा बैंक भुगतान",
    step6_title: "6. सीधा बैंक खाते में फसल का पूरा पैसा (DBT)",
    step6_desc: "फसल का पूरा भुगतान बिना किसी दलाल या बिचौलिए के सीधे आपके बैंक खाते में जमा।",
    step6_chip: "💰 0% दलाली • 100% बैंक खाता",

    // Bottom CTA Banner
    cta_title: "क्या आप अपनी फसल MSP पर बेचने के लिए तैयार हैं?",
    cta_desc: "हजारों किसानों के साथ जुड़ें और पारदर्शी व कतार-मुक्त मंडी खरीद का लाभ उठाएं",
    btn_register_farmer: "✍️ किसान पंजीकरण करें",
    btn_already_login: "🔐 पहले से पंजीकृत? लॉगिन करें",

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
      el.innerHTML = I18N[lang][key];
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (I18N[lang] && I18N[lang][key]) {
      el.placeholder = I18N[lang][key];
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
