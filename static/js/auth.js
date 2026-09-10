/* ===================================================
   SMARTPROCURE (SIH 2026 - PS 26032) — Shared Auth & Storage
   Unified Supabase Auth & Storage helper for frontend
   =================================================== */

const SupabaseAuth = {
  // Get active Supabase client
  getClient() {
    return window.supabaseClient || null;
  },

  // ─── Toast Notifications ─────────────────────────
  showToast(message, type = 'info') {
    const existing = document.getElementById('toast-container');
    const container = existing || (() => {
      const el = document.createElement('div');
      el.id = 'toast-container';
      el.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;';
      document.body.appendChild(el);
      return el;
    })();

    const colors = {
      success: { bg: '#16a34a', border: '#15803d' },
      error:   { bg: '#dc2626', border: '#b91c1c' },
      info:    { bg: '#2563eb', border: '#1d4ed8' },
      warning: { bg: '#d97706', border: '#b45309' }
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${c.bg}; color: white; padding: 0.75rem 1.1rem;
      border-radius: 0.75rem; font-size: 0.875rem; font-weight: 600;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      border-left: 4px solid ${c.border};
      animation: slideInRight 0.3s ease;
      max-width: 340px; cursor: pointer;
      display: flex; align-items: center; gap: 0.5rem;
      font-family: 'Inter', sans-serif;
    `;
    toast.innerHTML = message;
    toast.onclick = () => toast.remove();
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOutRight 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  },

  // ─── Supabase Storage Upload ─────────────────────
  async uploadFile(file, folder = 'documents') {
    if (!file) return null;
    
    // 1. Try direct Supabase JS upload if client is available
    const client = this.getClient();
    if (client) {
      try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const { data, error } = await client.storage
          .from('smartprocure-documents')
          .upload(filePath, file, { upsert: true });

        if (!error && data) {
          const { data: urlData } = client.storage
            .from('smartprocure-documents')
            .getPublicUrl(filePath);
          return urlData.publicUrl;
        }
      } catch (e) {
        console.warn('Direct Supabase Storage upload failed, falling back to server endpoint:', e);
      }
    }

    // 2. Fallback to Flask backend upload endpoint
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const res = await fetch('/api/storage/upload', {
      method: 'POST',
      body: formData
    });
    const result = await res.json();
    if (result.success) {
      return result.url;
    } else {
      throw new Error(result.error || 'File upload failed');
    }
  },

  // ─── Supabase Auth: Sign In with Password ────────
  async signInWithPassword(email, password) {
    const client = this.getClient();
    if (client) {
      try {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (!error && data.session) {
          localStorage.setItem('sb-access-token', data.session.access_token);
          return data;
        }
      } catch (e) {
        console.warn('Supabase JS signInWithPassword notice:', e);
      }
    }
    return null;
  },

  // ─── Supabase Auth: Sign Up ──────────────────────
  async signUp(email, password, metadata = {}) {
    const client = this.getClient();
    if (client) {
      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { data: metadata }
        });
        if (!error && data.session) {
          localStorage.setItem('sb-access-token', data.session.access_token);
          return data;
        }
      } catch (e) {
        console.warn('Supabase JS signUp notice:', e);
      }
    }
    return null;
  }
};

// Global showToast alias for backward compatibility
function showToast(msg, type = 'info') {
  SupabaseAuth.showToast(msg, type);
}

// Inject animation keyframes once
if (!document.getElementById('auth-toast-styles')) {
  const style = document.createElement('style');
  style.id = 'auth-toast-styles';
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(120%); opacity: 0; }
      to   { transform: translateX(0);   opacity: 1; }
    }
    @keyframes fadeOutRight {
      from { transform: translateX(0);   opacity: 1; }
      to   { transform: translateX(120%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}
