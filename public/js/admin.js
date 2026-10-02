let me, driversCache = [];
async function init() { me = await guard('admin'); if (!me) return; $('bar').innerHTML = topbar(me.name); all(); }
const all = () => { overview(); subsT(); driversT(); usersT(); plansT(); complaintsT(); };
const kpi = (v, l) => `<div class="col-6 col-lg-3"><div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div></div>`;

async function overview() {
  const s = await api('/admin/stats'); const max = Math.max(1, ...s.revenueByMonth.map((r) => r.amount));
  $('overview').innerHTML = `<div class="row g-3 mb-3">${kpi(s.activeSubscriptions, 'Active subscriptions')}${kpi(inr(s.mrr), 'Monthly recurring revenue')}${kpi(s.retentionRate + '%', 'User retention rate')}${kpi(s.driverUtilization + '%', 'Driver utilization')}${kpi(s.avgResolutionHours + ' h', 'Avg complaint resolution time')}${kpi(s.totalUsers, 'Registered riders')}${kpi(s.totalDrivers, 'Drivers')}${kpi(inr(s.totalRevenue), 'Total revenue')}</div>
  ${s.unassigned || s.openComplaints ? `<div class="alert alert-warning">${s.unassigned ? `${s.unassigned} active subscription(s) need a driver. ` : ''}${s.openComplaints ? `${s.openComplaints} open complaint(s).` : ''}</div>` : ''}
  <div class="panel"><h5>Revenue by month</h5>${s.revenueByMonth.length ? s.revenueByMonth.map((r) => `<div class="bar-row"><span style="width:70px">${r.month}</span><div class="bar" style="width:${(r.amount / max) * 70}%"></div><span>${inr(r.amount)}</span></div>`).join('') : '<div class="empty">Revenue appears here after the first payment.</div>'}</div>`;
}

async function subsT() {
  const [subs, drivers] = await Promise.all([api('/admin/subscriptions'), api('/admin/drivers')]); driversCache = drivers;
  const opts = (cur) => `<option value="">Assign driver</option>${drivers.filter((d) => d.verified).map((d) => `<option value="${d.id}" ${d.id === cur ? 'selected' : ''}>${esc(d.name)} (${d.riders}/${d.capacity})</option>`).join('')}`;
  $('subs').innerHTML = `<div class="panel"><h5>Subscriptions</h5>${table(['Rider', 'Plan', 'Route', 'Period', 'Status', 'Driver'], subs.map((s) => `<tr><td>${esc(s.userName)}</td><td>${esc(s.planName)}<br><small class="muted">${inr(s.amount)}</small></td><td>${esc(s.pickup)} to ${esc(s.drop)}<br><small class="muted">${esc(s.pickupTime)} / ${esc(s.dropTime)}</small></td><td>${fd(s.startDate)} – ${fd(s.endDate)}</td><td><span class="status ${s.status}">${label(s.status)}</span></td><td>${s.status === 'active' ? `<select class="form-select form-select-sm" onchange="assign('${s.id}',this.value)">${opts(s.driverId)}</select>` : esc(s.driverName || '-')}</td></tr>`), 'No paid subscriptions yet.')}</div>`;
}
function assign(id, driverId) { if (!driverId) return; run(async () => { await api(`/admin/subscriptions/${id}/driver`, { method: 'PUT', body: { driverId } }); toast('Driver assigned.'); all(); }); }

async function driversT() {
  const d = await api('/admin/drivers');
  $('drivers').innerHTML = `<div class="panel"><h5>Drivers</h5>${table(['Driver', 'Vehicle', 'Licence & documents', 'Riders', 'Status', ''], d.map((x) => `<tr><td>${esc(x.name)}<br><small class="muted">${esc(x.mobile)} ${esc(x.email)}</small></td><td>${esc(x.vehicle.model)}<br><small class="muted">${esc(x.vehicle.number)}</small></td><td>${esc(x.licenseNo) || '-'}<br><small class="muted">${esc((x.documents || []).join(', ')) || 'No documents listed'}</small></td><td>${x.riders}/${x.capacity}</td><td><span class="status ${x.verified ? 'active' : 'open'}">${x.verified ? 'verified' : 'pending'}</span></td><td><button class="btn btn-sm ${x.verified ? 'btn-outline-danger' : 'btn-green'}" onclick="verify('${x.id}',${!x.verified})">${x.verified ? 'Remove verification' : 'Verify driver'}</button></td></tr>`), 'No drivers yet.')}</div>`;
}
function verify(id, v) { run(async () => { await api(`/admin/drivers/${id}/verify`, { method: 'PUT', body: { verified: v } }); toast(v ? 'Driver verified.' : 'Verification removed.'); all(); }); }

async function usersT() {
  const u = await api('/admin/users');
  $('users').innerHTML = `<div class="panel"><h5>Riders</h5>${table(['Name', 'Contact', 'Default route', 'Joined', 'Active plan'], u.map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.email)}<br><small class="muted">${esc(x.mobile)}</small></td><td>${esc(x.pickup) || '-'}${x.drop ? ' to ' + esc(x.drop) : ''}</td><td>${fd(x.createdAt)}</td><td>${esc(x.subscription)}</td></tr>`), 'No riders have signed up yet.')}</div>`;
}

async function plansT() {
  const p = await api('/admin/plans');
  $('plansT').innerHTML = `<div class="row g-3"><div class="col-lg-8"><div class="panel"><h5>Plans and pricing</h5>${table(['Plan', 'Months', 'Price (₹)', 'Visible', ''], p.map((x) => `<tr><td><input class="form-control form-control-sm" id="pn_${x.id}" value="${esc(x.name)}"></td><td><input type="number" min="1" class="form-control form-control-sm" id="pm_${x.id}" value="${x.months}"></td><td><input type="number" min="1" class="form-control form-control-sm" id="pa_${x.id}" value="${x.amount}"></td><td><input type="checkbox" class="form-check-input" id="pv_${x.id}" ${x.active ? 'checked' : ''} aria-label="Visible"></td><td><button class="btn btn-sm btn-green" onclick="savePlan('${x.id}')">Save</button></td></tr>`))}</div></div>
  <div class="col-lg-4"><form class="panel" onsubmit="return addPlan(event)"><h5>Add a plan</h5><input class="form-control mb-2" id="np_n" placeholder="Name" required><input type="number" min="1" class="form-control mb-2" id="np_m" placeholder="Duration in months" required><input type="number" min="1" class="form-control mb-3" id="np_a" placeholder="Price in ₹" required><button class="btn btn-sr">Add plan</button></form></div></div>`;
}
function savePlan(id) { run(async () => { await api('/admin/plans/' + id, { method: 'PUT', body: { name: $('pn_' + id).value, months: +$('pm_' + id).value, amount: +$('pa_' + id).value, active: $('pv_' + id).checked } }); toast('Plan saved.'); }); }
function addPlan(e) { e.preventDefault(); run(async () => { await api('/admin/plans', { method: 'POST', body: { name: $('np_n').value, months: $('np_m').value, amount: $('np_a').value, perks: ['Same driver & vehicle', 'Fixed daily schedule'] } }); toast('Plan added.'); plansT(); }); return false; }

async function complaintsT() {
  const c = await api('/admin/complaints');
  $('cmp').innerHTML = `<div class="panel"><h5>Complaints and feedback</h5>${c.length ? c.map((x) => `<div class="py-3 border-top"><div class="d-flex justify-content-between"><div><strong>${esc(x.subject)}</strong> <span class="status ${x.status}">${x.status}</span><br><small class="muted">${esc(x.type)} from ${esc(x.userName)} on ${fd(x.createdAt)}</small></div></div><p class="my-2">${esc(x.message)}</p>
   <div class="input-group"><input class="form-control" id="rs_${x.id}" placeholder="Write a reply" value="${esc(x.response)}"><button class="btn btn-green" onclick="reply('${x.id}','resolved')">Reply and resolve</button>${x.status === 'resolved' ? `<button class="btn btn-outline-secondary" onclick="reply('${x.id}','open')">Reopen</button>` : ''}</div></div>`).join('') : '<div class="empty">No complaints or feedback yet.</div>'}</div>`;
}
function reply(id, status) { run(async () => { await api('/admin/complaints/' + id, { method: 'PUT', body: { response: $('rs_' + id).value, status } }); toast('Updated.'); all(); }); }
init();
