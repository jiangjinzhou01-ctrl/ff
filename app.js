const CONFIG_KEY = 'homeroom2603.supabaseConfig';
const SESSION_KEY = 'homeroom2603.session';
const LOCAL_STATE_KEY = 'homeroom2603.localState.v2.1';
const PRIVACY_KEY = 'homeroom2603.privacy';

const baseConfig = window.APP_CONFIG || {};
const savedConfig = safeJson(localStorage.getItem(CONFIG_KEY), {});
const config = {
  SUPABASE_URL: savedConfig.url || baseConfig.SUPABASE_URL || '',
  SUPABASE_PUBLISHABLE_KEY: savedConfig.key || baseConfig.SUPABASE_PUBLISHABLE_KEY || '',
  REQUIRE_LOGIN: baseConfig.REQUIRE_LOGIN !== false,
  CLASS_CODE: baseConfig.CLASS_CODE || '2603',
  CLASS_NAME: baseConfig.CLASS_NAME || '2603班',
  TEACHER_NAME: baseConfig.TEACHER_NAME || '易老师',
  SCHOOL_STAGE: baseConfig.SCHOOL_STAGE || '学前教育阶段',
  AUTO_SYNC_SECONDS: Number(baseConfig.AUTO_SYNC_SECONDS || 30)
};

const TABLES = {
  classes: 'classes',
  students: 'students',
  attendance: 'attendance',
  tasks: 'tasks',
  activity_logs: 'activity_logs',
  committee: 'committee',
  parents: 'parents',
  timetable: 'timetable',
  duty: 'duty_assignments',
  work_records: 'work_records',
  seating: 'seating'
};

const committeeRoles = [
  ['班长','统筹班级事务，协助班主任开展日常管理'],
  ['学习委员','组织学习互助，收集并反馈学习情况'],
  ['纪律委员','维护课堂与自习纪律，做好纪律记录'],
  ['生活委员','负责班级物资及日常生活事务'],
  ['体育委员','组织两操、体育活动及运动会训练'],
  ['文艺委员','策划班级文化、文艺及节日活动'],
  ['心理委员','关注同学状态，协助开展心理健康活动'],
  ['宣传委员','负责黑板报、摄影与班级宣传']
];
const periods = ['第一节','第二节','第三节','第四节','第五节','第六节','第七节','晚自习'];
const weekdays = ['星期一','星期二','星期三','星期四','星期五'];

let state = loadLocalState();
let mode = cloudConfigured() ? 'cloud' : 'local';
let cloud = cloudConfigured() ? new SupabaseRest(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY) : null;
let selectedSeat = null;
let pendingFileAction = null;
let lastSyncAt = null;
let syncTimer = null;
let currentDetailType = null;

const $ = (id) => document.getElementById(id);

function safeJson(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}
function uuid() {
  return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}
function formatDate(value) {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getMonth()+1}月${d.getDate()}日`;
}
function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getMonth()+1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function escapeHtml(value='') {
  return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}
function cloudConfigured() {
  return /^https:\/\/.+\.supabase\.co\/?$/.test(config.SUPABASE_URL) && /^sb_publishable_/.test(config.SUPABASE_PUBLISHABLE_KEY);
}
function defaultState() {
  const now = new Date().toISOString();
  const today = todayISO();
  return {
    classInfo: { id: config.CLASS_CODE, name: config.CLASS_NAME, teacher: config.TEACHER_NAME, stage: config.SCHOOL_STAGE, updated_at: now },
    students: [],
    attendance: [],
    tasks: [
      { id: uuid(), class_id: config.CLASS_CODE, title: '完成新生基础信息核对', due_date: today, priority: 'high', status: 'todo', created_at: now, updated_at: now },
      { id: uuid(), class_id: config.CLASS_CODE, title: '准备下周初中知识复习衔接安排', due_date: today, priority: 'medium', status: 'todo', created_at: now, updated_at: now },
      { id: uuid(), class_id: config.CLASS_CODE, title: '9月1日前补充正式课程表', due_date: '2026-08-31', priority: 'medium', status: 'todo', created_at: now, updated_at: now }
    ],
    activity_logs: [{ id: uuid(), class_id: config.CLASS_CODE, category: 'system', content: '2603班主任工作台已初始化', created_at: now }],
    committee: committeeRoles.map(([role,duty]) => ({ id: uuid(), class_id: config.CLASS_CODE, role, student_id: null, duty, updated_at: now })),
    parents: [],
    timetable: [],
    duty: weekdays.map((_,i)=>({ id: uuid(), class_id: config.CLASS_CODE, weekday: i+1, classroom: [], public_area: [], leader_id: null, updated_at: now })),
    work_records: [],
    seating: []
  };
}
function loadLocalState() {
  const stored = safeJson(localStorage.getItem(LOCAL_STATE_KEY), null);
  const base = defaultState();
  if (!stored) return base;
  return {
    ...base,
    ...stored,
    classInfo: { ...base.classInfo, ...(stored.classInfo || {}) },
    students: Array.isArray(stored.students) ? stored.students : [],
    attendance: Array.isArray(stored.attendance) ? stored.attendance : [],
    tasks: Array.isArray(stored.tasks) ? stored.tasks : base.tasks,
    activity_logs: Array.isArray(stored.activity_logs) ? stored.activity_logs : base.activity_logs,
    committee: Array.isArray(stored.committee) && stored.committee.length ? stored.committee : base.committee,
    parents: Array.isArray(stored.parents) ? stored.parents : [],
    timetable: Array.isArray(stored.timetable) ? stored.timetable : [],
    duty: Array.isArray(stored.duty) && stored.duty.length ? stored.duty : base.duty,
    work_records: Array.isArray(stored.work_records) ? stored.work_records : [],
    seating: Array.isArray(stored.seating) ? stored.seating : []
  };
}
function saveLocalCache() {
  localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state));
}

class SupabaseRest {
  constructor(url, key) {
    this.url = url.replace(/\/$/, '');
    this.key = key;
    this.session = safeJson(localStorage.getItem(SESSION_KEY), null);
  }
  get accessToken() { return this.session?.access_token || null; }
  get refreshToken() { return this.session?.refresh_token || null; }
  get user() { return this.session?.user || null; }
  saveSession(session) {
    this.session = session;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  clearSession() {
    this.session = null;
    localStorage.removeItem(SESSION_KEY);
  }
  authHeaders(authenticated = true) {
    return {
      apikey: this.key,
      Authorization: `Bearer ${authenticated && this.accessToken ? this.accessToken : this.key}`,
      'Content-Type': 'application/json'
    };
  }
  async request(path, options = {}, authenticated = true) {
    if (authenticated) await this.refreshIfNeeded();
    const res = await fetch(`${this.url}${path}`, {
      ...options,
      headers: { ...this.authHeaders(authenticated), ...(options.headers || {}) }
    });
    if (!res.ok) {
      let message = `${res.status} ${res.statusText}`;
      try {
        const data = await res.json();
        message = data.msg || data.message || data.error_description || data.error || message;
      } catch {}
      throw new Error(message);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
  async signIn(email, password) {
    const res = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: this.authHeaders(false),
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(data.msg || data.error_description || data.message || '登录失败');
    const expiresAtMs = Date.now() + ((data.expires_in || 3600) * 1000);
    this.saveSession({ ...data, expires_at_ms: expiresAtMs });
    return data;
  }
  async refreshIfNeeded() {
    if (!this.session) return;
    const expires = this.session.expires_at_ms || ((this.session.expires_at || 0) * 1000);
    if (!expires || Date.now() < expires - 60000) return;
    if (!this.refreshToken) { this.clearSession(); return; }
    const res = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: this.authHeaders(false),
      body: JSON.stringify({ refresh_token: this.refreshToken })
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok) { this.clearSession(); throw new Error('登录已过期，请重新登录'); }
    this.saveSession({ ...data, expires_at_ms: Date.now() + ((data.expires_in || 3600) * 1000) });
  }
  async signOut() {
    try {
      if (this.accessToken) await this.request('/auth/v1/logout', { method: 'POST' }, true);
    } finally { this.clearSession(); }
  }
  async select(table, query = '') {
    return await this.request(`/rest/v1/${table}?select=*${query ? `&${query}` : ''}`, { method: 'GET' }, true);
  }
  async upsert(table, rows, onConflict = 'id') {
    const list = Array.isArray(rows) ? rows : [rows];
    return await this.request(`/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}&select=*`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(list)
    }, true);
  }
  async remove(table, id) {
    return await this.request(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' }
    }, true);
  }
  async test() {
    const res = await fetch(`${this.url}/rest/v1/`, { headers: this.authHeaders(false) });
    return res.ok || [401,404].includes(res.status);
  }
}

function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  $('toastContainer').appendChild(el);
  setTimeout(()=>el.remove(), 3200);
}

function setSyncStatus(kind, text) {
  $('syncDot').className = `sync-dot ${kind || ''}`.trim();
  $('syncText').textContent = text;
}

function showModal({ title, body, footer = '', large = false, onReady }) {
  $('modalRoot').innerHTML = `<div class="modal-wrap" id="activeModalWrap"><div class="modal ${large ? 'large' : ''}"><div class="modal-header"><h2>${escapeHtml(title)}</h2><button class="modal-close" id="modalCloseBtn">×</button></div><div class="modal-body">${body}</div>${footer ? `<div class="modal-footer">${footer}</div>` : ''}</div></div>`;
  $('modalCloseBtn').addEventListener('click', closeModal);
  $('activeModalWrap').addEventListener('click', (e)=>{ if (e.target.id === 'activeModalWrap') closeModal(); });
  onReady?.();
}
function closeModal() { $('modalRoot').innerHTML = ''; }

function renderAll() {
  document.body.classList.toggle('privacy', localStorage.getItem(PRIVACY_KEY) === '1');
  $('brandClass').textContent = state.classInfo.name || config.CLASS_NAME;
  $('teacherName').textContent = state.classInfo.teacher || config.TEACHER_NAME;
  renderDashboard();
  renderSeating();
  renderDuty();
  renderRoster();
  renderCommittee();
  renderParents();
  renderTimetable();
  updateNotificationDot();
}

function renderDashboard() {
  const today = todayISO();
  const todayAttendance = state.attendance.filter(x => x.day === today);
  const arrived = todayAttendance.filter(x => ['present','late'].includes(x.status)).length;
  const attendanceText = todayAttendance.length ? `${arrived}/${state.students.length}` : '待登记';
  const pendingTasks = state.tasks.filter(x => x.status !== 'done').length;
  $('heroStudentCount').textContent = state.students.length || '—';
  $('heroAttendance').textContent = attendanceText;
  $('heroTaskCount').textContent = pendingTasks;
  $('stageTag').textContent = state.classInfo.stage || config.SCHOOL_STAGE;
  $('heroGreeting').textContent = `${greeting()}，${state.classInfo.teacher || config.TEACHER_NAME}`;
  $('heroMessage').textContent = '下周进入初中知识复习衔接阶段；正式高中课程将于9月1日开始。';

  const tasks = [...state.tasks].sort((a,b)=>(a.status==='done')-(b.status==='done') || String(a.due_date||'').localeCompare(String(b.due_date||''))).slice(0,5);
  $('taskList').innerHTML = tasks.length ? tasks.map(t=>`
    <div class="task-item ${t.status==='done'?'done':''}" data-task="${t.id}">
      <button class="task-check" data-task-toggle="${t.id}" title="切换完成状态">${t.status==='done'?'✓':''}</button>
      <div class="task-copy"><strong>${escapeHtml(t.title)}</strong><p>${t.due_date ? `截止 ${formatDate(t.due_date)}` : '未设置截止日期'}</p></div>
      <span class="priority ${t.priority || ''}">${priorityText(t.priority)}</span>
    </div>`).join('') : '<div class="empty-state">今天没有待办事项</div>';

  const logs = [...state.activity_logs].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,5);
  $('activityList').innerHTML = logs.length ? logs.map(log=>`
    <div class="activity-item"><i class="activity-bullet"></i><div class="activity-copy"><strong>${escapeHtml(log.content)}</strong><p>${formatDateTime(log.created_at)}</p></div></div>`).join('') : '<div class="empty-state">暂无动态</div>';

  const cards = buildWorkCards();
  $('routineGrid').innerHTML = cards.slice(0,4).map(workCardHTML).join('');
  $('featureGrid').innerHTML = cards.slice(4).map(workCardHTML).join('');
}

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? '上午好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好';
}
function priorityText(v) { return ({high:'高',medium:'中',low:'低'}[v] || '普通'); }
function buildWorkCards() {
  const today = todayISO();
  const attendance = state.attendance.filter(x=>x.day===today);
  const present = attendance.filter(x=>['present','late'].includes(x.status)).length;
  const leave = attendance.filter(x=>x.status==='leave').length;
  const todayRec = type => state.work_records.filter(r=>r.type===type && r.record_date===today);
  const allRec = type => state.work_records.filter(r=>r.type===type);
  return [
    {id:'attendance',category:'常规工作',title:'早读考勤',icon:'✓',tone:'coral',desc:'今日出勤、迟到及请假情况',value:attendance.length?`${present}/${state.students.length}`:'待登记',badge:leave?`${leave}人请假`:`${state.students.length}人名册`},
    {id:'discipline',category:'常规工作',title:'课堂纪律',icon:'♢',tone:'yellow',desc:'课堂表现、表扬与重点关注',value:todayRec('discipline').length?`${todayRec('discipline').length}条`:'待记录',badge:'可随时新增'},
    {id:'homework',category:'常规工作',title:'作业收缴',icon:'▣',tone:'green',desc:'各学科收缴与未交情况',value:todayRec('homework').length?`${todayRec('homework').length}条`:'待启用',badge:'衔接阶段'},
    {id:'patrol',category:'常规工作',title:'课间巡查',icon:'⌖',tone:'blue',desc:'安全巡查记录与异常登记',value:todayRec('patrol').length?`${todayRec('patrol').length}次`:'待记录',badge:'安全管理'},
    {id:'meeting',category:'特色工作',title:'主题班会',icon:'✦',tone:'coral',desc:'本学期计划及已开展记录',value:allRec('meeting').length?`${allRec('meeting').length}条`:'待规划',badge:'学前教育'},
    {id:'communication',category:'特色工作',title:'家校沟通',icon:'☎',tone:'yellow',desc:'家长沟通与重点家访计划',value:allRec('communication').length?`${allRec('communication').length}次`:'待录入',badge:'隐私保护'},
    {id:'growth',category:'特色工作',title:'学生成长',icon:'↗',tone:'green',desc:'成长档案与个性化辅导记录',value:state.students.length?`${state.students.length}人`:'待导入',badge:'成长档案'},
    {id:'activity',category:'特色工作',title:'班级活动',icon:'◫',tone:'blue',desc:'活动策划、记录与照片展示',value:allRec('activity').length?`${allRec('activity').length}场`:'待记录',badge:'活动归档'}
  ];
}
function workCardHTML(item) {
  return `<button class="work-card" data-work="${item.id}"><div class="card-top"><div class="card-icon ${item.tone}">${item.icon}</div><span class="card-arrow">→</span></div><h3>${item.title}</h3><p>${item.desc}</p><div class="card-foot"><strong>${item.value}</strong><span>${item.badge}</span></div></button>`;
}

function renderSeating() {
  const studentMap = new Map(state.students.map(s=>[s.id,s]));
  const order = seatingOrder();
  $('seatingSub').textContent = `共 ${state.students.length} 名学生 · 点击两个座位可交换`;
  $('seatingGrid').innerHTML = order.length ? order.map((id,i)=>{
    const s = studentMap.get(id); if (!s) return '';
    const tags = Array.isArray(s.tags) ? s.tags : [];
    const c = tags.includes('重点关注') ? 'focus' : tags.includes('班干部') ? 'leader' : '';
    return `<button class="seat ${c} ${selectedSeat===i?'selected':''}" data-seat-index="${i}"><strong class="student-real">${escapeHtml(s.name)}</strong><span>${escapeHtml(s.student_no || String(i+1).padStart(2,'0'))}</span></button>`;
  }).join('') : '<div class="empty-state" style="grid-column:1/-1">尚未导入学生名单。请前往“花名册 → 导入”。</div>';
}
function seatingOrder() {
  const valid = state.seating.sort((a,b)=>a.seat_no-b.seat_no).map(x=>x.student_id).filter(id=>state.students.some(s=>s.id===id));
  const rest = state.students.map(s=>s.id).filter(id=>!valid.includes(id));
  return [...valid,...rest];
}

function renderDuty() {
  const studentMap = new Map(state.students.map(s=>[s.id,s.name]));
  const dayIndex = new Date().getDay();
  const rows = weekdays.map((day,i)=>state.duty.find(x=>Number(x.weekday)===i+1) || {weekday:i+1,classroom:[],public_area:[],leader_id:null});
  $('dutyGrid').innerHTML = rows.map((d,i)=>`
    <div class="duty-card ${dayIndex===i+1?'today':''}">
      <div class="duty-day"><strong>${weekdays[i]}</strong><span>${dayIndex===i+1?'今天':'待执行'}</span></div>
      <div class="duty-task"><label>教室清洁</label><div class="duty-people">${chips(d.classroom)}</div></div>
      <div class="duty-task"><label>公共区域</label><div class="duty-people">${chips(d.public_area)}</div></div>
      <div class="duty-task"><label>值日组长</label><div class="duty-people"><span>${escapeHtml(studentMap.get(d.leader_id) || '待安排')}</span></div></div>
    </div>`).join('');
}
function chips(arr) { return Array.isArray(arr) && arr.length ? arr.map(x=>`<span class="student-real">${escapeHtml(x)}</span>`).join('') : '<span>待安排</span>'; }

function renderRoster(filter = '') {
  const q = filter.trim().toLowerCase();
  const students = [...state.students].sort((a,b)=>String(a.student_no||'').localeCompare(String(b.student_no||''),'zh-CN',{numeric:true})).filter(s=>!q || `${s.name} ${s.student_no}`.toLowerCase().includes(q));
  $('rosterCountText').textContent = `${state.classInfo.name || config.CLASS_NAME} · 共 ${state.students.length} 人`;
  $('rosterBody').innerHTML = students.length ? students.map(s=>`
    <tr>
      <td>${escapeHtml(s.student_no || '—')}</td>
      <td><div class="student-cell"><span class="mini-avatar">${escapeHtml((s.name||'?').slice(0,1))}</span><strong class="student-real">${escapeHtml(s.name)}</strong></div></td>
      <td>${escapeHtml(s.gender || '待录入')}</td><td>${escapeHtml(s.boarding || '待录入')}</td>
      <td>${tagHTML(s.tags)}</td><td class="private-value">${escapeHtml(s.phone || '待录入')}</td>
      <td><button class="action-link" data-student-view="${s.id}">查看</button><button class="action-link" data-student-edit="${s.id}">编辑</button></td>
    </tr>`).join('') : '<tr><td colspan="7"><div class="empty-state">尚未导入学生名单。正式使用建议登录 Supabase 后导入私有 CSV；真实名单不要写进公开 GitHub 仓库。</div></td></tr>';
}
function tagHTML(tags) {
  if (!Array.isArray(tags) || !tags.length) return '<span class="tag">未设置</span>';
  return tags.map(t=>`<span class="tag ${t==='班干部'?'green':t==='重点关注'?'yellow':''}">${escapeHtml(t)}</span>`).join(' ');
}

function renderCommittee() {
  const map = new Map(state.students.map(s=>[s.id,s]));
  const rows = committeeRoles.map(([role,duty])=>state.committee.find(x=>x.role===role) || {role,duty,student_id:null});
  $('committeeGrid').innerHTML = rows.map(c=>{
    const s = map.get(c.student_id);
    return `<div class="committee-card"><div class="committee-avatar">${escapeHtml(s?.name?.slice(-1) || '—')}</div><h3 class="student-real">${escapeHtml(s?.name || '待确认')}</h3><strong>${escapeHtml(c.role)}</strong><p>${escapeHtml(c.duty || '')}</p></div>`;
  }).join('');
}

function renderParents(filter = '') {
  const parentMap = new Map(state.parents.map(p=>[p.student_id,p]));
  const q = filter.trim().toLowerCase();
  const rows = state.students.filter(s=>{
    const p = parentMap.get(s.id) || {};
    return !q || `${s.name} ${p.parent_name||''}`.toLowerCase().includes(q);
  });
  $('parentsBody').innerHTML = rows.length ? rows.map(s=>{
    const p = parentMap.get(s.id) || {};
    return `<tr><td><div class="student-cell"><span class="mini-avatar">${escapeHtml(s.name.slice(0,1))}</span><strong class="student-real">${escapeHtml(s.name)}</strong></div></td><td class="private-value">${escapeHtml(p.parent_name||'待录入')}</td><td>${escapeHtml(p.relation||'待录入')}</td><td class="private-value">${escapeHtml(p.phone||'待录入')}</td><td class="private-value">${escapeHtml(p.wechat||'待录入')}</td><td>${p.last_contact?formatDate(p.last_contact):'暂无记录'}</td><td><button class="action-link" data-parent-edit="${s.id}">${p.id?'编辑':'录入'}</button></td></tr>`;
  }).join('') : '<tr><td colspan="7"><div class="empty-state">请先导入学生名单</div></td></tr>';
}

function renderTimetable() {
  const map = new Map(state.timetable.map(x=>[`${x.weekday}-${x.period}`,x]));
  $('timetableBody').innerHTML = periods.map((periodName,pi)=>`<tr><th>${periodName}<span>${pi<7?'时间待定':''}</span></th>${weekdays.map((_,di)=>{
    const cell = map.get(`${di+1}-${pi+1}`) || {};
    const subject = cell.subject || '待排课';
    return `<td class="${subjectClass(subject)}" data-timetable-cell="${di+1}-${pi+1}">${escapeHtml(subject)}<span>${escapeHtml(cell.teacher || (subject==='待排课'?'课程尚未公布':'教师待定'))}</span></td>`;
  }).join('')}</tr>`).join('');
}
function subjectClass(s){if(['语文','数学','英语','班会'].includes(s))return 'subject-main';if(['物理','化学','生物','信息技术'].includes(s))return 'subject-science';if(['体育','美术','音乐','劳动','社团'].includes(s))return 'subject-art';return ''}

function updateNotificationDot() {
  $('notificationDot').classList.toggle('hidden', state.tasks.every(t=>t.status==='done'));
}

function openWorkDetail(type) {
  currentDetailType = type;
  const cards = buildWorkCards();
  const item = cards.find(x=>x.id===type);
  if (!item) return;
  $('detailIcon').textContent = item.icon;
  $('detailCategory').textContent = item.category;
  $('detailTitle').textContent = item.title;
  $('panelPrimary').textContent = type === 'attendance' ? '登记考勤' : '新增记录';
  const recs = state.work_records.filter(r=>r.type===type).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,8);
  const summary = detailSummary(type);
  $('detailBody').innerHTML = `
    <section class="detail-section"><h3>数据概览</h3><div class="summary-box">${summary.map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('')}</div></section>
    <section class="detail-section"><h3>最新记录</h3><div class="record-list">${recs.length?recs.map(r=>`<div class="record-item"><i class="record-bullet"></i><div><strong>${escapeHtml(r.title||'记录')}</strong><p>${escapeHtml(r.content||'')}</p></div><time>${formatDate(r.record_date||r.created_at?.slice(0,10))}</time></div>`).join(''):'<div class="empty-state">暂无记录</div>'}</div></section>
    <section class="detail-section"><h3>使用建议</h3><div class="record-item"><i class="record-bullet" style="background:#e7bd66"></i><div><strong>数据可以直接在网页里维护</strong><p>${mode==='cloud'?'保存后写入 Supabase，并在其他设备同步。':'当前为本地模式，数据只保存在此浏览器；连接 Supabase 后可云端同步。'}</p></div></div></section>`;
  $('detailPanel').classList.add('open'); $('overlay').classList.add('show'); $('detailPanel').setAttribute('aria-hidden','false');
}
function detailSummary(type) {
  const today = todayISO();
  if (type==='attendance') {
    const r=state.attendance.filter(x=>x.day===today);
    return [['应到',state.students.length],['到校',r.filter(x=>['present','late'].includes(x.status)).length||'—'],['请假',r.filter(x=>x.status==='leave').length||'—']];
  }
  const records = state.work_records.filter(x=>x.type===type);
  const todayCount = records.filter(x=>x.record_date===today).length;
  return [['今日',todayCount],['累计',records.length],['状态',records.length?'已启用':'待记录']];
}
function closePanel(){ $('detailPanel').classList.remove('open'); $('overlay').classList.remove('show'); $('detailPanel').setAttribute('aria-hidden','true'); }

async function openAttendanceEditor() {
  if (!state.students.length) return toast('请先导入学生名单', 'error');
  const day = todayISO();
  const map = new Map(state.attendance.filter(x=>x.day===day).map(x=>[x.student_id,x]));
  const rows = state.students.map(s=>{
    const current = map.get(s.id)?.status || 'present';
    return `<div class="attendance-row"><div class="attendance-name"><strong class="student-real">${escapeHtml(s.name)}</strong><span>${escapeHtml(s.student_no||'')}</span></div><div class="status-options">${[['present','正常'],['late','迟到'],['leave','请假'],['absent','缺勤']].map(([v,l])=>`<label><input type="radio" name="att-${s.id}" value="${v}" ${current===v?'checked':''}>${l}</label>`).join('')}</div></div>`;
  }).join('');
  showModal({ title:`今日考勤 · ${formatDate(day)}`, large:true, body:`<div class="attendance-list">${rows}</div>`, footer:'<button class="secondary-btn" id="cancelAttendance">取消</button><button class="primary-btn" id="saveAttendance">保存考勤</button>', onReady:()=>{
    $('cancelAttendance').onclick=closeModal;
    $('saveAttendance').onclick=async()=>{
      const now=new Date().toISOString();
      const payload=state.students.map(s=>{
        const status=document.querySelector(`input[name="att-${s.id}"]:checked`)?.value || 'present';
        const existing=map.get(s.id);
        return { id: existing?.id || uuid(), class_id:config.CLASS_CODE, student_id:s.id, day, status, note:existing?.note||'', updated_at:now };
      });
      await saveRows('attendance',payload,'student_id,day');
      state.attendance = [...state.attendance.filter(x=>x.day!==day), ...payload];
      await recordActivity(`已完成 ${formatDate(day)} 的班级考勤登记`,'attendance');
      persistAndRender(); closeModal(); closePanel(); toast('今日考勤已保存');
    };
  }});
}

function openRecordEditor(type) {
  const titleMap={discipline:'课堂纪律',homework:'作业收缴',patrol:'课间巡查',meeting:'主题班会',communication:'家校沟通',growth:'学生成长',activity:'班级活动'};
  const studentOptions=state.students.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  showModal({title:`新增${titleMap[type]||'工作'}记录`,body:`<div class="form-grid"><div class="form-field"><label>日期</label><input id="recordDate" type="date" value="${todayISO()}"></div><div class="form-field"><label>关联学生</label><select id="recordStudent"><option value="">不关联具体学生</option>${studentOptions}</select></div><div class="form-field full"><label>标题</label><input id="recordTitle" placeholder="例如：课堂表扬 / 家长电话沟通"></div><div class="form-field full"><label>内容</label><textarea id="recordContent" placeholder="填写本次记录的具体内容"></textarea></div></div>`,footer:'<button class="secondary-btn" id="recordCancel">取消</button><button class="primary-btn" id="recordSave">保存记录</button>',onReady:()=>{
    $('recordCancel').onclick=closeModal;
    $('recordSave').onclick=async()=>{
      const title=$('recordTitle').value.trim(), content=$('recordContent').value.trim();
      if(!title) return toast('请填写标题','error');
      const row={id:uuid(),class_id:config.CLASS_CODE,type,title,content,student_id:$('recordStudent').value||null,record_date:$('recordDate').value||todayISO(),created_at:new Date().toISOString()};
      await saveRows('work_records',row);
      state.work_records.push(row); await recordActivity(`新增${titleMap[type]||'工作'}记录：${title}`,type); persistAndRender(); closeModal(); closePanel(); toast('记录已保存');
    };
  }});
}

function openTaskEditor() {
  showModal({title:'新增待办',body:`<div class="form-grid"><div class="form-field full"><label>待办内容</label><input id="taskTitle" placeholder="例如：核对新生住宿信息"></div><div class="form-field"><label>截止日期</label><input id="taskDue" type="date" value="${todayISO()}"></div><div class="form-field"><label>优先级</label><select id="taskPriority"><option value="high">高</option><option value="medium" selected>中</option><option value="low">低</option></select></div></div>`,footer:'<button class="secondary-btn" id="taskCancel">取消</button><button class="primary-btn" id="taskSave">保存</button>',onReady:()=>{
    $('taskCancel').onclick=closeModal;
    $('taskSave').onclick=async()=>{
      const title=$('taskTitle').value.trim(); if(!title)return toast('请输入待办内容','error');
      const now=new Date().toISOString(); const row={id:uuid(),class_id:config.CLASS_CODE,title,due_date:$('taskDue').value||null,priority:$('taskPriority').value,status:'todo',created_at:now,updated_at:now};
      await saveRows('tasks',row); state.tasks.push(row); await recordActivity(`新增待办：${title}`,'task'); persistAndRender(); closeModal(); toast('待办已添加');
    };
  }});
}

async function toggleTask(id) {
  const task=state.tasks.find(x=>x.id===id); if(!task)return;
  task.status=task.status==='done'?'todo':'done'; task.updated_at=new Date().toISOString();
  await saveRows('tasks',task); await recordActivity(`${task.status==='done'?'完成':'重新打开'}待办：${task.title}`,'task'); persistAndRender();
}

function openStudentEditor(id=null) {
  const s=id?state.students.find(x=>x.id===id):null;
  showModal({title:s?'编辑学生':'新增学生',body:`<div class="form-grid">
    <div class="form-field"><label>序号</label><input id="studentNo" value="${escapeHtml(s?.student_no||'')}" placeholder="例如 1"></div>
    <div class="form-field"><label>姓名 *</label><input id="studentNameInput" value="${escapeHtml(s?.name||'')}"></div>
    <div class="form-field"><label>性别</label><select id="studentGender"><option value="">待录入</option><option ${s?.gender==='男'?'selected':''}>男</option><option ${s?.gender==='女'?'selected':''}>女</option></select></div>
    <div class="form-field"><label>住宿</label><select id="studentBoarding"><option value="">待录入</option><option value="是" ${s?.boarding==='是'?'selected':''}>住校</option><option value="否" ${s?.boarding==='否'?'selected':''}>走读</option></select></div>
    <div class="form-field full"><label>联系电话</label><input id="studentPhone" value="${escapeHtml(s?.phone||'')}" placeholder="可留空"></div>
    <div class="form-field full"><label>标签</label><input id="studentTags" value="${escapeHtml((s?.tags||[]).join('、'))}" placeholder="多个标签用顿号或逗号分隔，例如：班干部、重点关注"></div>
  </div>`,footer:`${s?'<button class="danger-btn" id="studentDelete">删除学生</button>':''}<span style="flex:1"></span><button class="secondary-btn" id="studentCancel">取消</button><button class="primary-btn" id="studentSave">保存</button>`,onReady:()=>{
    $('studentCancel').onclick=closeModal;
    if(s) $('studentDelete').onclick=async()=>{
      if(!confirm(`确定删除 ${s.name} 吗？相关考勤和家长信息也可能被删除。`))return;
      await deleteRow('students',s.id); state.students=state.students.filter(x=>x.id!==s.id); state.parents=state.parents.filter(x=>x.student_id!==s.id); state.attendance=state.attendance.filter(x=>x.student_id!==s.id); state.seating=state.seating.filter(x=>x.student_id!==s.id); await recordActivity(`删除学生：${s.name}`,'student'); persistAndRender(); closeModal(); toast('学生已删除');
    };
    $('studentSave').onclick=async()=>{
      const name=$('studentNameInput').value.trim(); if(!name)return toast('姓名不能为空','error');
      const now=new Date().toISOString(); const row={id:s?.id||uuid(),class_id:config.CLASS_CODE,student_no:$('studentNo').value.trim(),name,gender:$('studentGender').value,boarding:$('studentBoarding').value,phone:$('studentPhone').value.trim(),tags:$('studentTags').value.split(/[、,，]/).map(x=>x.trim()).filter(Boolean),created_at:s?.created_at||now,updated_at:now};
      await saveRows('students',row,'id');
      state.students=s?[...state.students.filter(x=>x.id!==s.id),row]:[...state.students,row];
      await recordActivity(`${s?'更新':'新增'}学生：${name}`,'student'); persistAndRender(); closeModal(); toast('学生资料已保存');
    };
  }});
}

function openStudentView(id) {
  const s=state.students.find(x=>x.id===id); if(!s)return;
  const att=state.attendance.filter(x=>x.student_id===id);
  const late=att.filter(x=>x.status==='late').length, leave=att.filter(x=>x.status==='leave').length, absent=att.filter(x=>x.status==='absent').length;
  const parent=state.parents.find(x=>x.student_id===id);
  const related=state.work_records.filter(x=>x.student_id===id).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,5);
  showModal({title:`学生档案 · ${s.name}`,large:true,body:`<div class="data-status"><div class="status-card"><span>考勤记录</span><strong>${att.length} 天</strong></div><div class="status-card"><span>迟到 / 请假</span><strong>${late} / ${leave}</strong></div><div class="status-card"><span>关联记录</span><strong>${state.work_records.filter(x=>x.student_id===id).length}</strong></div></div><div class="form-grid"><div class="form-field"><label>序号</label><input value="${escapeHtml(s.student_no||'—')}" disabled></div><div class="form-field"><label>姓名</label><input value="${escapeHtml(s.name)}" disabled></div><div class="form-field"><label>性别</label><input value="${escapeHtml(s.gender||'待录入')}" disabled></div><div class="form-field"><label>住宿</label><input value="${escapeHtml(s.boarding||'待录入')}" disabled></div><div class="form-field full"><label>家长信息</label><input value="${escapeHtml(parent?`${parent.parent_name||'待录入'} · ${parent.phone||'无电话'}`:'待录入')}" disabled></div></div><div class="detail-section" style="margin-top:18px"><h3>最近成长 / 管理记录</h3><div class="record-list">${related.length?related.map(r=>`<div class="record-item"><i class="record-bullet"></i><div><strong>${escapeHtml(r.title)}</strong><p>${escapeHtml(r.content||'')}</p></div><time>${formatDate(r.record_date)}</time></div>`).join(''):'<div class="empty-state">暂无关联记录</div>'}</div></div>`,footer:`<button class="secondary-btn" id="viewClose">关闭</button><button class="primary-btn" id="viewEdit">编辑资料</button>`,onReady:()=>{$('viewClose').onclick=closeModal;$('viewEdit').onclick=()=>{closeModal();openStudentEditor(id)}}});
}

function openParentEditor(studentId) {
  const s=state.students.find(x=>x.id===studentId); if(!s)return;
  const p=state.parents.find(x=>x.student_id===studentId);
  showModal({title:`家长信息 · ${s.name}`,body:`<div class="form-grid"><div class="form-field"><label>家长姓名</label><input id="parentName" value="${escapeHtml(p?.parent_name||'')}"></div><div class="form-field"><label>关系</label><input id="parentRelation" value="${escapeHtml(p?.relation||'')}" placeholder="父亲 / 母亲 / 其他"></div><div class="form-field"><label>联系电话</label><input id="parentPhone" value="${escapeHtml(p?.phone||'')}"></div><div class="form-field"><label>微信</label><input id="parentWechat" value="${escapeHtml(p?.wechat||'')}"></div><div class="form-field"><label>最近沟通</label><input id="parentLast" type="date" value="${escapeHtml(p?.last_contact||'')}"></div><div class="form-field"><label>状态</label><input id="parentStatus" value="${escapeHtml(p?.status||'正常')}"></div><div class="form-field full"><label>备注</label><textarea id="parentNote">${escapeHtml(p?.note||'')}</textarea></div></div>`,footer:'<button class="secondary-btn" id="parentCancel">取消</button><button class="primary-btn" id="parentSave">保存</button>',onReady:()=>{$('parentCancel').onclick=closeModal;$('parentSave').onclick=async()=>{
    const row={id:p?.id||uuid(),class_id:config.CLASS_CODE,student_id:studentId,parent_name:$('parentName').value.trim(),relation:$('parentRelation').value.trim(),phone:$('parentPhone').value.trim(),wechat:$('parentWechat').value.trim(),last_contact:$('parentLast').value||null,status:$('parentStatus').value.trim()||'正常',note:$('parentNote').value.trim(),updated_at:new Date().toISOString()};
    await saveRows('parents',row,'student_id'); state.parents=[...state.parents.filter(x=>x.student_id!==studentId),row]; await recordActivity(`更新 ${s.name} 的家长联系资料`,'parent'); persistAndRender(); closeModal(); toast('家长资料已保存');
  }}});
}

function openCommitteeEditor() {
  const studentOptions = state.students.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  const rows=committeeRoles.map(([role,duty])=>{const c=state.committee.find(x=>x.role===role);return `<div class="form-field"><label>${role}</label><select data-committee-role="${role}"><option value="">待确认</option>${state.students.map(s=>`<option value="${s.id}" ${c?.student_id===s.id?'selected':''}>${escapeHtml(s.name)}</option>`).join('')}</select><span class="helper">${duty}</span></div>`}).join('');
  showModal({title:'编辑班委名单',large:true,body:`<div class="form-grid">${rows}</div>`,footer:'<button class="secondary-btn" id="committeeCancel">取消</button><button class="primary-btn" id="committeeSave">保存班委</button>',onReady:()=>{$('committeeCancel').onclick=closeModal;$('committeeSave').onclick=async()=>{
    const now=new Date().toISOString(); const payload=committeeRoles.map(([role,duty])=>{const old=state.committee.find(x=>x.role===role);return{id:old?.id||uuid(),class_id:config.CLASS_CODE,role,student_id:document.querySelector(`[data-committee-role="${role}"]`).value||null,duty,updated_at:now}});
    await saveRows('committee',payload,'class_id,role'); state.committee=payload; await recordActivity('更新班委名单','committee'); persistAndRender(); closeModal(); toast('班委名单已保存');
  }}});
}

function openDutyEditor() {
  const map=new Map(state.duty.map(x=>[Number(x.weekday),x]));
  const rows=weekdays.map((day,i)=>{const d=map.get(i+1)||{};return `<div class="content-card" style="padding:14px;box-shadow:none"><strong style="font-size:13px">${day}</strong><div class="form-grid" style="margin-top:10px"><div class="form-field full"><label>教室清洁（姓名用顿号分隔）</label><input data-duty-classroom="${i+1}" value="${escapeHtml((d.classroom||[]).join('、'))}"></div><div class="form-field full"><label>公共区域（姓名用顿号分隔）</label><input data-duty-public="${i+1}" value="${escapeHtml((d.public_area||[]).join('、'))}"></div><div class="form-field full"><label>值日组长</label><select data-duty-leader="${i+1}"><option value="">待安排</option>${state.students.map(s=>`<option value="${s.id}" ${d.leader_id===s.id?'selected':''}>${escapeHtml(s.name)}</option>`).join('')}</select></div></div></div>`}).join('');
  showModal({title:'调整值日表',large:true,body:`<div style="display:grid;gap:10px">${rows}</div>`,footer:'<button class="secondary-btn" id="dutyCancel">取消</button><button class="primary-btn" id="dutySave">保存值日表</button>',onReady:()=>{$('dutyCancel').onclick=closeModal;$('dutySave').onclick=async()=>{
    const now=new Date().toISOString(); const payload=weekdays.map((_,i)=>{const old=map.get(i+1);return{id:old?.id||uuid(),class_id:config.CLASS_CODE,weekday:i+1,classroom:splitNames(document.querySelector(`[data-duty-classroom="${i+1}"]`).value),public_area:splitNames(document.querySelector(`[data-duty-public="${i+1}"]`).value),leader_id:document.querySelector(`[data-duty-leader="${i+1}"]`).value||null,updated_at:now}});
    await saveRows('duty',payload,'class_id,weekday'); state.duty=payload; await recordActivity('更新本周值日安排','duty'); persistAndRender(); closeModal(); toast('值日表已保存');
  }}});
}
function splitNames(v){return v.split(/[、,，\s]+/).map(x=>x.trim()).filter(Boolean)}

function openTimetableEditor() {
  const map=new Map(state.timetable.map(x=>[`${x.weekday}-${x.period}`,x]));
  const head=`<tr><th>节次</th>${weekdays.map(x=>`<th>${x}</th>`).join('')}</tr>`;
  const body=periods.map((p,pi)=>`<tr><th>${p}</th>${weekdays.map((_,di)=>{const c=map.get(`${di+1}-${pi+1}`)||{};return `<td><input data-tt-subject="${di+1}-${pi+1}" value="${escapeHtml(c.subject||'')}" placeholder="科目" style="width:100%;margin-bottom:5px;border:1px solid var(--line);border-radius:8px;padding:7px"><input data-tt-teacher="${di+1}-${pi+1}" value="${escapeHtml(c.teacher||'')}" placeholder="教师" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:7px"></td>`}).join('')}</tr>`).join('');
  showModal({title:'编辑课程表',large:true,body:`<p class="helper">当前课程表尚未正式公布，可以先留空。9月1日前收到学校正式安排后再录入。</p><div class="table-wrap"><table class="timetable"><thead>${head}</thead><tbody>${body}</tbody></table></div>`,footer:'<button class="secondary-btn" id="ttCancel">取消</button><button class="primary-btn" id="ttSave">保存课程表</button>',onReady:()=>{$('ttCancel').onclick=closeModal;$('ttSave').onclick=async()=>{
    const now=new Date().toISOString(), payload=[];
    for(let di=1;di<=5;di++)for(let pi=1;pi<=8;pi++){const subject=document.querySelector(`[data-tt-subject="${di}-${pi}"]`).value.trim(),teacher=document.querySelector(`[data-tt-teacher="${di}-${pi}"]`).value.trim();const old=map.get(`${di}-${pi}`); if(subject||teacher||old)payload.push({id:old?.id||uuid(),class_id:config.CLASS_CODE,weekday:di,period:pi,subject,teacher,room:old?.room||'',updated_at:now});}
    if(payload.length) await saveRows('timetable',payload,'class_id,weekday,period'); state.timetable=payload; await recordActivity('更新班级课程表','timetable'); persistAndRender(); closeModal(); toast('课程表已保存');
  }}});
}

function openNotifications() {
  const pending=state.tasks.filter(t=>t.status!=='done').sort((a,b)=>String(a.due_date||'').localeCompare(String(b.due_date||'')));
  showModal({title:'通知与提醒',body:pending.length?`<div class="record-list">${pending.map(t=>`<div class="record-item"><i class="record-bullet"></i><div><strong>${escapeHtml(t.title)}</strong><p>${t.due_date?`截止 ${formatDate(t.due_date)}`:'未设置截止日期'}</p></div><time>${priorityText(t.priority)}优先级</time></div>`).join('')}</div>`:'<div class="empty-state">当前没有未完成待办</div>',footer:'<button class="primary-btn" id="noticeClose">知道了</button>',onReady:()=>{$('noticeClose').onclick=closeModal}});
}

function openGlobalSearch() {
  showModal({title:'全局搜索',body:`<div class="form-field"><label>搜索学生</label><input id="globalSearchInput" placeholder="输入姓名或序号" autofocus></div><div id="globalSearchResults" style="margin-top:12px"></div>`,onReady:()=>{
    const input=$('globalSearchInput'), results=$('globalSearchResults');
    const run=()=>{const q=input.value.trim().toLowerCase();const list=q?state.students.filter(s=>`${s.name} ${s.student_no}`.toLowerCase().includes(q)).slice(0,12):[];results.innerHTML=list.length?`<div class="record-list">${list.map(s=>`<button class="record-item" data-global-student="${s.id}" style="width:100%;text-align:left"><i class="record-bullet"></i><div><strong class="student-real">${escapeHtml(s.name)}</strong><p>${escapeHtml(s.student_no||'未设置序号')}</p></div></button>`).join('')}</div>`:(q?'<div class="empty-state">没有找到匹配学生</div>':'');};
    input.addEventListener('input',run); results.addEventListener('click',e=>{const el=e.target.closest('[data-global-student]');if(el){closeModal();openStudentView(el.dataset.globalStudent)}});
  }});
}

function openDataCenter() {
  const cloudStatus=mode==='cloud'&&cloudConfigured()?'已连接 Supabase':'本地浏览器';
  const user=cloud?.user?.email||'未登录';
  showModal({title:'数据管理中心',large:true,body:`
    <div class="data-status"><div class="status-card"><span>数据模式</span><strong>${cloudStatus}</strong></div><div class="status-card"><span>当前账号</span><strong>${escapeHtml(user)}</strong></div><div class="status-card"><span>最近同步</span><strong>${lastSyncAt?formatDateTime(lastSyncAt):'尚未同步'}</strong></div></div>
    <div class="action-grid">
      <button class="action-box" id="backupBtn"><strong>💾 完整备份</strong><span>下载 JSON，包含当前工作台全部数据。</span></button>
      <button class="action-box" id="restoreBtn"><strong>↩ 恢复备份</strong><span>从 JSON 恢复；云端模式下会提示是否写回云端。</span></button>
      <button class="action-box" id="dataImportStudents"><strong>📥 导入学生</strong><span>支持 UTF-8 CSV 或 JSON；无需把真实名单上传到公开 GitHub。</span></button>
      <button class="action-box" id="dataExportRoster"><strong>📤 导出花名册</strong><span>导出 CSV，可使用 Excel/WPS 打开。</span></button>
      <button class="action-box" id="privacyBtn"><strong>◉ 隐私模式</strong><span>投屏时模糊学生姓名、联系方式和家长姓名。</span></button>
      <button class="action-box" id="syncNowBtn"><strong>↻ 立即同步</strong><span>${mode==='cloud'?'从 Supabase 获取最新数据。':'当前为本地模式。'}</span></button>
    </div>
    <div style="margin-top:18px;border-top:1px solid var(--line);padding-top:16px">
      <h3 style="font-size:14px;margin:0 0 10px">Supabase 连接</h3>
      <div class="form-grid"><div class="form-field full"><label>Project URL</label><input id="cfgUrl" value="${escapeHtml(config.SUPABASE_URL)}" placeholder="https://xxxx.supabase.co"></div><div class="form-field full"><label>Publishable key</label><input id="cfgKey" value="${escapeHtml(config.SUPABASE_PUBLISHABLE_KEY)}" placeholder="sb_publishable_..."></div></div>
      <p class="helper">Publishable key 可以用于浏览器；不要在这里填写 Secret key 或 service_role key。保存后仅写入当前浏览器。若要让所有设备自动连接，请把同样内容写入 GitHub 中的 config.js。</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="secondary-btn" id="testCfgBtn">测试并保存到本机</button><button class="secondary-btn" id="downloadCfgBtn">下载 config.js</button></div>
    </div>`,footer:'<button class="primary-btn" id="dataClose">完成</button>',onReady:()=>{
      $('dataClose').onclick=closeModal;
      $('backupBtn').onclick=downloadBackup; $('restoreBtn').onclick=()=>pickFile('restore'); $('dataImportStudents').onclick=()=>pickFile('students'); $('dataExportRoster').onclick=exportRosterCSV; $('privacyBtn').onclick=togglePrivacy; $('syncNowBtn').onclick=syncNow;
      $('testCfgBtn').onclick=async()=>{const url=$('cfgUrl').value.trim().replace(/\/$/,'');const key=$('cfgKey').value.trim();if(!/^https:\/\/.+\.supabase\.co$/.test(url)||!/^sb_publishable_/.test(key))return toast('Project URL 或 Publishable key 格式不正确','error');try{const test=new SupabaseRest(url,key);await test.test();localStorage.setItem(CONFIG_KEY,JSON.stringify({url,key}));toast('连接参数已保存，请刷新页面后登录');setTimeout(()=>location.reload(),900)}catch(e){toast(`连接失败：${e.message}`,'error')}};
      $('downloadCfgBtn').onclick=()=>downloadText('config.js',`window.APP_CONFIG = ${JSON.stringify({...baseConfig,SUPABASE_URL:$('cfgUrl').value.trim(),SUPABASE_PUBLISHABLE_KEY:$('cfgKey').value.trim()},null,2)};`,'application/javascript;charset=utf-8');
    }});
}

function togglePrivacy() {
  const next=localStorage.getItem(PRIVACY_KEY)==='1'?'0':'1'; localStorage.setItem(PRIVACY_KEY,next); document.body.classList.toggle('privacy',next==='1'); toast(next==='1'?'已开启隐私模式':'已关闭隐私模式');
}

function downloadBackup() {
  const backup={version:'2.1',exported_at:new Date().toISOString(),class_code:config.CLASS_CODE,data:state};
  downloadText(`${config.CLASS_CODE}班数据备份-${todayISO()}.json`,JSON.stringify(backup,null,2),'application/json;charset=utf-8'); toast('完整备份已下载');
}
function exportRosterCSV(){
  const rows=[['student_no','name','gender','boarding','phone','tags'],...state.students.map(s=>[s.student_no||'',s.name||'',s.gender||'',s.boarding||'',s.phone||'',(s.tags||[]).join('|')])];
  downloadText(`${config.CLASS_CODE}班花名册-${todayISO()}.csv`,'\ufeff'+toCSV(rows),'text/csv;charset=utf-8');
}
function exportParentsCSV(){
  const map=new Map(state.students.map(s=>[s.id,s])); const rows=[['student_no','student_name','parent_name','relation','phone','wechat','last_contact','status'],...state.parents.map(p=>{const s=map.get(p.student_id)||{};return[s.student_no||'',s.name||'',p.parent_name||'',p.relation||'',p.phone||'',p.wechat||'',p.last_contact||'',p.status||'']})];
  downloadText(`${config.CLASS_CODE}班家长通讯录-${todayISO()}.csv`,'\ufeff'+toCSV(rows),'text/csv;charset=utf-8');
}
function exportScoresCSV(){downloadText(`${config.CLASS_CODE}班成绩模板.csv`,'\ufeff'+toCSV([['考试名称','序号','姓名','语文','数学','英语','物理','化学','生物'],...state.students.map(s=>['',s.student_no||'',s.name||'','','','','','',''])]),'text/csv;charset=utf-8');toast('当前暂无成绩数据，已导出成绩录入模板')}
function toCSV(rows){return rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n')}
function downloadText(filename,text,type){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function pickFile(action){pendingFileAction=action;$('importFileInput').value='';$('importFileInput').click()}

async function handleFile(file) {
  if (!file) return;
  const text=await file.text();
  if(pendingFileAction==='restore') return restoreBackup(text);
  if(pendingFileAction==='students') return importStudents(text,file.name);
}
async function restoreBackup(text) {
  try {
    const parsed=JSON.parse(text); const data=parsed.data||parsed;
    if(!data.students||!Array.isArray(data.students))throw new Error('不是有效的工作台备份文件');
    if(mode==='cloud'&&!confirm('当前为云端模式。恢复后将把备份数据写入 Supabase，是否继续？'))return;
    state={...defaultState(),...data}; saveLocalCache();
    if(mode==='cloud') await pushAllToCloud();
    renderAll(); toast('备份恢复完成');
  }catch(e){toast(`恢复失败：${e.message}`,'error')}
}
async function importStudents(text,filename) {
  try {
    let rows=[];
    if(filename.toLowerCase().endsWith('.json')){
      const p=JSON.parse(text); rows=Array.isArray(p)?p:(p.students||[]);
    }else{
      rows=parseCSV(text);
    }
    const normalized=rows.map((r,i)=>normalizeStudentImport(r,i)).filter(x=>x.name);
    if(!normalized.length)throw new Error('没有识别到学生姓名。CSV 建议包含 student_no,name 两列，或“序号,姓名”。');
    if(!confirm(`识别到 ${normalized.length} 名学生。将按序号/姓名合并现有数据，是否继续？`))return;
    const byNo=new Map(state.students.filter(s=>s.student_no).map(s=>[s.student_no,s]));
    const byName=new Map(state.students.map(s=>[s.name,s]));
    const payload=normalized.map(n=>{const old=byNo.get(n.student_no)||byName.get(n.name);const now=new Date().toISOString();return{...old,...n,id:old?.id||uuid(),class_id:config.CLASS_CODE,created_at:old?.created_at||now,updated_at:now}});
    if(mode==='cloud')await saveRows('students',payload,'id');
    const replaceIds=new Set(payload.map(x=>x.id)); state.students=[...state.students.filter(x=>!replaceIds.has(x.id)&&!payload.some(p=>(p.student_no&&p.student_no===x.student_no)||p.name===x.name)),...payload];
    await recordActivity(`导入学生名单：${payload.length}人`,'student'); persistAndRender(); toast(`已导入 ${payload.length} 名学生`); closeModal();
  }catch(e){toast(`导入失败：${e.message}`,'error')}
}
function parseCSV(text){
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());if(!lines.length)return[];
  const parseLine=line=>{const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(ch===','&&!q){out.push(cur);cur='';}else cur+=ch;}out.push(cur);return out.map(x=>x.trim())};
  const raw=lines.map(parseLine); const headers=raw[0].map(x=>x.toLowerCase()); const hasHeader=headers.some(h=>['name','姓名','student_no','学号'].includes(h));
  if(!hasHeader)return raw.map(r=>({student_no:r[0]||'',name:r[1]||r[0]||'',gender:r[2]||'',boarding:r[3]||'',phone:r[4]||'',tags:r[5]||''}));
  return raw.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]||''])));
}
function normalizeStudentImport(r,i){
  const get=(...keys)=>{for(const k of keys)if(r[k]!=null&&String(r[k]).trim()!=='')return String(r[k]).trim();return''};
  const tags=get('tags','标签','学生标签').split(/[|、,，]/).map(x=>x.trim()).filter(Boolean);
  return {student_no:get('student_no','学号','编号')||`${config.CLASS_CODE}${String(i+1).padStart(2,'0')}`,name:get('name','姓名','学生姓名'),gender:get('gender','性别'),boarding:get('boarding','住校','住宿'),phone:get('phone','联系电话','电话'),tags};
}

function openSyncStatus(){openDataCenter()}

async function saveRows(key, rows, conflict='id') {
  if(mode!=='cloud') return;
  if(!cloud?.accessToken) throw new Error('未登录云端账号');
  setSyncStatus('', '保存中…');
  try { await cloud.upsert(TABLES[key],rows,conflict); lastSyncAt=new Date().toISOString(); setSyncStatus('cloud','云端已同步'); }
  catch(e){setSyncStatus('error','同步失败');toast(`云端保存失败：${e.message}`,'error');throw e}
}
async function deleteRow(key,id){if(mode==='cloud'){await cloud.remove(TABLES[key],id);lastSyncAt=new Date().toISOString()}}
async function recordActivity(content,category='general') {
  const row={id:uuid(),class_id:config.CLASS_CODE,category,content,created_at:new Date().toISOString()};
  if(mode==='cloud'){try{await cloud.upsert(TABLES.activity_logs,row,'id')}catch(e){console.warn(e)}}
  state.activity_logs.unshift(row); state.activity_logs=state.activity_logs.slice(0,200);
}
function persistAndRender(){saveLocalCache();renderAll()}

async function syncFromCloud(silent=false) {
  if(mode!=='cloud'||!cloud?.accessToken)return;
  if(!silent)setSyncStatus('', '同步中…');
  try {
    const classId=encodeURIComponent(config.CLASS_CODE);
    const [classes,students,attendance,tasks,logs,committee,parents,timetable,duty,records,seating]=await Promise.all([
      cloud.select(TABLES.classes,`id=eq.${classId}&limit=1`),
      cloud.select(TABLES.students,`class_id=eq.${classId}&order=student_no.asc`),
      cloud.select(TABLES.attendance,`class_id=eq.${classId}&order=day.desc&limit=1000`),
      cloud.select(TABLES.tasks,`class_id=eq.${classId}&order=created_at.desc`),
      cloud.select(TABLES.activity_logs,`class_id=eq.${classId}&order=created_at.desc&limit=200`),
      cloud.select(TABLES.committee,`class_id=eq.${classId}`),
      cloud.select(TABLES.parents,`class_id=eq.${classId}`),
      cloud.select(TABLES.timetable,`class_id=eq.${classId}`),
      cloud.select(TABLES.duty,`class_id=eq.${classId}`),
      cloud.select(TABLES.work_records,`class_id=eq.${classId}&order=created_at.desc&limit=1000`),
      cloud.select(TABLES.seating,`class_id=eq.${classId}&order=seat_no.asc`)
    ]);
    if(!classes.length){await cloud.upsert(TABLES.classes,{id:config.CLASS_CODE,name:config.CLASS_NAME,teacher:config.TEACHER_NAME,stage:config.SCHOOL_STAGE,updated_at:new Date().toISOString()},'id');state.classInfo={id:config.CLASS_CODE,name:config.CLASS_NAME,teacher:config.TEACHER_NAME,stage:config.SCHOOL_STAGE,updated_at:new Date().toISOString()}}else state.classInfo=classes[0];
    state.students=students;state.attendance=attendance;state.tasks=tasks;state.activity_logs=logs;state.committee=committee.length?committee:state.committee;state.parents=parents;state.timetable=timetable;state.duty=duty.length?duty:state.duty;state.work_records=records;state.seating=seating;
    lastSyncAt=new Date().toISOString();saveLocalCache();renderAll();setSyncStatus('cloud','云端已同步');
    if(!silent)toast('已获取云端最新数据');
  }catch(e){console.error(e);setSyncStatus('error','同步失败');if(!silent)toast(`同步失败：${e.message}`,'error')}
}
async function syncNow(){if(mode==='cloud')await syncFromCloud();else toast('当前为本地模式，可在数据管理中心连接 Supabase','error')}
async function pushAllToCloud(){
  if(mode!=='cloud')return;
  await cloud.upsert(TABLES.classes,state.classInfo,'id');
  const jobs=[['students',state.students,'id'],['attendance',state.attendance,'student_id,day'],['tasks',state.tasks,'id'],['activity_logs',state.activity_logs,'id'],['committee',state.committee,'class_id,role'],['parents',state.parents,'student_id'],['timetable',state.timetable,'class_id,weekday,period'],['duty',state.duty,'class_id,weekday'],['work_records',state.work_records,'id'],['seating',state.seating,'class_id,seat_no']];
  for(const [key,rows,conflict] of jobs)if(rows.length)await cloud.upsert(TABLES[key],rows,conflict);
  lastSyncAt=new Date().toISOString();
}

function shuffleSeats(){
  if(!state.students.length)return toast('暂无学生可排座','error');
  if(!confirm('自动排座会随机打乱当前座次，但不会立即保存到云端。继续吗？'))return;
  const ids=state.students.map(s=>s.id);for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}
  state.seating=ids.map((id,i)=>({id:state.seating.find(x=>x.student_id===id)?.id||uuid(),class_id:config.CLASS_CODE,seat_no:i+1,student_id:id,updated_at:new Date().toISOString()}));saveLocalCache();renderSeating();toast('已生成随机座次，点击“保存调整”提交')
}
async function saveSeats(){
  const order=seatingOrder();state.seating=order.map((id,i)=>({id:state.seating.find(x=>x.student_id===id)?.id||uuid(),class_id:config.CLASS_CODE,seat_no:i+1,student_id:id,updated_at:new Date().toISOString()}));
  if(state.seating.length)await saveRows('seating',state.seating,'class_id,seat_no');await recordActivity('更新班级座次表','seating');persistAndRender();toast('座次表已保存')
}
function seatClick(index){
  if(selectedSeat==null){selectedSeat=index;renderSeating();return}
  if(selectedSeat===index){selectedSeat=null;renderSeating();return}
  const order=seatingOrder();[order[selectedSeat],order[index]]=[order[index],order[selectedSeat]];const oldByStudent=new Map(state.seating.map(x=>[x.student_id,x]));state.seating=order.map((id,i)=>({id:oldByStudent.get(id)?.id||uuid(),class_id:config.CLASS_CODE,seat_no:i+1,student_id:id,updated_at:new Date().toISOString()}));selectedSeat=null;saveLocalCache();renderSeating();
}

function setPage(page){
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===page));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  $(`${page}-page`).classList.add('active');
  const meta={dashboard:['班级管理中心','工作台'],seating:['教室空间管理','座次表'],duty:['班级日常协作','值日表'],scores:['学习数据中心','成绩分析'],roster:['学生信息管理','花名册'],committee:['班级组织管理','班委名单'],parents:['家校协同中心','家长联系方式'],timetable:['教学安排','课程表']};
  $('pageEyebrow').textContent=meta[page][0];$('pageTitle').textContent=meta[page][1];$('appShell').classList.remove('mobile-open');window.scrollTo({top:0,behavior:'smooth'});
}

async function signIn() {
  const email=$('loginEmail').value.trim(),password=$('loginPassword').value;
  if(!email||!password)return toast('请输入邮箱和密码','error');
  $('loginBtn').disabled=true;$('loginBtn').textContent='登录中…';
  try{await cloud.signIn(email,password);mode='cloud';$('loginScreen').classList.add('hidden');setSyncStatus('cloud','云端连接');await syncFromCloud(true);startAutoSync();toast('登录成功')}
  catch(e){toast(`登录失败：${e.message}`,'error')}
  finally{$('loginBtn').disabled=false;$('loginBtn').textContent='登录工作台'}
}
async function logout(){if(mode==='cloud'&&cloud)await cloud.signOut();location.reload()}
function localPreview(){mode='local';$('loginScreen').classList.add('hidden');setSyncStatus('','本地预览');renderAll()}
function startAutoSync(){clearInterval(syncTimer);if(mode==='cloud'&&config.AUTO_SYNC_SECONDS>0)syncTimer=setInterval(()=>syncFromCloud(true),Math.max(15,config.AUTO_SYNC_SECONDS)*1000)}

function installEvents(){
  $('collapseBtn').addEventListener('click',()=>$('appShell').classList.toggle('collapsed'));
  $('mobileMenu').addEventListener('click',()=>$('appShell').classList.add('mobile-open'));
  $('overlay').addEventListener('click',()=>{closePanel();$('appShell').classList.remove('mobile-open')});
  $('closePanel').addEventListener('click',closePanel);$('panelCancel').addEventListener('click',closePanel);
  $('panelPrimary').addEventListener('click',()=>currentDetailType==='attendance'?openAttendanceEditor():openRecordEditor(currentDetailType));
  $('navList').addEventListener('click',e=>{const b=e.target.closest('.nav-item');if(b)setPage(b.dataset.page)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePanel();closeModal()}});
  document.addEventListener('click',e=>{
    const card=e.target.closest('[data-work]');if(card)openWorkDetail(card.dataset.work);
    const task=e.target.closest('[data-task-toggle]');if(task)toggleTask(task.dataset.taskToggle);
    const seat=e.target.closest('[data-seat-index]');if(seat)seatClick(Number(seat.dataset.seatIndex));
    const view=e.target.closest('[data-student-view]');if(view)openStudentView(view.dataset.studentView);
    const edit=e.target.closest('[data-student-edit]');if(edit)openStudentEditor(edit.dataset.studentEdit);
    const pe=e.target.closest('[data-parent-edit]');if(pe)openParentEditor(pe.dataset.parentEdit);
    const tc=e.target.closest('[data-timetable-cell]');if(tc){const[day,period]=tc.dataset.timetableCell.split('-').map(Number);openTimetableCellEditor(day,period)}
  });
  $('addTaskBtn').onclick=openTaskEditor;$('addStudentBtn').onclick=()=>openStudentEditor();$('editCommitteeBtn').onclick=openCommitteeEditor;$('editDutyBtn').onclick=openDutyEditor;$('editTimetableBtn').onclick=openTimetableEditor;
  $('shuffleSeatsBtn').onclick=shuffleSeats;$('saveSeatsBtn').onclick=saveSeats;$('importStudentsBtn').onclick=()=>pickFile('students');$('exportRosterBtn').onclick=exportRosterCSV;$('exportParentsBtn').onclick=exportParentsCSV;$('exportScoresBtn').onclick=exportScoresCSV;
  $('rosterSearch').addEventListener('input',e=>renderRoster(e.target.value));$('parentSearch').addEventListener('input',e=>renderParents(e.target.value));
  $('globalSearchBtn').onclick=openGlobalSearch;$('notificationBtn').onclick=openNotifications;$('syncPill').onclick=openSyncStatus;
  $('moreBtn').onclick=(e)=>{e.stopPropagation();$('footerMenu').classList.toggle('hidden')};
  document.addEventListener('click',e=>{if(!e.target.closest('.sidebar-footer'))$('footerMenu').classList.add('hidden')});
  $('footerMenu').addEventListener('click',e=>{const b=e.target.closest('[data-footer-action]');if(!b)return;$('footerMenu').classList.add('hidden');({data:openDataCenter,privacy:togglePrivacy,sync:syncNow,logout}[b.dataset.footerAction]||(()=>{}))()});
  $('importFileInput').addEventListener('change',e=>handleFile(e.target.files?.[0]));
  $('loginBtn').onclick=signIn;$('localPreviewBtn').onclick=localPreview;$('loginPassword').addEventListener('keydown',e=>{if(e.key==='Enter')signIn()});
  $('todayRecordBtn').onclick=()=>openWorkDetail('attendance');$('semesterPlanBtn').onclick=()=>openWorkDetail('meeting');
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&mode==='cloud')syncFromCloud(true)});
}

function openTimetableCellEditor(day,period){
  const old=state.timetable.find(x=>Number(x.weekday)===day&&Number(x.period)===period);
  showModal({title:`${weekdays[day-1]} · ${periods[period-1]}`,body:`<div class="form-grid"><div class="form-field"><label>科目</label><input id="cellSubject" value="${escapeHtml(old?.subject||'')}" placeholder="例如：语文"></div><div class="form-field"><label>任课教师</label><input id="cellTeacher" value="${escapeHtml(old?.teacher||'')}"></div><div class="form-field full"><label>教室/备注</label><input id="cellRoom" value="${escapeHtml(old?.room||'')}"></div></div>`,footer:'<button class="secondary-btn" id="cellCancel">取消</button><button class="primary-btn" id="cellSave">保存</button>',onReady:()=>{$('cellCancel').onclick=closeModal;$('cellSave').onclick=async()=>{const row={id:old?.id||uuid(),class_id:config.CLASS_CODE,weekday:day,period,subject:$('cellSubject').value.trim(),teacher:$('cellTeacher').value.trim(),room:$('cellRoom').value.trim(),updated_at:new Date().toISOString()};await saveRows('timetable',row,'class_id,weekday,period');state.timetable=[...state.timetable.filter(x=>!(Number(x.weekday)===day&&Number(x.period)===period)),row];await recordActivity(`更新课程表：${weekdays[day-1]} ${periods[period-1]}`,'timetable');persistAndRender();closeModal();toast('课程已保存')}}});
}

async function boot(){
  installEvents();
  const d=new Date();$('todayDate').textContent=`${d.getMonth()+1}月${d.getDate()}日`;$('todayWeek').textContent=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][d.getDay()];
  renderAll();
  if(cloudConfigured()){
    setSyncStatus('','等待登录');
    if(cloud.session?.access_token){
      try{await cloud.refreshIfNeeded();mode='cloud';setSyncStatus('cloud','云端连接');await syncFromCloud(true);startAutoSync()}
      catch(e){cloud.clearSession();$('loginScreen').classList.remove('hidden');setSyncStatus('error','需要登录')}
    }else if(config.REQUIRE_LOGIN){$('loginScreen').classList.remove('hidden')}
  }else setSyncStatus('','本地模式');
}

boot();
