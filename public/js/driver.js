let me, date = today();
async function init() { me = await guard('driver'); if (!me) return; $('bar').innerHTML = topbar(me.name); renderRoute(); renderVehicle(); renderEarn(); }

async function renderRoute() {
  const [r, att] = await Promise.all([api('/driver/route'), api('/driver/attendance?date=' + date)]);
  const st = (sid, leg) => (att.find((a) => a.subscriptionId === sid && a.leg === leg) || {}).status;
  const btns = (sid, leg) => { const s = st(sid, leg); return `<div class="btn-group btn-group-sm"><button class="btn ${s === 'completed' ? 'btn-success' : 'btn-outline-success'}" onclick="mark('${sid}','${leg}','completed')">Done</button><button class="btn ${s === 'absent' ? 'btn-danger' : 'btn-outline-danger'}" onclick="mark('${sid}','${leg}','absent')">Absent</button></div>`; };
  $('route').innerHTML = `${r.verified ? '' : '<div class="alert alert-warning">Your account is waiting for verification. You will receive riders once the admin approves your documents.</div>'}
  <div class="panel"><div class="d-flex justify-content-between align-items-center flex-wrap gap-2"><h5 class="mb-0">Riders on your route</h5><input type="date" class="form-control w-auto" value="${date}" max="${today()}" onchange="date=this.value;renderRoute()" aria-label="Attendance date"></div>
  ${table(['Rider', 'Pickup', 'Drop', 'Morning pickup', 'Evening drop'], r.riders.map((x) => `<tr><td><strong>${esc(x.name)}</strong><br><a href="tel:${esc(x.mobile)}">${esc(x.mobile)}</a></td><td>${esc(x.pickup)}<br><small class="muted">${esc(x.pickupTime)}</small></td><td>${esc(x.drop)}<br><small class="muted">${esc(x.dropTime)}</small></td><td>${btns(x.subscriptionId, 'pickup')}</td><td>${btns(x.subscriptionId, 'drop')}</td></tr>`), 'No riders assigned yet.')}</div>`;
}
function mark(subscriptionId, leg, status) { run(async () => { await api('/driver/attendance', { method: 'POST', body: { subscriptionId, leg, status, date } }); renderRoute(); renderEarn(); }); }

async function renderVehicle() {
  const { driver: d } = await api('/driver/profile');
  $('vehicle').innerHTML = `<form class="panel" style="max-width:640px" onsubmit="return saveV(event)"><h5>Vehicle and documents</h5><p>Status: <span class="status ${d.verified ? 'active' : 'open'}">${d.verified ? 'Verified' : 'Waiting for verification'}</span></p>
  <div class="row"><div class="col-sm-6"><label class="form-label">Vehicle model</label><input class="form-control mb-3" id="vm" value="${esc(d.vehicle.model)}"></div><div class="col-sm-6"><label class="form-label">Vehicle number</label><input class="form-control mb-3" id="vn" value="${esc(d.vehicle.number)}"></div></div>
  <div class="row"><div class="col-sm-6"><label class="form-label">Seats for riders</label><input type="number" min="1" max="8" class="form-control mb-3" id="vs" value="${d.vehicle.seats}"></div><div class="col-sm-6"><label class="form-label">Driving licence number</label><input class="form-control mb-3" id="vl" value="${esc(d.licenseNo)}"></div></div>
  <label class="form-label">Documents you hold (one per line)</label><textarea class="form-control mb-3" id="vd" rows="3" placeholder="Driving licence&#10;RC book&#10;Insurance">${esc((d.documents || []).join('\n'))}</textarea>
  <button class="btn btn-green">Save details</button></form>`;
}
function saveV(e) { e.preventDefault(); run(async () => { await api('/driver/profile', { method: 'PUT', body: { vehicleModel: $('vm').value, vehicleNumber: $('vn').value, seats: $('vs').value, licenseNo: $('vl').value, documents: $('vd').value.split('\n').map((x) => x.trim()).filter(Boolean) } }); toast('Details saved. The admin will review them.'); renderVehicle(); }); return false; }

async function renderEarn() {
  const e = await api('/driver/earnings');
  $('earn').innerHTML = `<div class="row g-3 mb-3"><div class="col-sm-4"><div class="kpi"><div class="v">${inr(e.total)}</div><div class="l">Total earned</div></div></div><div class="col-sm-4"><div class="kpi"><div class="v">${e.trips}</div><div class="l">Completed trips</div></div></div><div class="col-sm-4"><div class="kpi"><div class="v">${e.share}%</div><div class="l">Your share of each trip</div></div></div></div>
  <div class="panel"><h5>Monthly payout summary</h5>${table(['Month', 'Trips', 'Payout'], e.months.map((m) => `<tr><td>${m.month}</td><td>${m.trips}</td><td>${inr(m.amount)}</td></tr>`), 'Complete a pickup or drop to start earning.')}</div>`;
}
init();
