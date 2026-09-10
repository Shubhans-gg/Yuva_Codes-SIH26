/**
 * SMARTPROCURE (SIH 2026) - PUBLIC MANDI TV QUEUE DISPLAY
 * High-visibility large-screen real-time queue display with voice announcements
 */

const DisplayApp = {
  activeCentreId: 'CENTRE-01',
  lastCalledToken: null,

  init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
    this.fetchDisplayQueue();
    setInterval(() => this.fetchDisplayQueue(), 5000);

    const centreSelect = document.getElementById('display-centre-select');
    if (centreSelect) {
      centreSelect.addEventListener('change', (e) => {
        this.activeCentreId = e.target.value;
        this.fetchDisplayQueue();
      });
    }

    window.addEventListener('smartprocure:token_called', (e) => {
      this.announceToken(e.detail.token_number, e.detail.desk_name, e.detail.farmer_name);
      this.fetchDisplayQueue();
    });

    if (window.supabaseClient) {
      try {
        window.supabaseClient.channel('display-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'counter_desks' }, () => {
            this.fetchDisplayQueue();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'slot_bookings' }, () => {
            this.fetchDisplayQueue();
          })
          .subscribe();
      } catch(e) {
        console.warn('Display Realtime error:', e);
      }
    }
  },

  updateClock() {
    const clock = document.getElementById('display-live-clock');
    if (clock) {
      const now = new Date();
      clock.textContent = now.toLocaleTimeString('en-IN', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  },

  async fetchDisplayQueue() {
    try {
      const res = await fetch(`/api/queue/live?centre_id=${this.activeCentreId}`);
      const data = await res.json();
      if (data.success && data.data) {
        this.renderActiveCounters(data.data.desks);
        this.renderWaitingTokens(data.data.live_queue);
      }
    } catch (e) {
      console.warn("Display fetch error:", e);
    }
  },

  renderActiveCounters(desks) {
    const container = document.getElementById('display-counters-grid');
    if (!container) return;

    container.innerHTML = desks.map(desk => {
      const hasToken = Boolean(desk.current_token);
      return `
        <div class="display-counter-card ${hasToken ? 'serving-flash' : 'idle'}">
          <div class="counter-badge-header">
            <span class="counter-num-tag">COUNTER ${desk.desk_number}</span>
            <span class="counter-desk-type">${desk.desk_type.replace('_', ' ')}</span>
          </div>

          <div class="counter-token-giant">
            ${desk.current_token || '<span style="color: #64748b; font-size: 2.2rem;">IDLE</span>'}
          </div>

          <div class="counter-farmer-name">
            ${desk.farmer_name ? `👨‍🌾 ${desk.farmer_name}` : 'Ready for next token'}
          </div>
        </div>
      `;
    }).join('');
  },

  renderWaitingTokens(queue) {
    const ticker = document.getElementById('display-waiting-ticker');
    if (!ticker) return;

    const waiting = queue.filter(q => q.booking_status === 'checked_in');

    if (waiting.length === 0) {
      ticker.innerHTML = '<span style="color: #94a3b8;">No tokens waiting in queue</span>';
      return;
    }

    ticker.innerHTML = waiting.map((item, idx) => `
      <div class="waiting-chip">
        <span class="waiting-pos">#${idx + 1}</span>
        <span class="waiting-tok">${item.token_number}</span>
        <span class="waiting-name">(${item.farmer_name})</span>
      </div>
    `).join('');
  },

  announceToken(tokenNumber, deskName, farmerName) {
    playChime('call');

    // Web Speech API Voice synthesis
    if ('speechSynthesis' in window) {
      try {
        const text = `Attention please. Token Number ${tokenNumber}, ${farmerName || ''}, please proceed to ${deskName}.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Speech synthesis error:", e);
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => DisplayApp.init());
