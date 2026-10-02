let me, plans = [], subs = [], pending = null;
const current = () => subs.find((s) => ['active', 'pending_payment'].includes(s.status));

async function init() {
  me = await guard('user'); if (!me) return;
  $('bar').innerHTML = topbar(me.name);
  await refresh();
}
async function refresh() {
  [plans, subs] = await Promise.all([api('/plans'), api('/subscriptions/mine')]);
  renderHome(); renderPlans(); renderBilling(); renderAlerts(); renderSupport(); renderProfile();
}

function renderHome() {
  const s = current();
  if (!s) {
    const last = subs[0];
    $('home').innerHTML = `<div class="panel empty"><h4 class="text-body">${last ? 'Your last plan has ended' : 'You have no plan yet'}</h4><p>Choose a plan to get a fixed pickup, drop and driver.</p><button class="btn btn-sr" onclick="showTab('plans')">Choose a plan</button></div>${subs.length ? `<div class="panel"><h5>Past plans</h5>${table(['Plan', 'Route', 'Period', 'Status', ''], subs.map((x) => `<tr><td>${esc(x.planName)}</td><td>${esc(x.pickup)} to ${esc(x.drop)}</td><td>${fd(x.startDate)} – ${fd(x.endDate)}</td><td><span class="status ${x.status}">${label(x.status)}</span></td><td><button class="btn btn-sm btn-outline-success" onclick="openSub('${x.planId}')">Renew</button></td></tr>`))}</div>` : ''}`;
    return;
  }
  const d = s.driver;
  const daysLeft = s.endDate ? Math.max(0, Math.ceil((new Date(s.endDate) - new Date()) / 864e5)) : null;
  $('home').innerHTML = `<div class="row g-3"><div class="col-lg-7"><div class="panel h-100">
    <div class="d-flex justify-content-between align-items-start"><h4 class="mb-0">${esc(s.planName)} plan</h4><span class="status ${s.status}">${label(s.status)}</span></div>
    ${s.status === 'pending_payment' ? `<p class="mt-3">Pay ${inr(s.amount)} to start your service.</p><button class="btn btn-sr" onclick="pending=${esc(JSON.stringify(s))};showPay()">Pay ${inr(s.amount)}</button> <button class="btn btn-outline-danger" onclick="cancelSub('${s.id}')">Cancel</button>` : `
    <ol class="route mt-3"><li><strong>${esc(s.pickup)}</strong><small>Pickup every day at ${esc(s.pickupTime)}</small></li><li class="end"><strong>${esc(s.drop)}</strong><small>Drop-back every evening at ${esc(s.dropTime)}</small></li></ol>
    <p class="mb-1 mt-2 muted">Valid ${fd(s.startDate)} to ${fd(s.endDate)} (${daysLeft} days left)</p>
    <div class="mt-3 d-flex gap-2 flex-wrap"><button class="btn btn-green" onclick="openSub('${s.planId}')">Renew early</button><button class="btn btn-outline-danger" onclick="cancelSub('${s.id}')">Cancel plan</button></div>`}
  </div></div>
  <div class="col-lg-5"><div class="panel h-100"><h5>Your driver</h5>${d ? `<p class="fs-5 mb-1">${esc(d.name)}</p><p class="mb-1">${esc(d.vehicle.model)} &middot; ${esc(d.vehicle.number)}</p><p class="mb-0"><a href="tel:${esc(d.mobile)}">${esc(d.mobile)}</a></p>` : `<div class="empty p-2">${s.status === 'active' ? 'We are finding a driver on your route. You will get a notification once assigned.' : 'A driver is assigned right after payment.'}</div>`}</div></div></div>`;
}

function renderPlans() {
  $('plans').innerHTML = `<div class="row g-3">${plans.map((p) => `<div class="col-md-4"><div class="plan ${p.months === 3 ? 'best' : ''}"><h4>${esc(p.name)}</h4><div class="price">${inr(p.amount)}</div><p class="muted">for ${p.months} month${p.months > 1 ? 's' : ''} (${inr(Math.round(p.amount / p.months))}/month)</p><ul>${p.perks.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><button class="btn btn-sr" onclick="openSub('${p.id}')">Select ${esc(p.name)}</button></div></div>`).join('')}</div>`;
}
function openSub(planId) {
  if (current()) return toast('You already have an active or unpaid plan. Cancel it first, or wait until it ends.', 'error');
  const p = plans.find((x) => x.id === planId); if (!p) return toast('This plan is no longer available.', 'error');
  $('subPlan').value = planId; $('subTitle').textContent = `${p.name} plan · ${inr(p.amount)}`;
  $('subPickup').value = me.pickup || ''; $('subDrop').value = me.drop || ''; $('subPT').value = me.pickupTime || '09:00'; $('subDT').value = me.dropTime || '18:00';
  bootstrap.Modal.getOrCreateInstance($('subModal')).show();
}
function createSub(e) {
  e.preventDefault();
  run(async () => {
    pending = await api('/subscriptions', { method: 'POST', body: { planId: $('subPlan').value, pickup: $('subPickup').value, drop: $('subDrop').value, pickupTime: $('subPT').value, dropTime: $('subDT').value } });
    bootstrap.Modal.getInstance($('subModal')).hide(); me = await api('/auth/me'); showPay();
  });
  return false;
}
function showPay() { $('payAmt').textContent = inr(pending.amount); $('payPlan').textContent = pending.planName + ' plan'; bootstrap.Modal.getOrCreateInstance($('payModal')).show(); }
function pay() {
  run(async () => {
    const r = await api('/payments/pay', { method: 'POST', body: { subscriptionId: pending.id, method: $('payMethod').value } });
    bootstrap.Modal.getInstance($('payModal')).hide(); toast('Payment received. Invoice ' + r.invoice.invoiceNo + ' is ready.'); await refresh(); showTab('home');
  });
}
function cancelSub(id) { if (!confirm('Cancel this plan? Your driver assignment will end.')) return; run(async () => { await api(`/subscriptions/${id}/cancel`, { method: 'POST' }); toast('Plan cancelled.'); refresh(); }); }

async function renderBilling() {
  const [inv, pays] = await Promise.all([api('/invoices/mine'), api('/payments/mine')]);
  window._inv = inv;
  $('billing').innerHTML = `<div class="panel"><h5>Invoices</h5>${table(['Invoice', 'Date', 'Plan', 'Amount', ''], inv.map((i, k) => `<tr><td>${i.invoiceNo}</td><td>${fd(i.createdAt)}</td><td>${esc(i.planName)}</td><td>${inr(i.amount)}</td><td><button class="btn btn-sm btn-outline-success" onclick="viewInvoice(${k})">View / print</button></td></tr>`), 'No invoices yet. One is created after each payment.')}</div>
  <div class="panel"><h5>Payment history</h5>${table(['Transaction', 'Date', 'Method', 'Amount', 'Status'], pays.map((p) => `<tr><td>${p.txnId}</td><td>${fd(p.createdAt)}</td><td>${esc(p.method)}</td><td>${inr(p.amount)}</td><td><span class="status ${p.status}">${p.status}</span></td></tr>`), 'No payments yet.')}</div>`;
}
function viewInvoice(k) {
  const i = window._inv[k]; const w = window.open('', '_blank');
  w.document.write(`<title>${i.invoiceNo}</title><body style="font-family:sans-serif;max-width:560px;margin:2rem auto"><h2>Smart Ride</h2><h3>Invoice ${i.invoiceNo}</h3><p>Date: ${fd(i.createdAt)}<br>Billed to: ${esc(me.name)}</p><table style="width:100%;border-collapse:collapse" border="1" cellpadding="8"><tr><td>${esc(i.planName)} plan (incl. GST ${inr(i.tax)})</td><td align="right">${inr(i.amount)}</td></tr><tr><th align="left">Total paid via ${esc(i.method)}</th><th align="right">${inr(i.amount)}</th></tr></table><p><button onclick="print()">Print</button></p></body>`); w.document.close();
}

async function renderAlerts() {
  const n = await api('/notifications'); const unread = n.filter((x) => !x.read).length;
  $('badge').textContent = unread; $('badge').classList.toggle('d-none', !unread);
  $('alerts').innerHTML = `<div class="panel"><div class="d-flex justify-content-between"><h5>Notifications</h5>${unread ? '<button class="btn btn-sm btn-outline-success" onclick="markRead()">Mark all as read</button>' : ''}</div>${n.length ? n.map((x) => `<div class="py-2 border-top ${x.read ? 'muted' : ''}"><strong>${esc(x.title)}</strong> <small class="muted">${fd(x.createdAt)}</small><div>${esc(x.message)}</div></div>`).join('') : '<div class="empty">No notifications yet.</div>'}</div>`;
}
function markRead() { run(async () => { await api('/notifications/read', { method: 'POST' }); renderAlerts(); }); }

async function renderSupport() {
  const c = await api('/complaints/mine');
  $('support').innerHTML = `<div class="row g-3"><div class="col-lg-5"><form class="panel" onsubmit="return sendC(event)"><h5>Send a complaint or feedback</h5>
  <select class="form-select mb-3" id="cType"><option value="complaint">Complaint</option><option value="feedback">Feedback</option></select>
  <input class="form-control mb-3" id="cSub" placeholder="Subject" required><textarea class="form-control mb-3" id="cMsg" rows="4" placeholder="Tell us what happened" required></textarea><button class="btn btn-green">Send</button></form></div>
  <div class="col-lg-7"><div class="panel"><h5>Your requests</h5>${c.length ? c.map((x) => `<div class="py-2 border-top"><strong>${esc(x.subject)}</strong> <span class="status ${x.status}">${x.status}</span><div>${esc(x.message)}</div>${x.response ? `<div class="mt-1 p-2" style="background:#F2F6F4;border-radius:6px"><small class="muted">Support reply</small><br>${esc(x.response)}</div>` : ''}</div>`).join('') : '<div class="empty">You have not contacted support.</div>'}</div></div></div>`;
}
function sendC(e) { e.preventDefault(); run(async () => { await api('/complaints', { method: 'POST', body: { type: $('cType').value, subject: $('cSub').value, message: $('cMsg').value } }); toast('Sent. We will reply here.'); renderSupport(); }); return false; }

function renderProfile() {
  $('profile').innerHTML = `<form class="panel" style="max-width:640px" onsubmit="return saveP(event)"><h5>Profile and default route</h5>
  <label class="form-label">Name</label><input class="form-control mb-3" id="pName" value="${esc(me.name)}" required>
  <label class="form-label">Mobile</label><input class="form-control mb-3" id="pMob" value="${esc(me.mobile)}">
  <label class="form-label">Pickup location</label><input class="form-control mb-3" id="pPick" value="${esc(me.pickup)}">
  <label class="form-label">Drop location</label><input class="form-control mb-3" id="pDrop" value="${esc(me.drop)}">
  <div class="row"><div class="col"><label class="form-label">Pickup time</label><input type="time" class="form-control mb-3" id="pPT" value="${esc(me.pickupTime || '09:00')}"></div><div class="col"><label class="form-label">Drop time</label><input type="time" class="form-control mb-3" id="pDT" value="${esc(me.dropTime || '18:00')}"></div></div>
  <button class="btn btn-green">Save changes</button></form>`;
}
function saveP(e) { e.preventDefault(); run(async () => { me = await api('/auth/me', { method: 'PUT', body: { name: $('pName').value, mobile: $('pMob').value, pickup: $('pPick').value, drop: $('pDrop').value, pickupTime: $('pPT').value, dropTime: $('pDT').value } }); toast('Saved.'); $('bar').innerHTML = topbar(me.name); }); return false; }
init();
