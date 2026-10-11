/* NyumbaFlow front end. Plain JavaScript, no build step.
   This file contains no passwords or secrets. All access control is enforced by the database
   (see supabase/schema.sql) and by the admin-users Edge Function. What is hidden here is only
   hidden for convenience; what is protected is protected on the server. */
(function () {
'use strict';
if (window.top !== window.self) { document.body.textContent = 'This page cannot be shown inside another site.'; return; }

var CFG = window.NF_CONFIG || {};
var ROOT = document.getElementById('root');

/* ---------- helpers ---------- */
function $(s, el) { return (el || document).querySelector(s); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function KSH(n) { return 'KSh ' + Math.round(n).toLocaleString('en-GB'); }
function pad(n) { return String(n).padStart(2, '0'); }
function sum(a, f) { var t = 0; for (var i = 0; i < a.length; i++) t += f(a[i]); return t; }
function ymOf(s) { var p = String(s).split('-').map(Number); return p[0] * 12 + (p[1] - 1); }
function ymStr(n) { return Math.floor(n / 12) + '-' + pad(n % 12 + 1); }
function monthName(n) { return new Date(Math.floor(n / 12), n % 12, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' }); }
function monthShort(n) { return new Date(Math.floor(n / 12), n % 12, 1).toLocaleString('en-GB', { month: 'short' }); }
function fmtDate(s) { var p = String(s || '').split('-').map(Number); if (p.length < 3 || isNaN(p[0])) return esc(s); return p[2] + ' ' + new Date(p[0], p[1] - 1, 1).toLocaleString('en-GB', { month: 'short' }) + ' ' + p[0]; }
function validDate(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; var d = new Date(s + 'T00:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === s; }
function parseAmount(s) { var t = String(s).replace(/[,\s]/g, ''); if (!/^\d{1,8}$/.test(t)) return null; var n = parseInt(t, 10); return n >= 1 && n <= 10000000 ? n : null; }
function normPhone(s) { var t = String(s).replace(/[\s-]/g, ''); if (!/^(?:\+254|0)[17]\d{8}$/.test(t)) return null; return t.charAt(0) === '0' ? '+254' + t.slice(1) : t; }
function maskPhone(p) { return String(p || '').replace(/^(\+254)(\d)\d{2}\d{3}(\d{3})$/, '$1 $2•• ••• $3'); }
function showPhone(p) { return String(p || '').replace(/^(\+254)(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3 $4'); }
function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

var NAIROBI = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' });
var TODAY, DAY, NOWYM;
function tick() { TODAY = NAIROBI.format(new Date()); DAY = Number(TODAY.slice(8, 10)); NOWYM = ymOf(TODAY); }
tick();

var ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10', door: 'M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M4 21h16M14 12h.01',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  cash: 'M3 7h18v10H3zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4M6 10h.01M18 14h.01', receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z', chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', more: 'M5 12h.01M12 12h.01M19 12h.01',
  key: 'M21 2l-2 2m-7.6 7.6a5 5 0 1 1-7 7 5 5 0 0 1 7-7zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4'
};
function icon(n) { return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICONS[n] + '"/></svg>'; }
var MARK = '<span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7M6 10v9h12v-9"/></svg></span>';

var CATS = ['Repairs', 'Water', 'Electricity', 'Security', 'Caretaker', 'Cleaning', 'Land rates', 'Insurance', 'Other'];
var UTYPES = ['Bedsitter', 'Studio', '1 Bedroom', '2 Bedroom', '3 Bedroom', 'Shop'];
var METHODS = ['M-Pesa', 'Cash', 'Bank', 'Other'];

/* ---------- state ---------- */
var sb = null, ME = null, D = emptyData(), M = {};
var UI = { view: 'overview', q: '', tenantTab: 'active', unitFilter: 'all', rentFilter: 'all', expMonth: 'all', repFilter: 'open', reveal: {}, confirm: null, includePhone: false, audit: [], auditLoading: false };
function emptyData() { return { props: [], units: [], tenancies: [], payments: [], expenses: [], repairs: [], profiles: [], settings: [] }; }

var NAVDEF = {
  overview: ['Overview', 'home'], units: ['Units', 'door'], tenants: ['Tenants', 'users'], rent: ['Rent', 'cash'], expenses: ['Expenses', 'receipt'],
  repairs: ['Repairs', 'wrench'], reports: ['Reports', 'chart'], accounts: ['Accounts', 'key'], audit: ['Audit log', 'shield'],
  mine: ['My rent', 'cash'], account: ['My account', 'user'], more: ['More', 'more']
};
var NAVS = {
  caretaker: { side: ['overview', 'rent', 'tenants', 'units', 'expenses', 'repairs', 'reports', 'accounts', 'audit', 'account'], tabs: ['overview', 'rent', 'tenants', 'units', 'more'], more: ['expenses', 'repairs', 'reports', 'accounts', 'audit', 'account'] },
  landlord: { side: ['overview', 'units', 'tenants', 'rent', 'expenses', 'repairs', 'reports', 'account'], tabs: ['overview', 'rent', 'tenants', 'units', 'more'], more: ['expenses', 'repairs', 'reports', 'account'] },
  tenant: { side: ['mine', 'repairs', 'account'], tabs: ['mine', 'repairs', 'account'], more: [] }
};
var ROLE_LABEL = { caretaker: 'Caretaker', landlord: 'Landlord', tenant: 'Tenant' };
function isCaretaker() { return !!ME && ME.role === 'caretaker'; }
function allowedView(v) { return !!ME && NAVS[ME.role].side.concat(['more']).indexOf(v) > -1 && (v !== 'more' || NAVS[ME.role].more.length > 0); }

/* ---------- server calls ---------- */
function errMsg(e) {
  if (!e) return 'Something went wrong. Try again.';
  if (e.fn) return e.message;
  var c = String(e.code || ''), m = String(e.message || '');
  if (c === '23505') {
    if (/payments_ref/.test(m)) return 'That M-Pesa code is already recorded on another payment.';
    if (/tenancies_one_active/.test(m)) return 'That unit or tenant already has an active tenancy.';
    return 'That already exists.';
  }
  if (c === '42501') return 'You do not have permission to do that.';
  if (c === '23514' || c === '23502' || c === '22P02' || c === '22007') return 'Some details are not valid. Check them and try again.';
  if (c === 'P0001' && m) return m;
  if (/fetch|network|failed to load/i.test(m)) return 'No connection. Check your internet and try again.';
  return 'The action did not work. Check your connection and try again.';
}
function isAuthError(e) { return !!e && (e.status === 401 || e.code === 'PGRST301' || e.code === 'PGRST303' || /jwt|not authenticated/i.test(String(e.message || ''))); }
function run(p) { return Promise.resolve(p).then(function (r) { if (r && r.error) throw r.error; return r ? r.data : null; }); }

function fetchAll(table) {
  var out = [];
  function page(from) {
    return run(sb.from(table).select('*').order('id', { ascending: true }).range(from, from + 999)).then(function (rows) {
      out = out.concat(rows || []);
      return (rows && rows.length === 1000) ? page(from + 1000) : out;
    });
  }
  return page(0);
}
function loadAll() {
  tick();
  return Promise.all(['properties', 'units', 'tenancies', 'payments', 'expenses', 'repairs', 'profiles', 'settings'].map(function (t) {
    return t === 'settings' ? run(sb.from('settings').select('*')) : fetchAll(t);
  })).then(function (r) {
    D = { props: r[0], units: r[1], tenancies: r[2], payments: r[3], expenses: r[4], repairs: r[5], profiles: r[6], settings: r[7] || [] };
    build();
  });
}
function callFn(action, payload) {
  return sb.auth.getSession().then(function (r) {
    var s = r && r.data && r.data.session;
    if (!s) throw { status: 401, message: 'Please sign in again.', fn: true };
    return fetch(CFG.SUPABASE_URL + '/functions/v1/' + (CFG.FUNCTION_NAME || 'admin-users'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.access_token, 'apikey': CFG.SUPABASE_KEY },
      body: JSON.stringify(Object.assign({ action: action }, payload))
    });
  }).then(function (res) {
    return res.json().catch(function () { return null; }).then(function (body) {
      if (!res.ok) throw { status: res.status, message: (body && body.error) || 'The server could not complete the request.', fn: true };
      return body;
    });
  });
}

/* ---------- derived data ---------- */
function idx(a) { var o = {}; a.forEach(function (x) { o[x.id] = x; }); return o; }
function build() {
  M.prop = idx(D.props); M.unit = idx(D.units); M.prof = idx(D.profiles);
  M.payBy = {}; D.payments.forEach(function (p) { (M.payBy[p.tenancy_id] = M.payBy[p.tenancy_id] || []).push(p); });
  M.activeByUnit = {}; D.tenancies.forEach(function (t) { if (t.active) M.activeByUnit[t.unit_id] = t; });
  M.set = {}; D.settings.forEach(function (s) { M.set[s.key] = s.value; });
}
function propName(id) { return (M.prop[id] || {}).name || 'All properties'; }
function unitName(id) { var u = M.unit[id]; return u ? u.label + ' · ' + propName(u.property_id) : '—'; }
function tnName(tn) { return (M.prof[tn.tenant_id] || {}).full_name || 'Tenant'; }
function tnPhone(tn) { return (M.prof[tn.tenant_id] || {}).phone || ''; }
function validPays(tn) { return (M.payBy[tn.id] || []).filter(function (p) { return !p.voided; }); }
function tStats(tn) {
  var endYM = tn.end_date ? ymOf(tn.end_date) : NOWYM;
  var months = Math.max(0, endYM - ymOf(tn.start_date) + 1);
  var charged = months * tn.rent;
  var mine = validPays(tn);
  var paid = sum(mine, function (p) { return p.amount; });
  var thisMonth = sum(mine.filter(function (p) { return ymOf(p.paid_on) === NOWYM; }), function (p) { return p.amount; });
  var bal = charged - paid;
  var behind = bal > 0 ? Math.ceil(bal / tn.rent - 1e-9) : 0;
  var st;
  if (!tn.active) st = bal > 0 ? 'owing' : 'closed';
  else if (bal <= 0) st = 'paid';
  else if (behind >= 2) st = 'overdue';
  else if (thisMonth > 0) st = 'partial';
  else st = DAY > tn.due_day ? 'late' : 'due';
  return { charged: charged, paid: paid, bal: bal, behind: behind, thisMonth: thisMonth, status: st };
}
var STATUS = { paid: ['Paid up', 'good'], due: ['Due', 'acc'], partial: ['Partial', 'warn'], late: ['Late', 'warn'], overdue: ['Overdue', 'bad'], owing: ['Moved out, owes', 'bad'], closed: ['Moved out', ''] };
var ORDER = { overdue: 0, late: 1, partial: 2, due: 3, paid: 4 };
function chip(st) { var s = STATUS[st]; return '<span class="chip ' + s[1] + '">' + s[0] + '</span>'; }
function monthStats(m) {
  var expected = sum(D.tenancies.filter(function (t) { return ymOf(t.start_date) <= m && (!t.end_date || m <= ymOf(t.end_date)); }), function (t) { return t.rent; });
  var collected = sum(D.payments.filter(function (p) { return !p.voided && ymOf(p.paid_on) === m; }), function (p) { return p.amount; });
  var spent = sum(D.expenses.filter(function (e) { return ymOf(e.spent_on) === m; }), function (e) { return e.amount; });
  return { m: m, expected: expected, collected: collected, spent: spent, net: collected - spent };
}
function lastMonths(n) { var a = []; for (var i = n - 1; i >= 0; i--) a.push(monthStats(NOWYM - i)); return a; }
function activeTenancies() { return D.tenancies.filter(function (t) { return t.active; }); }

/* ---------- shared view pieces ---------- */
function head(title, sub, actions) { return '<div class="vh"><div><h1>' + esc(title) + '</h1>' + (sub ? '<p class="sub">' + sub + '</p>' : '') + '</div><div class="va">' + (actions || '') + '</div></div>'; }
function niceMax(v) { if (v <= 0) return 1000; var p = Math.pow(10, Math.floor(Math.log10(v))); var n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
function kfmt(v) { return v >= 1e6 ? (v / 1e6) + 'M' : (v / 1000) + 'k'; }
function chartSVG(ms) {
  var W = 360, H = 210, L = 38, B = 26, T = 10, R = 6, pw = W - L - R, ph = H - B - T;
  var max = niceMax(Math.max.apply(null, ms.map(function (x) { return Math.max(x.expected, x.collected); }).concat([1])));
  var g = pw / ms.length, bw = Math.min(18, g / 2 - 4), out = '';
  [0, 0.5, 1].forEach(function (f) { var y = T + ph - ph * f; out += '<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (L - 6) + '" y="' + (y + 3) + '" text-anchor="end">' + kfmt(max * f) + '</text>'; });
  ms.forEach(function (x, i) {
    var cx = L + g * i + g / 2, he = ph * x.expected / max, hc = ph * x.collected / max;
    out += '<rect class="exp" x="' + (cx - bw - 1) + '" y="' + (T + ph - he) + '" width="' + bw + '" height="' + he + '" rx="2"><title>' + esc(monthName(x.m)) + ' expected ' + KSH(x.expected) + '</title></rect>';
    out += '<rect class="col" x="' + (cx + 1) + '" y="' + (T + ph - hc) + '" width="' + bw + '" height="' + hc + '" rx="2"><title>' + esc(monthName(x.m)) + ' collected ' + KSH(x.collected) + '</title></rect>';
    out += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + monthShort(x.m) + '</text>';
  });
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Rent expected and collected, last six months">' + out + '</svg>';
}
function seg(label, key, cur, opts, act) {
  return '<div class="seg" role="group" aria-label="' + esc(label) + '">' + opts.map(function (x) { return '<button type="button" data-act="' + act + '" data-v="' + x[0] + '" aria-pressed="' + (cur === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
}
function btn(act, label, id, cls, extra) { return '<button class="btn ' + (cls || 'sm') + '" data-act="' + act + '"' + (id ? ' data-id="' + esc(id) + '"' : '') + (extra || '') + '>' + label + '</button>'; }
function tenancyRowShort(tn, s) {
  return '<li class="item"><div class="item-main"><b>' + esc(tnName(tn)) + '</b><span class="sub">' + esc(unitName(tn.unit_id)) + '</span></div><div class="item-nums">' + chip(s.status) + '<span class="amt">' + KSH(s.bal) + '</span></div>' +
    (isCaretaker() ? '<div class="item-actions">' + btn('pay', 'Record payment', tn.id, 'sm primary') + btn('remind', 'Reminder', tn.id) + '</div>' : '') + '</li>';
}

/* ---------- views ---------- */
function overview() {
  var act = activeTenancies().map(function (t) { return { t: t, s: tStats(t) }; });
  var ms = monthStats(NOWYM);
  var arr = act.filter(function (x) { return x.s.bal > 0; }).sort(function (a, b) { return b.s.bal - a.s.bal; });
  var vac = D.units.filter(function (u) { return !M.activeByUnit[u.id]; });
  var occ = D.units.length - vac.length;
  var open = D.repairs.filter(function (r) { return r.status !== 'done'; });
  var urgent = open.filter(function (r) { return r.priority === 'Urgent' || r.priority === 'High'; });
  var pct = ms.expected ? Math.round(ms.collected / ms.expected * 100) : 0;
  var occPct = D.units.length ? Math.round(occ / D.units.length * 100) : 0;
  var h = head('Overview', fmtDate(TODAY), isCaretaker() ? btn('pay', 'Record payment', '', 'primary') + btn('addTenant', 'Add tenant', '', '') : '');
  h += '<div class="grid kpis">' +
    '<div class="card"><p class="kpi-l">Collected, ' + esc(monthShort(NOWYM)) + '</p><p class="kpi-v">' + KSH(ms.collected) + '</p><p class="kpi-s">of ' + KSH(ms.expected) + ' expected · ' + pct + '%</p><div class="bar" aria-hidden="true"><i data-w="' + Math.min(100, pct) + '"></i></div></div>' +
    '<div class="card"><p class="kpi-l">Arrears</p><p class="kpi-v">' + KSH(sum(arr, function (x) { return x.s.bal; })) + '</p><p class="kpi-s">' + arr.length + ' tenant' + (arr.length === 1 ? '' : 's') + ' owing</p></div>' +
    '<div class="card"><p class="kpi-l">Occupancy</p><p class="kpi-v">' + occ + ' of ' + D.units.length + '</p><p class="kpi-s">' + vac.length + ' vacant · ' + KSH(sum(vac, function (u) { return u.rent; })) + '/month unrented</p><div class="bar" aria-hidden="true"><i data-w="' + occPct + '"></i></div></div>' +
    '<div class="card"><p class="kpi-l">Open repairs</p><p class="kpi-v">' + open.length + '</p><p class="kpi-s">' + urgent.length + ' urgent or high priority</p></div></div>';
  h += '<div class="grid two"><div class="card"><div class="sec-h"><h2>Rent, last 6 months</h2></div><div class="legend"><span><i class="l1"></i>Expected</span><span><i class="l2"></i>Collected</span></div>' + chartSVG(lastMonths(6)) + '<p class="sub">Collected is cash received in the month, including late and partial payments.</p></div>';
  h += '<div class="card"><div class="sec-h"><h2>Needs attention</h2></div><h3 class="sub mt4">Largest arrears</h3>';
  h += arr.length ? '<ul class="list">' + arr.slice(0, 4).map(function (x) { return tenancyRowShort(x.t, x.s); }).join('') + '</ul>' : '<p class="empty">No arrears. Every tenant is paid up.</p>';
  if (urgent.length) h += '<h3 class="sub mt14">Urgent repairs</h3><ul class="list">' + urgent.slice(0, 3).map(function (r) { return '<li class="item"><div class="item-main"><b>' + esc(r.title) + '</b><span class="sub">' + esc(r.unit_id ? unitName(r.unit_id) : propName(r.property_id)) + '</span></div><div class="item-nums"><span class="chip ' + (r.priority === 'Urgent' ? 'bad' : 'warn') + '">' + esc(r.priority) + '</span></div></li>'; }).join('') + '</ul>';
  if (vac.length) h += '<h3 class="sub mt14">Vacant units</h3><ul class="list">' + vac.slice(0, 3).map(function (u) { return '<li class="item"><div class="item-main"><b>' + esc(u.label) + ' · ' + esc(u.type) + '</b><span class="sub">' + esc(propName(u.property_id)) + ' · ' + KSH(u.rent) + '/month</span></div>' + (isCaretaker() ? '<div class="item-actions">' + btn('addTenant', 'Add tenant', u.id, 'sm') + '</div>' : '') + '</li>'; }).join('') + '</ul>';
  return h + '</div></div>';
}
function units() {
  var f = UI.unitFilter, cr = isCaretaker();
  var h = head('Units', 'Properties, units and vacancy', cr ? btn('addProp', 'Add property', '', '') + btn('addUnit', 'Add unit', '', 'primary') : '');
  h += seg('Filter units', 'unitFilter', f, [['all', 'All'], ['vacant', 'Vacant'], ['occupied', 'Occupied']], 'unitFilter');
  if (!D.props.length) return h + '<div class="card empty">' + (cr ? 'No properties yet. Add your first property to begin.' : 'No properties are linked to your account yet.') + '</div>';
  D.props.forEach(function (p) {
    var us = D.units.filter(function (u) { return u.property_id === p.id; }).sort(function (a, b) { return a.label.localeCompare(b.label, 'en', { numeric: true }); });
    var vc = us.filter(function (u) { return !M.activeByUnit[u.id]; }).length;
    var shown = us.filter(function (u) { var o = !!M.activeByUnit[u.id]; return f === 'all' || (f === 'vacant' && !o) || (f === 'occupied' && o); });
    var owner = M.prof[p.landlord_id];
    h += '<section class="card"><div class="prop-h"><div><h2>' + esc(p.name) + '</h2><span class="sub">' + esc(p.area) + (cr ? ' · Landlord: ' + esc(owner ? owner.full_name : 'not assigned') : '') + '</span></div><span class="sub">' + (us.length - vc) + ' of ' + us.length + ' occupied</span></div>';
    h += shown.length ? '<div class="units">' + shown.map(function (u) {
      var t = M.activeByUnit[u.id];
      return '<div class="unit' + (t ? '' : ' vacant') + '"><div class="unit-top"><b>' + esc(u.label) + '</b><span class="chip ' + (t ? 'good' : '') + '">' + (t ? 'Occupied' : 'Vacant') + '</span></div><span class="sub">' + esc(u.type) + ' · ' + KSH(u.rent) + '</span><span>' + (t ? esc(tnName(t)) : '<span class="sub">Available to let</span>') + '</span>' +
        (cr ? '<div class="item-actions">' + (t ? '' : btn('addTenant', 'Add tenant', u.id, 'sm primary')) + btn('editUnit', 'Edit', u.id) + '</div>' : '') + '</div>';
    }).join('') + '</div>' : '<p class="empty">No units match this filter.</p>';
    if (cr) h += '<div class="item-actions mt8">' + btn('editProp', 'Edit property', p.id) + '</div>';
    h += '</section>';
  });
  return h;
}
function tenants() {
  var q = UI.q.trim().toLowerCase(), tab = UI.tenantTab, cr = isCaretaker();
  var rows = D.tenancies.filter(function (t) { return tab === 'active' ? t.active : !t.active; }).filter(function (t) { return !q || tnName(t).toLowerCase().indexOf(q) > -1 || unitName(t.unit_id).toLowerCase().indexOf(q) > -1; })
    .sort(function (a, b) { return tnName(a).localeCompare(tnName(b)); });
  var h = head('Tenants', activeTenancies().length + ' active', cr ? btn('addTenant', 'Add tenant', '', 'primary') : '');
  h += '<div class="toolbar"><input class="search" id="q" type="search" placeholder="Search name or unit" aria-label="Search tenants" value="' + esc(UI.q) + '" maxlength="60" autocomplete="off">' + seg('Tenant list', 'tenantTab', tab, [['active', 'Active'], ['past', 'Moved out']], 'tenantTab') + '</div>';
  h += '<div class="card">' + (rows.length ? '<ul class="list">' + rows.map(function (t) {
    var s = tStats(t), shown = UI.reveal[t.id], prof = M.prof[t.tenant_id] || {};
    return '<li class="item"><div class="item-main"><b>' + esc(tnName(t)) + '</b><span class="sub">' + esc(unitName(t.unit_id)) + ' · ' + KSH(t.rent) + '/month</span><span class="sub num">' + esc(shown ? showPhone(tnPhone(t)) : maskPhone(tnPhone(t))) + btn('reveal', shown ? 'Hide' : 'Show', t.id, 'sm ml6') + '</span><span class="sub">Since ' + fmtDate(t.start_date) + (t.end_date ? ' to ' + fmtDate(t.end_date) : '') + (t.deposit ? ' · Deposit ' + KSH(t.deposit) : '') + '</span>' + (t.note ? '<span class="sub">' + esc(t.note) + '</span>' : '') + '</div><div class="item-nums">' + chip(s.status) + (prof.active === false ? '<span class="chip bad">Login disabled</span>' : '') + '<span class="amt">' + (s.bal > 0 ? KSH(s.bal) + ' owed' : (s.bal < 0 ? KSH(-s.bal) + ' credit' : 'Balance nil')) + '</span></div>' +
      (cr ? '<div class="item-actions">' + (t.active ? btn('pay', 'Record payment', t.id, 'sm primary') : '') + (s.bal > 0 ? btn('remind', 'Reminder', t.id) : '') + btn('editTenant', 'Edit', t.id) + (t.active ? btn('moveOut', 'Move out', t.id) : '') + '</div>' : '') + '</li>';
  }).join('') + '</ul>' : '<p class="empty">' + (q ? 'No tenants match your search.' : 'Nothing here yet.') + '</p>') + '</div>';
  return h;
}
function rent() {
  var cr = isCaretaker(), f = UI.rentFilter;
  var act = activeTenancies().map(function (t) { return { t: t, s: tStats(t) }; });
  var match = function (x) { return f === 'all' || (f === 'paid' && x.s.status === 'paid') || (f === 'partial' && x.s.status === 'partial') || (f === 'unpaid' && (x.s.status === 'due' || x.s.status === 'late')) || (f === 'overdue' && x.s.status === 'overdue'); };
  var rows = act.filter(match).sort(function (a, b) { return ORDER[a.s.status] - ORDER[b.s.status] || b.s.bal - a.s.bal; });
  var ms = monthStats(NOWYM);
  var h = head('Rent', esc(monthName(NOWYM)) + ' · ' + KSH(ms.collected) + ' of ' + KSH(ms.expected) + ' received', cr ? btn('pay', 'Record payment', '', 'primary') : '');
  h += seg('Filter by status', 'rentFilter', f, [['all', 'All'], ['unpaid', 'Due or late'], ['partial', 'Partial'], ['overdue', 'Overdue'], ['paid', 'Paid up']], 'rentFilter');
  h += '<div class="card">' + (rows.length ? '<ul class="list">' + rows.map(function (x) {
    var t = x.t, s = x.s;
    return '<li class="item"><div class="item-main"><b>' + esc(tnName(t)) + '</b><span class="sub">' + esc(unitName(t.unit_id)) + ' · due on the ' + ordinal(t.due_day) + '</span><span class="sub">Rent ' + KSH(t.rent) + ' · received this month ' + KSH(s.thisMonth) + '</span></div><div class="item-nums">' + chip(s.status) + '<span class="amt">' + (s.bal > 0 ? KSH(s.bal) + ' owed' : (s.bal < 0 ? KSH(-s.bal) + ' credit' : 'Nil')) + '</span></div>' +
      (cr ? '<div class="item-actions">' + btn('pay', 'Record payment', t.id, 'sm primary') + (s.bal > 0 ? btn('remind', 'Reminder', t.id) : '') + '</div>' : '') + '</li>';
  }).join('') + '</ul>' : '<p class="empty">No tenants in this view.</p>') + '</div>';
  var pays = D.payments.slice().sort(function (a, b) { return a.paid_on < b.paid_on ? 1 : a.paid_on > b.paid_on ? -1 : (a.created_at < b.created_at ? 1 : -1); }).slice(0, 12);
  h += '<div class="card"><div class="sec-h"><h2>Recent payments</h2><span class="sub">Recorded by the caretaker. Wrong entries are voided, never deleted.</span></div>' + (pays.length ? '<ul class="list">' + pays.map(function (p) {
    var t = M.tn ? null : null; var tn = D.tenancies.filter(function (x) { return x.id === p.tenancy_id; })[0];
    return '<li class="item"><div class="item-main"><b' + (p.voided ? ' class="pre"' : '') + '>' + esc(tn ? tnName(tn) : 'Tenant') + (p.voided ? ' (voided)' : '') + '</b><span class="sub">' + fmtDate(p.paid_on) + ' · ' + esc(p.method) + (p.ref ? ' · ' + esc(p.ref) : '') + (p.note ? ' · ' + esc(p.note) : '') + '</span>' + (p.voided ? '<span class="sub">Voided: ' + esc(p.void_reason) + '</span>' : '') + '</div><div class="item-nums"><span class="amt">' + KSH(p.amount) + '</span>' + (cr && !p.voided ? btn('voidPay', 'Void', p.id) : '') + '</div></li>';
  }).join('') + '</ul>' : '<p class="empty">No payments recorded.</p>') + '</div>';
  return h;
}
function expenses() {
  var cr = isCaretaker(), mset = {};
  D.expenses.forEach(function (e) { mset[ymOf(e.spent_on)] = 1; });
  var months = Object.keys(mset).map(Number).sort(function (a, b) { return b - a; });
  var f = UI.expMonth;
  var rows = D.expenses.filter(function (e) { return f === 'all' || String(ymOf(e.spent_on)) === f; }).sort(function (a, b) { return a.spent_on < b.spent_on ? 1 : a.spent_on > b.spent_on ? -1 : 0; });
  var total = sum(rows, function (e) { return e.amount; });
  var by = {}; rows.forEach(function (e) { by[e.category] = (by[e.category] || 0) + e.amount; });
  var cats = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; });
  var h = head('Expenses', KSH(total) + (f === 'all' ? ' in total' : ' in ' + esc(monthName(Number(f)))), cr ? btn('addExpense', 'Add expense', '', 'primary') : '');
  h += '<div class="toolbar"><div class="field nm minw"><label for="expMonth">Month</label><select id="expMonth" data-change="expMonth"><option value="all"' + (f === 'all' ? ' selected' : '') + '>All months</option>' + months.map(function (m) { return '<option value="' + m + '"' + (String(m) === f ? ' selected' : '') + '>' + esc(monthName(m)) + '</option>'; }).join('') + '</select></div></div>';
  if (cats.length) h += '<div class="card"><h2>By category</h2><div class="mt8">' + cats.map(function (c) { return '<div class="catrow"><span>' + esc(c) + '</span><div class="bar" aria-hidden="true"><i data-w="' + Math.round(by[c] / total * 100) + '"></i></div><span class="num">' + KSH(by[c]) + '</span></div>'; }).join('') + '</div></div>';
  h += '<div class="card">' + (rows.length ? '<ul class="list">' + rows.map(function (e) {
    var armed = UI.confirm === 'exp:' + e.id;
    return '<li class="item"><div class="item-main"><b>' + esc(e.category) + '</b><span class="sub">' + fmtDate(e.spent_on) + ' · ' + esc(propName(e.property_id)) + (e.note ? ' · ' + esc(e.note) : '') + '</span></div><div class="item-nums"><span class="amt">' + KSH(e.amount) + '</span>' + (cr ? btn('delExpense', armed ? 'Confirm delete' : 'Delete', e.id, 'sm danger' + (armed ? ' armed' : '')) : '') + '</div></li>';
  }).join('') + '</ul>' : '<p class="empty">No expenses for this period.</p>') + '</div>';
  return h;
}
function repairs() {
  if (ME.role === 'tenant') return tenantRepairs();
  var cr = isCaretaker(), f = UI.repFilter;
  var rows = D.repairs.filter(function (r) { return f === 'all' || (f === 'open' && r.status !== 'done') || (f === 'done' && r.status === 'done'); }).sort(function (a, b) { var o = { Urgent: 0, High: 1, Medium: 2, Low: 3 }; return (a.status === 'done') - (b.status === 'done') || o[a.priority] - o[b.priority]; });
  var h = head('Repairs', 'Maintenance requests', cr ? btn('addRepair', 'New request', '', 'primary') : '');
  h += seg('Filter requests', 'repFilter', f, [['open', 'Open'], ['done', 'Done'], ['all', 'All']], 'repFilter');
  var pc = { Urgent: 'bad', High: 'warn', Medium: 'acc', Low: '' };
  h += '<div class="card">' + (rows.length ? '<ul class="list">' + rows.map(function (r) {
    var by = M.prof[r.reported_by];
    return '<li class="item"><div class="item-main"><b>' + esc(r.title) + '</b><span class="sub">' + esc(r.unit_id ? unitName(r.unit_id) : propName(r.property_id)) + ' · reported ' + fmtDate(r.reported_on) + (by && by.role === 'tenant' ? ' by ' + esc(by.full_name) : '') + (r.status === 'done' && r.done_on ? ' · done ' + fmtDate(r.done_on) : '') + '</span>' + (r.note ? '<span class="sub">' + esc(r.note) + '</span>' : '') + '</div><div class="item-nums"><span class="chip ' + (r.status === 'done' ? 'good' : pc[r.priority]) + '">' + (r.status === 'done' ? 'Done' : esc(r.priority)) + '</span><span class="amt">' + (r.status === 'done' ? KSH(r.cost) : (r.est ? 'Est. ' + KSH(r.est) : 'No estimate')) + '</span></div>' +
      (cr ? '<div class="item-actions">' + (r.status === 'open' ? btn('repStart', 'Start work', r.id) : '') + (r.status === 'progress' ? '<span class="chip warn">In progress</span>' : '') + (r.status !== 'done' ? btn('repDone', 'Mark done', r.id, 'sm primary') : btn('repReopen', 'Reopen', r.id)) + '</div>' : (r.status === 'progress' ? '<div class="item-actions"><span class="chip warn">In progress</span></div>' : '')) + '</li>';
  }).join('') + '</ul>' : '<p class="empty">No requests in this view.</p>') + '</div>';
  return h;
}
function tenantRepairs() {
  var tn = D.tenancies.filter(function (t) { return t.active; })[0];
  var rows = D.repairs.slice().sort(function (a, b) { return a.reported_on < b.reported_on ? 1 : -1; });
  var h = head('Repairs', 'Report a problem in your home and follow its progress', tn ? btn('tenantRepair', 'Report a problem', '', 'primary') : '');
  h += '<div class="card">' + (rows.length ? '<ul class="list">' + rows.map(function (r) {
    var label = r.status === 'done' ? ['Fixed', 'good'] : r.status === 'progress' ? ['In progress', 'warn'] : ['Received', 'acc'];
    return '<li class="item"><div class="item-main"><b>' + esc(r.title) + '</b><span class="sub">Reported ' + fmtDate(r.reported_on) + (r.done_on ? ' · fixed ' + fmtDate(r.done_on) : '') + '</span>' + (r.note ? '<span class="sub">' + esc(r.note) + '</span>' : '') + '</div><div class="item-nums"><span class="chip ' + label[1] + '">' + label[0] + '</span></div></li>';
  }).join('') + '</ul>' : '<p class="empty">You have not reported any problems.</p>') + '</div>';
  return h;
}
function reports() {
  var ms = lastMonths(6);
  var act = activeTenancies().map(tStats);
  var bucket = function (fn) { var a = act.filter(fn); return [a.length, sum(a, function (s) { return Math.max(0, s.bal); })]; };
  var b0 = bucket(function (s) { return s.bal <= 0; }), b1 = bucket(function (s) { return s.behind === 1; }), b2 = bucket(function (s) { return s.behind === 2; }), b3 = bucket(function (s) { return s.behind >= 3; });
  var vac = D.units.filter(function (u) { return !M.activeByUnit[u.id]; });
  var vacRent = sum(vac, function (u) { return u.rent; });
  var tc = sum(ms, function (x) { return x.collected; }), te = sum(ms, function (x) { return x.expected; }), ts = sum(ms, function (x) { return x.spent; });
  var h = head('Reports', 'Last six months, cash basis', '');
  h += '<div class="card"><h2>Monthly summary</h2><div class="tablewrap mt8"><table><thead><tr><th scope="col">Month</th><th scope="col">Expected</th><th scope="col">Collected</th><th scope="col">Rate</th><th scope="col">Expenses</th><th scope="col">Net</th></tr></thead><tbody>' + ms.map(function (x) { return '<tr><th scope="row" class="rowh">' + esc(monthShort(x.m) + ' ' + Math.floor(x.m / 12)) + '</th><td class="num">' + KSH(x.expected) + '</td><td class="num">' + KSH(x.collected) + '</td><td class="num">' + (x.expected ? Math.round(x.collected / x.expected * 100) + '%' : '—') + '</td><td class="num">' + KSH(x.spent) + '</td><td class="num">' + KSH(x.net) + '</td></tr>'; }).join('') + '<tr><td><b>Total</b></td><td class="num"><b>' + KSH(te) + '</b></td><td class="num"><b>' + KSH(tc) + '</b></td><td class="num"><b>' + (te ? Math.round(tc / te * 100) + '%' : '—') + '</b></td><td class="num"><b>' + KSH(ts) + '</b></td><td class="num"><b>' + KSH(tc - ts) + '</b></td></tr></tbody></table></div><p class="sub mt8">Net is rent received minus recorded expenses. It is a management figure, not a tax computation.</p></div>';
  h += '<div class="grid two"><div class="card"><h2>Arrears ageing</h2><div class="tablewrap mt8"><table class="narrow"><thead><tr><th scope="col">Months behind</th><th scope="col">Tenants</th><th scope="col">Amount</th></tr></thead><tbody>' + [['Up to date', b0], ['1 month', b1], ['2 months', b2], ['3 or more', b3]].map(function (x) { return '<tr><td>' + x[0] + '</td><td class="num">' + x[1][0] + '</td><td class="num">' + KSH(x[1][1]) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
  h += '<div class="card"><h2>Vacancy</h2><div class="kv mt8"><span>Vacant units</span><span>' + vac.length + ' of ' + D.units.length + '</span><span>Rent not earning</span><span>' + KSH(vacRent) + ' / month</span><span>Over 12 months</span><span>' + KSH(vacRent * 12) + '</span></div></div></div>';
  h += '<div class="card"><h2>Export CSV</h2><p class="sub mb12 mt4">Opens in Excel or Google Sheets. Cells that start with = + - or @ are escaped so a spreadsheet cannot run them as formulas.</p><label class="check"><input type="checkbox" id="incPhone" data-change="incPhone"' + (UI.includePhone ? ' checked' : '') + '><span>Include tenant phone numbers (sensitive; leave off unless needed)</span></label><div class="va">' + [['tenants', 'Tenants and balances'], ['payments', 'Payments'], ['expenses', 'Expenses'], ['repairs', 'Repairs'], ['monthly', 'Monthly summary']].map(function (x) { return btn('export', x[1], '', '', ' data-v="' + x[0] + '"'); }).join('') + '</div></div>';
  return h;
}
function accounts() {
  var lords = D.profiles.filter(function (p) { return p.role === 'landlord'; });
  var tens = D.profiles.filter(function (p) { return p.role === 'tenant'; });
  var h = head('Accounts', 'Create logins, reset passwords and switch access on or off', btn('addLandlord', 'Add landlord account', '', '') + btn('addTenant', 'Add tenant', '', 'primary'));
  function row(p, detail) {
    var armed = UI.confirm === 'dis:' + p.id;
    return '<li class="item"><div class="item-main"><b>' + esc(p.full_name) + '</b><span class="sub">Username: ' + esc(p.username) + (p.phone ? ' · ' + esc(maskPhone(p.phone)) : '') + '</span><span class="sub">' + detail + '</span></div><div class="item-nums"><span class="chip ' + (p.active ? 'good' : 'bad') + '">' + (p.active ? 'Active' : 'Disabled') + '</span></div><div class="item-actions">' + btn('resetPw', 'Reset password', p.id) + btn('editAccount', 'Edit', p.id) + (p.active ? btn('disable', armed ? 'Confirm disable' : 'Disable login', p.id, 'sm danger' + (armed ? ' armed' : '')) : btn('enable', 'Enable login', p.id)) + '</div></li>';
  }
  h += '<div class="card"><h2>Landlords</h2>' + (lords.length ? '<ul class="list">' + lords.map(function (p) { var n = D.props.filter(function (x) { return x.landlord_id === p.id; }); return row(p, n.length ? esc(n.map(function (x) { return x.name; }).join(', ')) : 'No property assigned yet'); }).join('') + '</ul>' : '<p class="empty">No landlord accounts yet.</p>') + '</div>';
  h += '<div class="card"><h2>Tenants</h2>' + (tens.length ? '<ul class="list">' + tens.map(function (p) { var t = D.tenancies.filter(function (x) { return x.tenant_id === p.id; }).sort(function (a, b) { return a.start_date < b.start_date ? 1 : -1; })[0]; return row(p, t ? esc(unitName(t.unit_id)) + (t.active ? '' : ' (moved out)') : 'No unit'); }).join('') + '</ul>' : '<p class="empty">No tenant accounts yet.</p>') + '</div>';
  h += '<div class="card"><div class="sec-h"><h2>What tenants see</h2>' + btn('settings', 'Edit', '', '') + '</div><p class="sub">Business name</p><p>' + esc(M.set.business_name || '') + '</p><p class="sub mt14">How to pay</p><p class="pre">' + esc(M.set.payment_instructions || '') + '</p></div>';
  return h;
}
function auditSummary(a) {
  var d = a.detail || {};
  switch (a.entity) {
    case 'payments': return KSH(d.amount || 0) + ' · ' + (d.method || '') + (d.voided ? ' · voided' : '');
    case 'accounts': return d.username || '';
    case 'tenancies': return unitName(d.unit_id) + (d.active === false ? ' · closed' : '');
    case 'expenses': return (d.category || '') + ' · ' + KSH(d.amount || 0);
    case 'repairs': return (d.title || '') + ' · ' + (d.status || '');
    case 'properties': return d.name || '';
    case 'units': return d.label || '';
    default: return '';
  }
}
function audit() {
  var h = head('Audit log', 'The latest 200 changes. Entries cannot be edited or deleted.', btn('refreshAudit', 'Refresh', '', ''));
  if (UI.auditLoading) return h + '<div class="card empty">Loading…</div>';
  return h + '<div class="card">' + (UI.audit.length ? '<ul class="list">' + UI.audit.map(function (a) {
    return '<li class="item"><div class="item-main"><b>' + esc(a.action) + ' · ' + esc(a.entity) + '</b><span class="sub">' + esc(auditSummary(a)) + '</span><span class="sub">' + esc(a.actor_name || 'system') + ' · ' + esc(new Date(a.at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + '</span></div></li>';
  }).join('') + '</ul>' : '<p class="empty">Nothing recorded yet.</p>') + '</div>';
}
function statementRows(tn) {
  var pays = validPays(tn);
  var endYM = tn.end_date ? ymOf(tn.end_date) : NOWYM;
  var first = ymOf(tn.start_date);
  pays.forEach(function (p) { first = Math.min(first, ymOf(p.paid_on)); });
  var rows = [], run = 0;
  for (var m = first; m <= endYM; m++) {
    var due = (m >= ymOf(tn.start_date)) ? tn.rent : 0;
    var paid = sum(pays.filter(function (p) { return ymOf(p.paid_on) === m; }), function (p) { return p.amount; });
    run += due - paid; rows.push({ m: m, due: due, paid: paid, bal: run });
  }
  return rows.reverse();
}
function mine() {
  var tn = D.tenancies.slice().sort(function (a, b) { return a.start_date < b.start_date ? 1 : -1; })[0];
  if (!tn) return head('My rent', '') + '<div class="card empty">No tenancy is linked to your account yet. Please contact the caretaker.</div>';
  var s = tStats(tn), msg;
  if (!tn.active) msg = 'Your tenancy ended on ' + fmtDate(tn.end_date) + '.';
  else if (s.status === 'paid') msg = s.bal < 0 ? 'You are paid up and have a credit. Thank you.' : 'You are paid up. Thank you.';
  else if (s.status === 'due') msg = 'Rent for ' + esc(monthName(NOWYM)) + ' is due on the ' + ordinal(tn.due_day) + '.';
  else if (s.status === 'partial') msg = 'You have paid part of this month’s rent. The balance is shown above.';
  else if (s.status === 'late') msg = 'This month’s rent was due on the ' + ordinal(tn.due_day) + '. Please pay as soon as you can.';
  else msg = 'You are ' + s.behind + ' months behind. Please speak to the caretaker.';
  var pays = (M.payBy[tn.id] || []).slice().sort(function (a, b) { return a.paid_on < b.paid_on ? 1 : -1; });
  var rows = statementRows(tn).slice(0, 36);
  var h = head('My rent', esc(unitName(tn.unit_id)) + ' · ' + KSH(tn.rent) + ' a month');
  h += '<div class="card hero"><p class="kpi-l">' + (s.bal > 0 ? 'Balance owed' : s.bal < 0 ? 'Credit' : 'Balance') + '</p><p class="kpi-v">' + KSH(Math.abs(s.bal)) + '</p><p class="kpi-s">' + msg + '</p></div>';
  h += '<div class="grid two"><div class="card"><h2>How to pay</h2><p class="pre mt8">' + esc(M.set.payment_instructions || 'Ask the caretaker how to pay.') + '</p><p class="sub mt14">After you pay, the caretaker records your payment here. It may take a short while to appear.</p></div>';
  h += '<div class="card"><h2>Your payments</h2>' + (pays.length ? '<ul class="list">' + pays.map(function (p) { return '<li class="item"><div class="item-main"><b>' + fmtDate(p.paid_on) + (p.voided ? ' (cancelled)' : '') + '</b><span class="sub">' + esc(p.method) + (p.ref ? ' · ' + esc(p.ref) : '') + (p.voided ? ' · ' + esc(p.void_reason) : '') + '</span></div><div class="item-nums"><span class="amt">' + KSH(p.amount) + '</span></div></li>'; }).join('') + '</ul>' : '<p class="empty">No payments recorded yet.</p>') + '</div></div>';
  h += '<div class="card"><h2>Statement</h2><div class="tablewrap mt8"><table><thead><tr><th scope="col">Month</th><th scope="col">Rent due</th><th scope="col">Paid</th><th scope="col">Balance</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><th scope="row" class="rowh">' + esc(monthShort(r.m) + ' ' + Math.floor(r.m / 12)) + '</th><td class="num">' + KSH(r.due) + '</td><td class="num">' + KSH(r.paid) + '</td><td class="num">' + (r.bal > 0 ? KSH(r.bal) + ' owed' : r.bal < 0 ? KSH(-r.bal) + ' credit' : 'Nil') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
  return h;
}
function account() {
  var h = head('My account', '');
  h += '<div class="card"><div class="kv"><span>Name</span><span>' + esc(ME.full_name) + '</span><span>Username</span><span>' + esc(ME.username) + '</span><span>Role</span><span>' + esc(ROLE_LABEL[ME.role]) + '</span></div><div class="va mt14">' + btn('changePw', 'Change my password', '', 'primary') + btn('signout', 'Sign out', '', '') + '</div></div>';
  h += '<div class="card"><h2>Keeping your account safe</h2><p class="sub mt8">Never share your password, not even with the caretaker. The caretaker can reset it but can never see it. Sign out on shared phones. You are signed out automatically after 30 minutes of no activity.</p></div>';
  return h;
}
function more() {
  var h = head('More', '');
  h += '<div class="card"><ul class="list">' + NAVS[ME.role].more.map(function (k) { return '<li class="item"><div class="item-main"><b>' + NAVDEF[k][0] + '</b></div><div class="item-actions inline">' + btn('nav', 'Open', '', 'sm', ' data-v="' + k + '"') + '</div></li>'; }).join('') + '</ul></div>';
  return h;
}
var VIEWS = { overview: overview, units: units, tenants: tenants, rent: rent, expenses: expenses, repairs: repairs, reports: reports, accounts: accounts, audit: audit, mine: mine, account: account, more: more };

/* ---------- shell and render ---------- */
function navHTML(list, cls) { return list.map(function (k) { return '<button type="button" class="' + cls + '" data-act="nav" data-v="' + k + '">' + icon(NAVDEF[k][1]) + '<span>' + NAVDEF[k][0] + '</span></button>'; }).join(''); }
function setBrand() {
  var name = (M.set && M.set.business_name) || 'NyumbaFlow';
  var a = $('#bn'), b = $('#bn2'); if (a) a.textContent = name; if (b) b.textContent = name;
}
function shell() {
  var nav = NAVS[ME.role];
  ROOT.innerHTML = '<div class="app"><aside class="side" aria-label="Main"><div class="brand">' + MARK + '<span class="bn" id="bn"></span></div><nav id="sidenav" aria-label="Sections">' + navHTML(nav.side, 'snav') + '</nav><div class="side-foot"><span id="sf"></span><button class="btn sm" data-act="signout">Sign out</button></div></aside><div><header class="top"><div class="brand">' + MARK + '<span class="bn" id="bn2"></span></div><span class="who" id="who"></span></header><main class="main" id="main" tabindex="-1"></main></div></div><nav class="tabbar" id="tabbar" aria-label="Sections">' + navHTML(nav.tabs, 'tab') + '</nav>';
  $('#tabbar').style.gridTemplateColumns = 'repeat(' + nav.tabs.length + ',1fr)';
  $('#sf').textContent = ME.full_name + ' · ' + ROLE_LABEL[ME.role];
  $('#who').textContent = ROLE_LABEL[ME.role];
  setBrand();
}
function render() {
  var main = $('#main'); if (!main || !ME) return;
  var fid = document.activeElement && document.activeElement.id, pos = null;
  if (fid && document.activeElement.selectionStart != null) pos = document.activeElement.selectionStart;
  if (!allowedView(UI.view)) UI.view = NAVS[ME.role].side[0];
  main.innerHTML = (VIEWS[UI.view] || overview)();
  Array.prototype.forEach.call(main.querySelectorAll('[data-w]'), function (el) { el.style.width = el.getAttribute('data-w') + '%'; });
  var cur = function (b) { var n = b.getAttribute('data-v'); return n === UI.view || (n === 'more' && NAVS[ME.role].more.indexOf(UI.view) > -1); };
  Array.prototype.forEach.call(document.querySelectorAll('#sidenav .snav, #tabbar .tab'), function (b) { b.setAttribute('aria-current', cur(b) ? 'page' : 'false'); });
  setBrand();
  if (fid) { var el = document.getElementById(fid); if (el) { el.focus(); if (pos != null && el.setSelectionRange) { try { el.setSelectionRange(pos, pos); } catch (e) { } } } }
}
function go(v) {
  UI.view = allowedView(v) ? v : NAVS[ME.role].side[0]; UI.confirm = null;
  try { history.replaceState(null, '', '#' + UI.view); } catch (e) { }
  if (UI.view === 'audit') loadAudit();
  render(); window.scrollTo(0, 0);
}
function toast(msg) { var t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 4200); }
function fail(e) {
  if (isAuthError(e)) { forceLogout('Your session ended. Please sign in again.'); return; }
  toast(errMsg(e));
}
function loadAudit() {
  UI.auditLoading = true; render();
  return run(sb.from('audit_log').select('*').order('at', { ascending: false }).limit(200)).then(function (rows) { UI.audit = rows || []; }).catch(fail).then(function () { UI.auditLoading = false; if (UI.view === 'audit') render(); });
}
function refreshAfterChange() { return loadAll().then(function () { render(); }); }

/* ---------- sheets and forms ---------- */
var lastFocus = null, sheetLocked = false;
function closeSheet() { sheetLocked = false; $('#sheet-root').innerHTML = ''; if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { } } }
function fieldHTML(f) {
  var id = 'f_' + f.id, v = f.value == null ? '' : f.value, req = f.required ? ' required' : '';
  if (f.type === 'checkbox') return '<label class="check"><input type="checkbox" id="' + id + '" name="' + f.id + '"' + (v ? ' checked' : '') + '><span>' + esc(f.label) + '</span></label>';
  var ctl;
  if (f.type === 'select') ctl = '<select id="' + id + '" name="' + f.id + '"' + req + '>' + f.options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  else if (f.type === 'textarea') ctl = '<textarea id="' + id + '" name="' + f.id + '" rows="' + (f.rows || 4) + '" maxlength="' + (f.maxlength || 300) + '"' + req + '>' + esc(v) + '</textarea>';
  else ctl = '<input id="' + id + '" name="' + f.id + '" type="' + (f.type || 'text') + '" value="' + esc(v) + '"' + (f.inputmode ? ' inputmode="' + f.inputmode + '"' : '') + ' maxlength="' + (f.maxlength || 80) + '"' + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + (f.type === 'date' && f.max ? ' max="' + esc(f.max) + '"' : '') + (f.autocomplete ? ' autocomplete="' + f.autocomplete + '"' : ' autocomplete="off"') + (f.spellcheck === false ? ' spellcheck="false" autocapitalize="none"' : '') + req + '>';
  return '<div class="field"><label for="' + id + '">' + esc(f.label) + (f.required ? '' : ' <span class="opt">(optional)</span>') + '</label>' + ctl + (f.hint ? '<p class="hint">' + esc(f.hint) + '</p>' : '') + '</div>';
}
function openForm(spec) {
  lastFocus = document.activeElement; sheetLocked = !!spec.locked;
  var tid = 'sheet-title';
  $('#sheet-root').innerHTML = '<div class="overlay" id="ov"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="' + tid + '"><div class="sheet-h"><h2 id="' + tid + '">' + esc(spec.title) + '</h2><button type="button" class="x" id="xbtn" aria-label="Close">×</button></div>' +
    (spec.note ? '<p class="note">' + esc(spec.note) + '</p>' : '') + (spec.html || '') +
    '<form id="sheetform" novalidate><div id="ferr" role="alert"></div>' + (spec.fields || []).map(fieldHTML).join('') + (spec.extra || '') +
    '<div class="sheet-f">' + (spec.noCancel ? '' : '<button type="button" class="btn" id="cancel">Cancel</button>') + '<button type="submit" class="btn primary" id="submitbtn">' + esc(spec.submit || 'Save') + '</button></div></form></div></div>';
  var form = $('#sheetform');
  var first = form.querySelector('input,select,textarea'); (first || $('#xbtn')).focus();
  $('#xbtn').onclick = function () { if (!sheetLocked) closeSheet(); }; if (spec.locked) $('#xbtn').hidden = true; if ($('#cancel')) $('#cancel').onclick = closeSheet;
  $('#ov').addEventListener('mousedown', function (e) { if (e.target.id === 'ov' && !sheetLocked) closeSheet(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var vals = {}; (spec.fields || []).forEach(function (f) { var el = form.elements[f.id]; if (!el) return; vals[f.id] = f.type === 'checkbox' ? el.checked : (f.keepSpace ? String(el.value) : String(el.value).trim()); });
    var sbtn = $('#submitbtn'); sbtn.disabled = true;
    Promise.resolve().then(function () { return spec.onSubmit(vals); }).then(function (res) {
      if (res && typeof res === 'string') { $('#ferr').innerHTML = '<div class="err">' + esc(res) + '</div>'; sbtn.disabled = false; return; }
      closeSheet(); render();
      if (res && typeof res.after === 'function') res.after();
    }, function (err) {
      if (isAuthError(err)) { closeSheet(); fail(err); return; }
      $('#ferr').innerHTML = '<div class="err">' + esc(errMsg(err)) + '</div>'; sbtn.disabled = false;
    });
  });
  if (spec.onReady) spec.onReady(form);
}
document.addEventListener('keydown', function (e) {
  var ov = $('#ov'); if (!ov) return;
  if (e.key === 'Escape') { if (!sheetLocked) closeSheet(); return; }
  if (e.key === 'Tab') { var f = ov.querySelectorAll('button:not([disabled]),input,select,textarea'); if (!f.length) return; var a = f[0], b = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); } else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); } }
});

function vName(s, label) { if (s.length < 2 || s.length > 60) return label + ' must be 2 to 60 characters.'; if (!/^[A-Za-z][A-Za-z .'\-]*$/.test(s)) return label + ' can only use letters, spaces, apostrophes, dots and hyphens.'; return null; }
function vDate(s, label, max, min) { if (!validDate(s)) return label + ' must be a valid date.'; if (max && s > max) return label + ' cannot be after ' + fmtDate(max) + '.'; if (min && s < min) return label + ' cannot be before ' + fmtDate(min) + '.'; return null; }
var USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;
function pwProblem(pw, username) {
  if (typeof pw !== 'string' || pw.length < 10 || pw.length > 72) return 'Password must be 10 to 72 characters.';
  if (!/^[\x20-\x7E]+$/.test(pw)) return 'Password can only use standard keyboard characters.';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Password must contain both letters and numbers.';
  if (username && pw.toLowerCase().indexOf(username.toLowerCase()) > -1) return 'Password must not contain the username.';
  return null;
}
function genPassword() {
  var A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', out;
  do {
    var b = new Uint32Array(12); window.crypto.getRandomValues(b);
    out = ''; for (var i = 0; i < b.length; i++) out += A.charAt(Math.floor(b[i] / 4294967296 * A.length));
  } while (!/[0-9]/.test(out) || !/[a-z]/.test(out) || !/[A-Z]/.test(out));
  return out;
}
function copyText(text, done) {
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
  else done(false);
}
function showCredentials(title, username, password, note) {
  openForm({
    title: title, noCancel: true, submit: 'I have noted these', note: note,
    html: '<div class="cred"><div><span><span class="sub">Username</span><br><code>' + esc(username) + '</code></span><button type="button" class="btn sm" data-copy="u">Copy</button></div><div><span><span class="sub">Temporary password</span><br><code>' + esc(password) + '</code></span><button type="button" class="btn sm" data-copy="p">Copy</button></div></div>',
    fields: [], onSubmit: function () { return null; },
    onReady: function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (b) {
        b.addEventListener('click', function () { copyText(b.getAttribute('data-copy') === 'u' ? username : password, function (ok) { b.textContent = ok ? 'Copied' : 'Select and copy'; }); });
      });
    }
  });
}
function pwFieldExtra() { return '<div class="item-actions mb12"><button type="button" class="btn sm" id="genpw">New random password</button></div>'; }
function bindGen(form) { var b = $('#genpw'); if (b) b.addEventListener('click', function () { form.elements.password.value = genPassword(); }); }

/* ---------- forms ---------- */
function payForm(tnId) {
  var act = activeTenancies();
  if (!act.length) { toast('Add a tenant first.'); return; }
  var sel = tnId && act.filter(function (t) { return t.id === tnId; })[0] ? tnId : act.slice().sort(function (a, b) { return tStats(b).bal - tStats(a).bal; })[0].id;
  var byId = function (id) { return act.filter(function (t) { return t.id === id; })[0]; };
  var sug = function (id) { var t = byId(id), s = tStats(t); return s.bal > 0 ? Math.min(s.bal, t.rent) : t.rent; };
  openForm({
    title: 'Record payment', submit: 'Record payment',
    note: 'This records a payment you received. It does not contact M-Pesa or confirm anything with Safaricom. Check the code against the M-Pesa message.',
    fields: [
      { id: 'tenancyId', label: 'Tenant', type: 'select', required: true, value: sel, options: act.map(function (t) { return [t.id, tnName(t) + ' — ' + unitName(t.unit_id)]; }) },
      { id: 'amount', label: 'Amount received (KSh)', inputmode: 'numeric', required: true, value: String(sug(sel)), maxlength: 11 },
      { id: 'date', label: 'Date received', type: 'date', required: true, value: TODAY, max: TODAY },
      { id: 'method', label: 'Method', type: 'select', required: true, value: 'M-Pesa', options: METHODS.map(function (m) { return [m, m]; }) },
      { id: 'ref', label: 'M-Pesa code or reference', value: '', maxlength: 30, placeholder: 'e.g. SJK1A2B3C4', hint: 'M-Pesa codes are 10 letters and numbers. Required for M-Pesa.', spellcheck: false },
      { id: 'note', label: 'Note', value: '', maxlength: 100 }
    ],
    onReady: function (form) {
      var tsel = form.elements.tenancyId, amt = form.elements.amount;
      amt.addEventListener('input', function () { amt.dataset.touched = '1'; });
      tsel.addEventListener('change', function () { if (!amt.dataset.touched) amt.value = String(sug(tsel.value)); });
    },
    onSubmit: function (v) {
      var t = byId(v.tenancyId); if (!t) return 'Choose a tenant.';
      var a = parseAmount(v.amount); if (a == null) return 'Enter the amount as whole shillings between 1 and 10,000,000.';
      var e = vDate(v.date, 'Date', TODAY, '2015-01-01'); if (e) return e;
      var ref = v.ref.toUpperCase().replace(/\s/g, '');
      if (v.method === 'M-Pesa') { if (!/^[A-Z0-9]{10}$/.test(ref)) return 'Enter the 10-character M-Pesa code from the confirmation message.'; }
      else if (ref && !/^[A-Z0-9-]{4,30}$/.test(ref)) return 'Reference can use letters, numbers and hyphens, 4 to 30 characters.';
      if (ref && D.payments.some(function (p) { return !p.voided && p.ref === ref; })) return 'That code is already recorded on another payment.';
      return run(sb.from('payments').insert({ tenancy_id: t.id, paid_on: v.date, amount: a, method: v.method, ref: ref, note: v.note.slice(0, 100) })).then(function () { return loadAll(); }).then(function () { toast(KSH(a) + ' recorded for ' + tnName(t).split(' ')[0]); return null; });
    }
  });
}
function createTenantForm(unitId) {
  var free = D.units.filter(function (u) { return !M.activeByUnit[u.id]; });
  if (!free.length) { toast('There is no vacant unit. Add a unit first.'); return; }
  var selU = unitId && free.filter(function (u) { return u.id === unitId; })[0] ? unitId : free[0].id;
  var suggest = function (id) { var u = M.unit[id]; return u ? slug(propName(u.property_id)).split('-')[0] + '-' + slug(u.label) : ''; };
  openForm({
    title: 'Add tenant', submit: 'Create account',
    note: 'This creates the tenant’s login and their tenancy together. The tenant must choose their own password the first time they sign in.',
    fields: [
      { id: 'name', label: 'Full name', required: true, value: '', maxlength: 60 },
      { id: 'phone', label: 'Phone (Kenyan mobile)', required: true, value: '', inputmode: 'tel', maxlength: 16, placeholder: '0712 345 678' },
      { id: 'unitId', label: 'Unit', type: 'select', required: true, value: selU, options: free.map(function (u) { return [u.id, u.label + ' · ' + propName(u.property_id) + ' · ' + KSH(u.rent)]; }) },
      { id: 'username', label: 'Username for logging in', required: true, value: suggest(selU), maxlength: 30, spellcheck: false, hint: 'Lowercase letters, numbers, dot, dash. For example the room name.' },
      { id: 'password', label: 'Temporary password', required: true, value: genPassword(), maxlength: 72, spellcheck: false, keepSpace: true, hint: 'Shown only to you, once. Give it to the tenant in person.' },
      { id: 'start', label: 'Lease start', type: 'date', required: true, value: TODAY },
      { id: 'rent', label: 'Monthly rent (KSh)', required: true, inputmode: 'numeric', value: String((M.unit[selU] || {}).rent || ''), maxlength: 9 },
      { id: 'deposit', label: 'Deposit held (KSh)', inputmode: 'numeric', value: '', maxlength: 9 },
      { id: 'dueDay', label: 'Rent due day of month', type: 'select', required: true, value: '5', options: [1, 5, 7, 10, 15].map(function (d) { return [String(d), String(d)]; }) },
      { id: 'note', label: 'Note', value: '', maxlength: 140 }
    ],
    extra: pwFieldExtra(),
    onReady: function (form) {
      bindGen(form);
      var us = form.elements.unitId, rt = form.elements.rent, un = form.elements.username;
      rt.addEventListener('input', function () { rt.dataset.touched = '1'; });
      un.addEventListener('input', function () { un.dataset.touched = '1'; });
      us.addEventListener('change', function () { if (!rt.dataset.touched) rt.value = String((M.unit[us.value] || {}).rent || ''); if (!un.dataset.touched) un.value = suggest(us.value); });
    },
    onSubmit: function (v) {
      var e = vName(v.name, 'Name'); if (e) return e;
      var ph = normPhone(v.phone); if (!ph) return 'Enter a Kenyan mobile number such as 0712 345 678 or +254 712 345 678.';
      var uname = v.username.toLowerCase(); if (!USERNAME_RE.test(uname)) return 'Username must be 3 to 30 characters: lowercase letters, numbers, dot, dash or underscore.';
      e = pwProblem(v.password, uname); if (e) return e;
      if (!M.unit[v.unitId] || M.activeByUnit[v.unitId]) return 'Choose a vacant unit.';
      e = vDate(v.start, 'Lease start', null, '2015-01-01'); if (e) return e;
      if (ymOf(v.start) > NOWYM + 2) return 'Lease start cannot be more than two months ahead.';
      var r = parseAmount(v.rent); if (r == null) return 'Enter monthly rent as whole shillings.';
      var d = 0; if (v.deposit) { d = parseAmount(v.deposit); if (d == null) return 'Deposit must be whole shillings, or leave it blank.'; }
      return callFn('create_tenant', { username: uname, full_name: v.name, phone: ph, password: v.password, unit_id: v.unitId, start_date: v.start, rent: r, deposit: d, due_day: Number(v.dueDay), note: v.note })
        .then(function () { return loadAll(); })
        .then(function () { return { after: function () { showCredentials('Tenant account created', uname, v.password, 'Give these to ' + v.name + '. This is the only time the password is shown. They will be asked to choose their own at first sign-in.'); } }; });
    }
  });
}
function createLandlordForm() {
  openForm({
    title: 'Add landlord account', submit: 'Create account',
    note: 'Landlords can see their own properties, tenants, rent, expenses and repairs. They cannot change anything.',
    fields: [
      { id: 'name', label: 'Full name', required: true, value: '', maxlength: 60 },
      { id: 'phone', label: 'Phone (Kenyan mobile)', value: '', inputmode: 'tel', maxlength: 16, placeholder: '0712 345 678' },
      { id: 'username', label: 'Username for logging in', required: true, value: '', maxlength: 30, spellcheck: false, hint: 'Lowercase letters, numbers, dot, dash.' },
      { id: 'password', label: 'Temporary password', required: true, value: genPassword(), maxlength: 72, spellcheck: false, keepSpace: true }
    ],
    extra: pwFieldExtra(), onReady: bindGen,
    onSubmit: function (v) {
      var e = vName(v.name, 'Name'); if (e) return e;
      var ph = null; if (v.phone) { ph = normPhone(v.phone); if (!ph) return 'Enter a Kenyan mobile number such as 0712 345 678.'; }
      var uname = v.username.toLowerCase(); if (!USERNAME_RE.test(uname)) return 'Username must be 3 to 30 characters: lowercase letters, numbers, dot, dash or underscore.';
      e = pwProblem(v.password, uname); if (e) return e;
      return callFn('create_landlord', { username: uname, full_name: v.name, phone: ph || '', password: v.password })
        .then(function () { return loadAll(); })
        .then(function () { return { after: function () { showCredentials('Landlord account created', uname, v.password, 'Give these to ' + v.name + '. This is the only time the password is shown. They will be asked to choose their own at first sign-in.'); } }; });
    }
  });
}
function editTenantForm(tnId) {
  var tn = D.tenancies.filter(function (t) { return t.id === tnId; })[0]; if (!tn) return;
  var prof = M.prof[tn.tenant_id] || {};
  var fields = [
    { id: 'name', label: 'Full name', required: true, value: prof.full_name || '', maxlength: 60 },
    { id: 'phone', label: 'Phone (Kenyan mobile)', required: true, value: prof.phone || '', inputmode: 'tel', maxlength: 16 }
  ];
  if (tn.active) fields = fields.concat([
    { id: 'start', label: 'Lease start', type: 'date', required: true, value: tn.start_date },
    { id: 'rent', label: 'Monthly rent (KSh)', required: true, inputmode: 'numeric', value: String(tn.rent), maxlength: 9 },
    { id: 'deposit', label: 'Deposit held (KSh)', inputmode: 'numeric', value: tn.deposit ? String(tn.deposit) : '', maxlength: 9 },
    { id: 'dueDay', label: 'Rent due day of month', type: 'select', required: true, value: String(tn.due_day), options: [1, 5, 7, 10, 15].concat([tn.due_day]).filter(function (x, i, a) { return a.indexOf(x) === i; }).sort(function (a, b) { return a - b; }).map(function (d) { return [String(d), String(d)]; }) },
    { id: 'note', label: 'Note', value: tn.note || '', maxlength: 140 }
  ]);
  openForm({
    title: 'Edit tenant', submit: 'Save changes', fields: fields,
    note: tn.active ? '' : 'This tenancy is closed, so only the name and phone can change.',
    onSubmit: function (v) {
      var e = vName(v.name, 'Name'); if (e) return e;
      var ph = normPhone(v.phone); if (!ph) return 'Enter a Kenyan mobile number such as 0712 345 678.';
      var upd = null;
      if (tn.active) {
        e = vDate(v.start, 'Lease start', null, '2015-01-01'); if (e) return e;
        if (ymOf(v.start) > NOWYM + 2) return 'Lease start cannot be more than two months ahead.';
        var r = parseAmount(v.rent); if (r == null) return 'Enter monthly rent as whole shillings.';
        var d = 0; if (v.deposit) { d = parseAmount(v.deposit); if (d == null) return 'Deposit must be whole shillings, or leave it blank.'; }
        upd = { start_date: v.start, rent: r, deposit: d, due_day: Number(v.dueDay), note: v.note };
      }
      var p1 = (v.name !== prof.full_name || ph !== prof.phone) ? callFn('update_profile', { user_id: tn.tenant_id, full_name: v.name, phone: ph }) : Promise.resolve();
      return p1.then(function () { return upd ? run(sb.from('tenancies').update(upd).eq('id', tn.id)) : null; }).then(function () { return loadAll(); }).then(function () { toast('Tenant updated'); return null; });
    }
  });
}
function moveOutForm(tnId) {
  var tn = D.tenancies.filter(function (t) { return t.id === tnId; })[0]; if (!tn) return;
  var s = tStats(tn);
  openForm({
    title: 'Move out ' + tnName(tn), submit: 'Confirm move out',
    note: 'Current balance: ' + (s.bal > 0 ? KSH(s.bal) + ' owed' : (s.bal < 0 ? KSH(-s.bal) + ' credit' : 'nil')) + '. Deposit held: ' + KSH(tn.deposit || 0) + '. Rent stops being charged after the move-out month and the unit becomes vacant. A closed tenancy cannot be changed.',
    fields: [
      { id: 'date', label: 'Move-out date', type: 'date', required: true, value: TODAY, max: TODAY },
      { id: 'disable', label: 'Also switch off this tenant’s login', type: 'checkbox', value: true }
    ],
    onSubmit: function (v) {
      var e = vDate(v.date, 'Move-out date', TODAY, tn.start_date); if (e) return e;
      return run(sb.from('tenancies').update({ active: false, end_date: v.date }).eq('id', tn.id))
        .then(function () { return v.disable ? callFn('set_active', { user_id: tn.tenant_id, active: false }) : null; })
        .then(function () { return loadAll(); })
        .then(function () { toast(tnName(tn).split(' ')[0] + ' moved out'); return null; });
    }
  });
}
function voidForm(id) {
  var p = D.payments.filter(function (x) { return x.id === id; })[0]; if (!p) return;
  openForm({
    title: 'Void payment', submit: 'Void payment',
    note: KSH(p.amount) + ' on ' + fmtDate(p.paid_on).replace(/<[^>]*>/g, '') + '. A voided payment stays in the list, struck through, and stops counting toward the balance. This cannot be undone.',
    fields: [{ id: 'reason', label: 'Reason', required: true, value: '', maxlength: 100, placeholder: 'e.g. Recorded for the wrong tenant' }],
    onSubmit: function (v) {
      if (v.reason.length < 3) return 'Give a short reason (at least 3 characters).';
      return run(sb.from('payments').update({ voided: true, void_reason: v.reason }).eq('id', id)).then(function () { return loadAll(); }).then(function () { toast('Payment voided'); return null; });
    }
  });
}
function remindForm(tnId) {
  var tn = D.tenancies.filter(function (t) { return t.id === tnId; })[0]; if (!tn) return;
  var s = tStats(tn), first = tnName(tn).split(' ')[0], u = M.unit[tn.unit_id];
  var how = (M.set.payment_instructions || '').replace(/\s+/g, ' ').trim() || '[add how to pay]';
  var msg = 'Habari ' + first + ', this is a friendly reminder that your rent balance for ' + (u ? u.label + ' at ' + propName(u.property_id) : 'your unit') + ' is ' + KSH(Math.max(0, s.bal)) + ' as of ' + TODAY + '. How to pay: ' + how + ' Asante.';
  openForm({
    title: 'Rent reminder', submit: 'Copy message', note: 'Edit the message, then paste it into SMS or WhatsApp. Nothing is sent from here.',
    fields: [{ id: 'msg', label: 'Message', type: 'textarea', required: true, value: msg, rows: 6, maxlength: 480, keepSpace: true }],
    onSubmit: function (v) {
      return new Promise(function (resolve) {
        copyText(v.msg, function (ok) {
          if (ok) { toast('Message copied'); resolve(null); }
          else { var ta = $('#f_msg'); ta.focus(); ta.select(); resolve('Copy was blocked here. The text is selected: press and hold, then choose Copy.'); }
        });
      });
    }
  });
}
function propForm(id) {
  var p = id ? M.prop[id] : null;
  var lords = D.profiles.filter(function (x) { return x.role === 'landlord' && x.active; });
  openForm({
    title: p ? 'Edit property' : 'Add property', submit: p ? 'Save changes' : 'Add property',
    fields: [
      { id: 'name', label: 'Property name', required: true, value: p ? p.name : '', maxlength: 40 },
      { id: 'area', label: 'Area', value: p ? p.area : '', maxlength: 60, placeholder: 'e.g. Kinoru, Meru' },
      { id: 'landlord', label: 'Landlord', type: 'select', value: p && p.landlord_id ? p.landlord_id : '', options: [['', 'Not assigned']].concat(lords.map(function (l) { return [l.id, l.full_name]; })), hint: 'Create the landlord’s account first under Accounts.' }
    ],
    onSubmit: function (v) {
      if (v.name.length < 2) return 'Enter a property name.';
      if (D.props.some(function (x) { return x.name.toLowerCase() === v.name.toLowerCase() && (!p || x.id !== p.id); })) return 'You already have a property with that name.';
      var row = { name: v.name, area: v.area || 'Meru', landlord_id: v.landlord || null };
      var q = p ? sb.from('properties').update(row).eq('id', p.id) : sb.from('properties').insert(row);
      return run(q).then(function () { return loadAll(); }).then(function () { toast(p ? 'Property updated' : 'Property added'); return null; });
    }
  });
}
function unitForm(id) {
  var u = id ? M.unit[id] : null;
  if (!u && !D.props.length) { toast('Add a property first.'); propForm(); return; }
  var fields = [];
  if (!u) fields.push({ id: 'propId', label: 'Property', type: 'select', required: true, value: D.props[0].id, options: D.props.map(function (p) { return [p.id, p.name]; }) });
  fields = fields.concat([
    { id: 'label', label: 'Unit name or number', required: true, value: u ? u.label : '', maxlength: 12, placeholder: 'e.g. A5' },
    { id: 'type', label: 'Type', type: 'select', required: true, value: u ? u.type : '1 Bedroom', options: UTYPES.map(function (x) { return [x, x]; }) },
    { id: 'rent', label: 'Listed rent (KSh/month)', required: true, inputmode: 'numeric', value: u ? String(u.rent) : '', maxlength: 9 }
  ]);
  openForm({
    title: u ? 'Edit unit' : 'Add unit', submit: u ? 'Save changes' : 'Add unit', fields: fields,
    note: u && M.activeByUnit[u.id] ? 'Changing the listed rent does not change the rent of the current tenant. Edit the tenant to do that.' : '',
    onSubmit: function (v) {
      if (!/^[A-Za-z0-9 -]{1,12}$/.test(v.label)) return 'Unit name can use letters, numbers, spaces and hyphens, up to 12 characters.';
      var r = parseAmount(v.rent); if (r == null) return 'Enter the rent as whole shillings.';
      var pid = u ? u.property_id : v.propId;
      if (D.units.some(function (x) { return x.property_id === pid && x.label.toLowerCase() === v.label.toLowerCase() && (!u || x.id !== u.id); })) return 'That property already has a unit with that name.';
      var q = u ? sb.from('units').update({ label: v.label, type: v.type, rent: r }).eq('id', u.id) : sb.from('units').insert({ property_id: pid, label: v.label, type: v.type, rent: r });
      return run(q).then(function () { return loadAll(); }).then(function () { toast(u ? 'Unit updated' : 'Unit added'); return null; });
    }
  });
}
function expenseForm() {
  if (!D.props.length) { toast('Add a property first.'); return; }
  openForm({
    title: 'Add expense', submit: 'Add expense',
    fields: [
      { id: 'date', label: 'Date', type: 'date', required: true, value: TODAY, max: TODAY },
      { id: 'propId', label: 'Property', type: 'select', required: true, value: D.props[0].id, options: D.props.map(function (p) { return [p.id, p.name]; }) },
      { id: 'cat', label: 'Category', type: 'select', required: true, value: 'Repairs', options: CATS.map(function (c) { return [c, c]; }) },
      { id: 'amount', label: 'Amount (KSh)', required: true, inputmode: 'numeric', value: '', maxlength: 11 },
      { id: 'note', label: 'Note or supplier', value: '', maxlength: 100 }
    ],
    onSubmit: function (v) {
      var e = vDate(v.date, 'Date', TODAY, '2015-01-01'); if (e) return e;
      var a = parseAmount(v.amount); if (a == null) return 'Enter the amount as whole shillings.';
      if (!M.prop[v.propId]) return 'Choose a property.';
      return run(sb.from('expenses').insert({ property_id: v.propId, spent_on: v.date, category: v.cat, amount: a, note: v.note })).then(function () { return loadAll(); }).then(function () { toast('Expense added'); return null; });
    }
  });
}
function repairForm() {
  if (!D.props.length) { toast('Add a property first.'); return; }
  var opts = [];
  D.props.forEach(function (p) {
    opts.push(['P:' + p.id, p.name + ' — common area']);
    D.units.filter(function (u) { return u.property_id === p.id; }).forEach(function (u) { opts.push(['U:' + u.id, u.label + ' · ' + p.name]); });
  });
  openForm({
    title: 'New repair request', submit: 'Add request',
    fields: [
      { id: 'title', label: 'What needs fixing', required: true, value: '', maxlength: 80 },
      { id: 'where', label: 'Where', type: 'select', required: true, value: opts[0][0], options: opts },
      { id: 'priority', label: 'Priority', type: 'select', required: true, value: 'Medium', options: ['Urgent', 'High', 'Medium', 'Low'].map(function (x) { return [x, x]; }) },
      { id: 'est', label: 'Estimated cost (KSh)', inputmode: 'numeric', value: '', maxlength: 9 },
      { id: 'note', label: 'Note', value: '', maxlength: 140 }
    ],
    onSubmit: function (v) {
      if (v.title.length < 3) return 'Describe the problem in a few words.';
      var est = 0; if (v.est) { est = parseAmount(v.est); if (est == null) return 'Estimated cost must be whole shillings, or leave it blank.'; }
      var isUnit = v.where.charAt(0) === 'U', ref = v.where.slice(2), u = isUnit ? M.unit[ref] : null;
      var pid = isUnit ? (u && u.property_id) : ref; if (!pid) return 'Choose where the problem is.';
      return run(sb.from('repairs').insert({ property_id: pid, unit_id: isUnit ? ref : null, title: v.title, priority: v.priority, est: est, note: v.note })).then(function () { return loadAll(); }).then(function () { toast('Request added'); return null; });
    }
  });
}
function repairDoneForm(id) {
  var r = D.repairs.filter(function (x) { return x.id === id; })[0]; if (!r) return;
  openForm({
    title: 'Mark as done', submit: 'Mark done',
    fields: [
      { id: 'cost', label: 'Actual cost (KSh)', inputmode: 'numeric', value: r.est ? String(r.est) : '', maxlength: 9, hint: 'Leave blank if there was no cost.' },
      { id: 'asExp', label: 'Also add this cost to Expenses', type: 'checkbox', value: true }
    ],
    onSubmit: function (v) {
      var c = 0; if (v.cost) { c = parseAmount(v.cost); if (c == null) return 'Cost must be whole shillings, or leave it blank.'; }
      return run(sb.from('repairs').update({ status: 'done', cost: c, done_on: TODAY }).eq('id', r.id))
        .then(function () { return (v.asExp && c > 0) ? run(sb.from('expenses').insert({ property_id: r.property_id, spent_on: TODAY, category: 'Repairs', amount: c, note: r.title.slice(0, 100) })) : null; })
        .then(function () { return loadAll(); }).then(function () { toast('Marked done'); return null; });
    }
  });
}
function tenantRepairForm() {
  var tn = D.tenancies.filter(function (t) { return t.active; })[0]; if (!tn) { toast('You have no active tenancy.'); return; }
  var u = M.unit[tn.unit_id]; if (!u) return;
  openForm({
    title: 'Report a problem', submit: 'Send report', note: 'The caretaker will see this straight away. For an emergency such as fire or flooding, phone the caretaker as well.',
    fields: [
      { id: 'title', label: 'What is the problem?', required: true, value: '', maxlength: 80, placeholder: 'e.g. Kitchen tap is leaking' },
      { id: 'priority', label: 'How urgent is it?', type: 'select', required: true, value: 'Medium', options: [['Low', 'Can wait'], ['Medium', 'Soon'], ['High', 'Urgent']] },
      { id: 'note', label: 'More details', type: 'textarea', value: '', rows: 3, maxlength: 140 }
    ],
    onSubmit: function (v) {
      if (v.title.length < 3) return 'Describe the problem in a few words.';
      return run(sb.from('repairs').insert({ property_id: u.property_id, unit_id: u.id, title: v.title, priority: v.priority, est: 0, note: v.note })).then(function () { return loadAll(); }).then(function () { toast('Report sent'); return null; });
    }
  });
}
function resetPwForm(userId) {
  var p = M.prof[userId]; if (!p) return;
  openForm({
    title: 'Reset password for ' + p.full_name, submit: 'Reset password',
    note: 'This replaces their password. They will be asked to choose a new one at next sign-in. You will not be able to see it again after this screen.',
    fields: [{ id: 'password', label: 'New temporary password', required: true, value: genPassword(), maxlength: 72, spellcheck: false, keepSpace: true }],
    extra: pwFieldExtra(), onReady: bindGen,
    onSubmit: function (v) {
      var e = pwProblem(v.password, p.username); if (e) return e;
      return callFn('reset_password', { user_id: p.id, password: v.password }).then(function () { return loadAll(); })
        .then(function () { return { after: function () { showCredentials('Password reset', p.username, v.password, 'Give this to ' + p.full_name + '. They will choose their own password at next sign-in.'); } }; });
    }
  });
}
function editAccountForm(userId) {
  var p = M.prof[userId]; if (!p) return;
  openForm({
    title: 'Edit account', submit: 'Save changes',
    fields: [
      { id: 'name', label: 'Full name', required: true, value: p.full_name, maxlength: 60 },
      { id: 'phone', label: 'Phone (Kenyan mobile)', required: p.role === 'tenant', value: p.phone || '', inputmode: 'tel', maxlength: 16 }
    ],
    note: 'Username: ' + p.username + ' (cannot be changed)',
    onSubmit: function (v) {
      var e = vName(v.name, 'Name'); if (e) return e;
      var ph = ''; if (v.phone) { ph = normPhone(v.phone); if (!ph) return 'Enter a Kenyan mobile number such as 0712 345 678.'; } else if (p.role === 'tenant') return 'A phone number is required for tenants.';
      return callFn('update_profile', { user_id: p.id, full_name: v.name, phone: ph }).then(function () { return loadAll(); }).then(function () { toast('Account updated'); return null; });
    }
  });
}
function settingsForm() {
  openForm({
    title: 'What tenants see', submit: 'Save',
    fields: [
      { id: 'biz', label: 'Business name', required: true, value: M.set.business_name || '', maxlength: 40 },
      { id: 'how', label: 'How to pay', type: 'textarea', required: true, value: M.set.payment_instructions || '', rows: 5, maxlength: 400, keepSpace: true, hint: 'For example: Paybill number, account name, or Till number. Shown to every tenant.' }
    ],
    onSubmit: function (v) {
      if (v.biz.length < 2) return 'Enter the business name.';
      if (v.how.trim().length < 5) return 'Explain how tenants should pay.';
      return run(sb.from('settings').update({ value: v.biz }).eq('key', 'business_name'))
        .then(function () { return run(sb.from('settings').update({ value: v.how.trim() }).eq('key', 'payment_instructions')); })
        .then(function () { return loadAll(); }).then(function () { toast('Saved'); return null; });
    }
  });
}
function changePwForm(forced, onDone) {
  openForm({
    title: 'Change password', submit: 'Change password', noCancel: !!forced, locked: !!forced,
    note: 'Choose a password of at least 10 characters with letters and numbers. Do not reuse a password from another account.',
    fields: [
      { id: 'cur', label: 'Current password', type: 'password', required: true, value: '', maxlength: 72, autocomplete: 'current-password', keepSpace: true },
      { id: 'pw1', label: 'New password', type: 'password', required: true, value: '', maxlength: 72, autocomplete: 'new-password', keepSpace: true },
      { id: 'pw2', label: 'New password again', type: 'password', required: true, value: '', maxlength: 72, autocomplete: 'new-password', keepSpace: true }
    ],
    onSubmit: function (v) {
      if (!v.cur) return 'Enter your current password.';
      var e = pwProblem(v.pw1, ME.username); if (e) return e;
      if (v.pw1 !== v.pw2) return 'The two new passwords do not match.';
      if (v.pw1 === v.cur) return 'Choose a different password from the current one.';
      return callFn('change_password', { current_password: v.cur, new_password: v.pw1 })
        .then(function () { return sb.auth.signInWithPassword({ email: ME.username + '@' + (CFG.LOGIN_EMAIL_DOMAIN || 'example.com'), password: v.pw1 }); })
        .then(function () { ME.must_change_password = false; toast('Password changed'); return onDone ? { after: onDone } : null; });
    }
  });
}

/* ---------- CSV ---------- */
function csvCell(v) { if (v == null) return ''; var num = typeof v === 'number'; var s = String(v); if (!num && /^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function toCSV(head, rows) { return '﻿' + [head].concat(rows).map(function (r) { return r.map(csvCell).join(','); }).join('\r\n'); }
function tnOf(id) { return D.tenancies.filter(function (t) { return t.id === id; })[0]; }
function buildCSV(kind) {
  if (kind === 'tenants') {
    var cols = ['Name', 'Unit', 'Property', 'Status', 'Lease start', 'Move-out', 'Monthly rent', 'Charged to date', 'Paid to date', 'Balance (owed positive)', 'Deposit']; if (UI.includePhone) cols.splice(1, 0, 'Phone');
    return toCSV(cols, D.tenancies.map(function (t) { var s = tStats(t), u = M.unit[t.unit_id], r = [tnName(t), u ? u.label : '', u ? propName(u.property_id) : '', STATUS[s.status][0], t.start_date, t.end_date || '', t.rent, s.charged, s.paid, s.bal, t.deposit || 0]; if (UI.includePhone) r.splice(1, 0, tnPhone(t)); return r; }));
  }
  if (kind === 'payments') return toCSV(['Date', 'Tenant', 'Unit', 'Amount', 'Method', 'Reference', 'Note', 'Voided', 'Void reason'], D.payments.slice().sort(function (a, b) { return a.paid_on < b.paid_on ? -1 : 1; }).map(function (p) { var t = tnOf(p.tenancy_id); return [p.paid_on, t ? tnName(t) : '', t ? unitName(t.unit_id) : '', p.amount, p.method, p.ref, p.note, p.voided ? 'Yes' : 'No', p.void_reason]; }));
  if (kind === 'expenses') return toCSV(['Date', 'Property', 'Category', 'Amount', 'Note'], D.expenses.slice().sort(function (a, b) { return a.spent_on < b.spent_on ? -1 : 1; }).map(function (e) { return [e.spent_on, propName(e.property_id), e.category, e.amount, e.note]; }));
  if (kind === 'repairs') return toCSV(['Reported', 'Property', 'Unit', 'Title', 'Priority', 'Status', 'Estimate', 'Actual cost', 'Completed', 'Note'], D.repairs.map(function (r) { var u = M.unit[r.unit_id]; return [r.reported_on, propName(r.property_id), u ? u.label : '', r.title, r.priority, r.status === 'progress' ? 'In progress' : r.status === 'done' ? 'Done' : 'Open', r.est, r.cost, r.done_on || '', r.note]; }));
  return toCSV(['Month', 'Expected rent', 'Collected', 'Collection rate %', 'Expenses', 'Net'], lastMonths(6).map(function (x) { return [ymStr(x.m), x.expected, x.collected, x.expected ? Math.round(x.collected / x.expected * 100) : '', x.spent, x.net]; }));
}
function saveCSV(name, text) {
  var blob = new Blob([text], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
}

/* ---------- actions ---------- */
function findProfile(id) { return M.prof[id]; }
var A = {
  nav: function (d) { go(d.v); },
  pay: function (d) { payForm(d.id); },
  addTenant: function (d) { createTenantForm(d.id); },
  addLandlord: function () { createLandlordForm(); },
  editTenant: function (d) { editTenantForm(d.id); },
  moveOut: function (d) { moveOutForm(d.id); },
  remind: function (d) { remindForm(d.id); },
  voidPay: function (d) { voidForm(d.id); },
  addProp: function () { propForm(); },
  editProp: function (d) { propForm(d.id); },
  addUnit: function () { unitForm(); },
  editUnit: function (d) { unitForm(d.id); },
  addExpense: function () { expenseForm(); },
  addRepair: function () { repairForm(); },
  tenantRepair: function () { tenantRepairForm(); },
  repDone: function (d) { repairDoneForm(d.id); },
  repStart: function (d) { return run(sb.from('repairs').update({ status: 'progress' }).eq('id', d.id)).then(refreshAfterChange); },
  repReopen: function (d) { return run(sb.from('repairs').update({ status: 'open' }).eq('id', d.id)).then(refreshAfterChange); },
  unitFilter: function (d) { UI.unitFilter = d.v; render(); },
  rentFilter: function (d) { UI.rentFilter = d.v; render(); },
  repFilter: function (d) { UI.repFilter = d.v; render(); },
  tenantTab: function (d) { UI.tenantTab = d.v; render(); },
  reveal: function (d) { UI.reveal[d.id] = !UI.reveal[d.id]; render(); },
  delExpense: function (d) {
    var k = 'exp:' + d.id;
    if (UI.confirm === k) { UI.confirm = null; return run(sb.from('expenses').delete().eq('id', d.id)).then(refreshAfterChange).then(function () { toast('Expense deleted'); }); }
    UI.confirm = k; render();
  },
  export: function (d) { saveCSV('nyumbaflow-' + d.v + '-' + TODAY + '.csv', buildCSV(d.v)); toast('Download started'); },
  resetPw: function (d) { resetPwForm(d.id); },
  editAccount: function (d) { editAccountForm(d.id); },
  disable: function (d) {
    var k = 'dis:' + d.id;
    if (UI.confirm === k) { UI.confirm = null; return callFn('set_active', { user_id: d.id, active: false }).then(refreshAfterChange).then(function () { toast('Login switched off'); }); }
    UI.confirm = k; render();
  },
  enable: function (d) { return callFn('set_active', { user_id: d.id, active: true }).then(refreshAfterChange).then(function () { toast('Login switched on'); }); },
  settings: function () { settingsForm(); },
  changePw: function () { changePwForm(false); },
  refreshAudit: function () { return loadAudit(); },
  signout: function () { return signOut('You have signed out.'); }
};
document.addEventListener('click', function (e) {
  var b = e.target.closest ? e.target.closest('[data-act]') : null; if (!b || !ME) return;
  var a = b.getAttribute('data-act');
  if (a !== 'delExpense' && a !== 'disable') UI.confirm = null;
  var d = { id: b.getAttribute('data-id'), v: b.getAttribute('data-v'), unit: b.getAttribute('data-id') };
  if (A[a]) Promise.resolve().then(function () { return A[a](d); }).catch(fail);
});
document.addEventListener('input', function (e) { if (e.target && e.target.id === 'q') { UI.q = e.target.value.slice(0, 60); render(); } });
document.addEventListener('change', function (e) {
  var c = e.target && e.target.getAttribute ? e.target.getAttribute('data-change') : null;
  if (c === 'expMonth') { UI.expMonth = e.target.value; render(); }
  if (c === 'incPhone') { UI.includePhone = e.target.checked; }
});
window.addEventListener('hashchange', function () { if (!ME) return; var v = location.hash.slice(1); if (VIEWS[v] && allowedView(v) && v !== UI.view) go(v); });

/* ---------- sign in, sign out, idle timeout ---------- */
var idleTimer = null, IDLE_MS = 30 * 60 * 1000, lastReset = 0;
function bumpIdle() { var n = Date.now(); if (n - lastReset < 5000) return; lastReset = n; clearTimeout(idleTimer); idleTimer = setTimeout(function () { forceLogout('You were signed out after 30 minutes of no activity.'); }, IDLE_MS); }
['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) { window.addEventListener(ev, function () { if (ME) bumpIdle(); }, { passive: true }); });
function startIdle() { lastReset = 0; bumpIdle(); }
function clearSession() { clearTimeout(idleTimer); ME = null; D = emptyData(); M = {}; UI.reveal = {}; UI.audit = []; UI.q = ''; UI.confirm = null; $('#sheet-root').innerHTML = ''; }
function signOut(msg) { var p = sb ? sb.auth.signOut() : Promise.resolve(); return Promise.resolve(p).catch(function () { }).then(function () { clearSession(); showLogin(msg); }); }
function forceLogout(msg) { if (!ME) return; signOut(msg); }

var fails = 0, lockUntil = 0;
function loginHTML(msg, kind) {
  return '<div class="login"><form class="login-card" id="loginform" novalidate><div class="brand">' + MARK + '<span class="bn">NyumbaFlow</span></div><h1>Sign in</h1><p class="sub">Use the username and password the caretaker gave you.</p>' +
    (msg ? '<div class="' + (kind === 'err' ? 'err' : 'msg') + '" role="alert">' + esc(msg) + '</div>' : '') +
    '<div class="field"><label for="lu">Username</label><input id="lu" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="30"></div>' +
    '<div class="field"><label for="lp">Password</label><input id="lp" name="password" type="password" autocomplete="current-password" maxlength="72"></div>' +
    '<button class="btn primary" type="submit" id="lbtn">Sign in</button><p class="hint">Forgot your password? Ask the caretaker to reset it for you.</p></form></div>';
}
function showLogin(msg, kind) {
  ROOT.innerHTML = loginHTML(msg, kind);
  var f = $('#loginform'); $('#lu').focus();
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var u = $('#lu').value.trim().toLowerCase(), p = $('#lp').value, b = $('#lbtn');
    if (Date.now() < lockUntil) { showLogin('Too many attempts. Wait a few seconds and try again.', 'err'); return; }
    if (!USERNAME_RE.test(u) || !p) { showLogin('Wrong username or password.', 'err'); return; }
    b.disabled = true;
    sb.auth.signInWithPassword({ email: u + '@' + (CFG.LOGIN_EMAIL_DOMAIN || 'example.com'), password: p }).then(function (r) {
      if (r.error || !r.data || !r.data.user) {
        fails++; if (fails >= 5) { lockUntil = Date.now() + 30000; fails = 0; }
        var banned = r.error && (r.error.code === 'user_banned' || /banned/i.test(r.error.message || ''));
        showLogin(banned ? 'This account is switched off. Please contact the caretaker.' : 'Wrong username or password.', 'err'); return;
      }
      fails = 0; return enter(r.data.user);
    }, function () { showLogin('No connection. Check your internet and try again.', 'err'); });
  });
}
function enter(user) {
  return run(sb.from('profiles').select('*').eq('id', user.id).maybeSingle()).then(function (prof) {
    if (!prof || !prof.active) { return sb.auth.signOut().then(function () { showLogin('This account is not active. Please contact the caretaker.', 'err'); }); }
    ME = prof;
    if (ME.must_change_password) { return forcedChange(); }
    return start();
  }).catch(function () { return sb.auth.signOut().catch(function () { }).then(function () { showLogin('Could not load your account. Check your connection and try again.', 'err'); }); });
}
function forcedChange() {
  ROOT.innerHTML = '<div class="login"><div class="login-card"><div class="brand">' + MARK + '<span class="bn">NyumbaFlow</span></div><h1>Choose your own password</h1><p class="sub">For your safety, replace the temporary password before you continue.</p></div></div>';
  changePwForm(true, function () { start(); });
}
function start() {
  return loadAll().then(function () {
    shell();
    var h = location.hash.slice(1);
    UI.view = (VIEWS[h] && allowedView(h)) ? h : NAVS[ME.role].side[0];
    if (UI.view === 'audit') { loadAudit(); }
    render(); startIdle();
  }).catch(function (e) { if (isAuthError(e)) { forceLogout('Your session ended. Please sign in again.'); } else { signOut('Could not load your data. Check your connection and sign in again.'); } });
}

/* ---------- boot ---------- */
function fatal(msg) { ROOT.innerHTML = '<p class="fatal">' + esc(msg) + '</p>'; }
function configured() { return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(CFG.SUPABASE_URL || '') && typeof CFG.SUPABASE_KEY === 'string' && CFG.SUPABASE_KEY.length > 20 && CFG.SUPABASE_KEY.indexOf('PASTE_') !== 0; }
function boot() {
  if (!configured()) { fatal('NyumbaFlow is not connected yet. The owner must put the Supabase address and public key into config.js. See SETUP.md.'); return; }
  if (!window.supabase || !window.supabase.createClient) { fatal('The sign-in library is missing. The owner must add vendor/supabase.js. See SETUP.md.'); return; }
  var store; try { window.sessionStorage.setItem('nf-test', '1'); window.sessionStorage.removeItem('nf-test'); store = window.sessionStorage; } catch (e) { store = undefined; }
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, { auth: { persistSession: true, storage: store, autoRefreshToken: true, detectSessionInUrl: false } });
  sb.auth.getSession().then(function (r) {
    var s = r && r.data && r.data.session;
    if (s && s.user) return enter(s.user);
    showLogin();
  }).catch(function () { showLogin(); });
}
boot();
})();
