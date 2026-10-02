const $ = (id) => document.getElementById(id);
const tok = () => localStorage.getItem('sr_token');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fd = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
const today = () => new Date().toISOString().slice(0, 10);
const label = (s) => String(s).replace('_', ' ');

async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(tok() ? { Authorization: 'Bearer ' + tok() } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && tok() && !path.startsWith('/auth/login')) logout();
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
function logout() { localStorage.removeItem('sr_token'); location.href = '/'; }
async function guard(role) {
  if (!tok()) { location.href = '/'; return null; }
  try { const u = await api('/auth/me'); if (u.role !== role) { location.href = '/'; return null; } return u; } catch { logout(); return null; }
}
function toast(msg, type = 'success') {
  let w = $('toasts'); if (!w) { w = document.createElement('div'); w.id = 'toasts'; w.className = 'toast-wrap'; w.setAttribute('role', 'status'); document.body.appendChild(w); }
  const t = document.createElement('div'); t.className = 'toast-msg ' + type; t.textContent = msg; w.appendChild(t); setTimeout(() => t.remove(), 4000);
}
async function run(fn) { try { return await fn(); } catch (e) { toast(e.message, 'error'); } }
function showTab(id) { const el = document.querySelector(`[data-bs-target="#${id}"]`); if (el) bootstrap.Tab.getOrCreateInstance(el).show(); }
const table = (heads, rows, empty = 'Nothing here yet.') => rows.length ? `<div class="table-responsive"><table class="table"><thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : `<div class="empty">${empty}</div>`;
const topbar = (name, extra = '') => `<header class="topbar"><div class="container d-flex align-items-center justify-content-between py-2"><a class="brand" href="/">Smart<span>Ride</span></a><div class="d-flex align-items-center gap-3">${extra}<span class="d-none d-sm-inline">${esc(name)}</span><button class="btn btn-sm btn-outline-light" onclick="logout()">Log out</button></div></div></header>`;
