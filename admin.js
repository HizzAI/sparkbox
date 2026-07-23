'use strict';

const SUPABASE_URL = 'https://scioaxiojiituzovaxrg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaW9heGlvamlpdHV6b3ZheHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MjY2OTUsImV4cCI6MjEwMDMwMjY5NX0._rl07aJgRwxlGfMP27Q_z-zoNJwhRuqf425p5EwPy74';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let state = {
  ideas: [],
  announcements: [],
  activeIdeaId: null
};

let chartCat = null;
let chartMonth = null;
let toastTimer = null;

/* ─────────────────────────────
   INIT & AUTH
───────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Inject section visibility CSS
  const style = document.createElement('style');
  style.textContent = `.content-section { display: none; } .content-section.active { display: block; }`;
  document.head.appendChild(style);

  // Auth check
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    await showDashboard();
  } else {
    showLogin();
  }

  // Event: login form
  document.getElementById('login-form').addEventListener('submit', handleLogin);

  // Event: logout button
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Event: save challenge
  document.getElementById('save-challenge-btn')?.addEventListener('click', handleSaveChallenge);

  // Event: search + filter (inside DOMContentLoaded — DOM is ready)
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  searchInput?.addEventListener('input', renderSuggestions);
  statusFilter?.addEventListener('change', renderSuggestions);

  // Event: modal close
  document.getElementById('close-modal')?.addEventListener('click', () => {
    document.getElementById('idea-modal')?.classList.add('hidden');
  });

  // Event: save idea
  document.getElementById('save-idea-btn')?.addEventListener('click', handleSaveIdea);

  // Event: announcement form
  document.getElementById('announcement-form')?.addEventListener('submit', handleCreateAnnouncement);

  // Close modal on backdrop click
  document.getElementById('idea-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
  });
});

function showLogin() {
  document.getElementById('dashboard-page').classList.add('hidden');
  document.getElementById('login-page').classList.remove('hidden');
}

async function showDashboard() {
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('dashboard-page').classList.remove('hidden');
  initNav();
  await loadData();
  renderOverview();
  initAnalytics();
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorMsg = document.getElementById('login-error');
  const btn = e.target.querySelector('button[type="submit"]');

  btn.textContent = 'Signing in...';
  btn.disabled = true;

  const { error } = await db.auth.signInWithPassword({ email, password });

  btn.textContent = 'Sign In';
  btn.disabled = false;

  if (error) {
    errorMsg.textContent = error.message;
    errorMsg.classList.remove('hidden');
  } else {
    errorMsg.classList.add('hidden');
    await showDashboard();
  }
}

async function handleLogout() {
  await db.auth.signOut();
  showLogin();
}

/* ─────────────────────────────
   DATA FETCHING
───────────────────────────── */
async function loadData() {
  const [ideasRes, annRes] = await Promise.all([
    db.from('ideas').select('*').order('created_at', { ascending: false }),
    db.from('announcements').select('*').order('created_at', { ascending: false })
  ]);

  if (!ideasRes.error) state.ideas = ideasRes.data || [];
  if (!annRes.error) state.announcements = annRes.data || [];
}

/* ─────────────────────────────
   NAVIGATION
───────────────────────────── */
function initNav() {
  document.querySelectorAll('.nav-item').forEach(nav => {
    nav.addEventListener('click', async (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      nav.classList.add('active');
      const target = nav.dataset.target;
      document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
      document.getElementById(`view-${target}`)?.classList.add('active');

      if (target === 'overview')     { await loadData(); renderOverview(); }
      if (target === 'suggestions')  { await loadData(); renderSuggestions(); }
      if (target === 'announcements'){ await loadData(); renderAnnouncements(); loadCurrentChallenge(); }
      if (target === 'analytics')    { await loadData(); updateCharts(); }
    });
  });
}

/* ─────────────────────────────
   OVERVIEW
───────────────────────────── */
function renderOverview() {
  const total = state.ideas.length;
  const todayDate = new Date().toISOString().split('T')[0];
  const today       = state.ideas.filter(i => i.created_at && i.created_at.startsWith(todayDate)).length;
  const review      = state.ideas.filter(i => (i.status || '').toLowerCase() === 'under review').length;
  const approved    = state.ideas.filter(i => (i.status || '').toLowerCase() === 'approved').length;
  const implemented = state.ideas.filter(i => (i.status || '').toLowerCase() === 'implemented').length;
  const rejected    = state.ideas.filter(i => (i.status || '').toLowerCase() === 'rejected').length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('stat-total', total);
  set('stat-today', today);
  set('stat-review', review);
  set('stat-approved', approved);
  set('stat-implemented', implemented);
  set('stat-rejected', rejected);

  const tbody = document.getElementById('recent-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  state.ideas.slice(0, 5).forEach(idea => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escHtml(idea.title)}</td>
      <td>${escHtml(idea.category)}</td>
      <td>${escHtml(idea.author_name || 'Anonymous')}</td>
      <td>${new Date(idea.created_at).toLocaleDateString()}</td>
      <td><span class="status-badge st-${getStatusClass(idea.status)}">${escHtml(idea.status || 'Submitted')}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function getStatusClass(status) {
  const s = (status || 'submitted').toLowerCase().replace(/\s+/g, '-');
  const map = { 'submitted': 'submitted', 'under-review': 'review', 'approved': 'approved', 'implemented': 'implemented', 'rejected': 'rejected' };
  return map[s] || 'submitted';
}

/* ─────────────────────────────
   MANAGE SUGGESTIONS
───────────────────────────── */
function renderSuggestions() {
  const tbody = document.getElementById('suggestions-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  const search = (searchInput?.value || '').toLowerCase();
  const filter = statusFilter?.value || 'All';

  const filtered = state.ideas.filter(i => {
    const matchSearch = (i.title || '').toLowerCase().includes(search) ||
                        (i.author_name || '').toLowerCase().includes(search) ||
                        (i.category || '').toLowerCase().includes(search);
    const matchFilter = filter === 'All' || (i.status || 'Submitted').toLowerCase() === filter.toLowerCase();
    return matchSearch && matchFilter;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:#64748b">No suggestions found.</td></tr>`;
    return;
  }

  filtered.forEach(idea => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family:monospace;font-size:0.75rem">${idea.id.split('-')[0]}</td>
      <td>${idea.featured ? '⭐ ' : ''}${escHtml(idea.title)}</td>
      <td>${escHtml(idea.category)}</td>
      <td>${escHtml(idea.author_name || 'Anonymous')}</td>
      <td>${idea.votes}</td>
      <td><span class="status-badge st-${getStatusClass(idea.status)}">${escHtml(idea.status || 'Submitted')}</span></td>
      <td>${new Date(idea.created_at).toLocaleDateString()}</td>
      <td><button class="btn btn-outline btn-sm edit-btn" data-id="${idea.id}">View/Edit</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.edit-btn').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      openModal(id);
    });
  });
}

/* ─────────────────────────────
   MODAL (IDEA DETAILS)
───────────────────────────── */
function openModal(id) {
  const modal = document.getElementById('idea-modal');
  if (!modal) return;
  state.activeIdeaId = id;
  const idea = state.ideas.find(i => i.id === id);
  if (!idea) return;

  document.getElementById('modal-title').textContent = idea.title;
  document.getElementById('modal-cat').textContent = `Category: ${idea.category}`;
  document.getElementById('modal-votes').textContent = `${idea.votes} Votes`;
  document.getElementById('modal-date').textContent = new Date(idea.created_at).toLocaleDateString();
  document.getElementById('modal-author').textContent = `By: ${idea.author_name || 'Anonymous'}`;
  document.getElementById('modal-desc').textContent = idea.description || idea.desc || '';

  // Set status dropdown
  const statVal = (idea.status || 'Submitted');
  const sel = document.getElementById('modal-status');
  if (sel) {
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value.toLowerCase() === statVal.toLowerCase()) {
        sel.selectedIndex = i;
        break;
      }
    }
  }

  const notesEl = document.getElementById('modal-notes');
  const responseEl = document.getElementById('modal-response');
  const featuredEl = document.getElementById('modal-featured');
  if (notesEl) notesEl.value = idea.admin_notes || '';
  if (responseEl) responseEl.value = idea.department_response || '';
  if (featuredEl) featuredEl.checked = idea.featured || false;

  modal.classList.remove('hidden');
}

async function handleSaveIdea() {
  if (!state.activeIdeaId) return;
  const saveBtn = document.getElementById('save-idea-btn');
  const modal   = document.getElementById('idea-modal');

  const status   = document.getElementById('modal-status')?.value;
  const notes    = document.getElementById('modal-notes')?.value;
  const response = document.getElementById('modal-response')?.value;
  const featured = document.getElementById('modal-featured')?.checked;

  if (saveBtn) saveBtn.textContent = 'Saving...';

  const { error } = await db.from('ideas').update({
    status,
    admin_notes: notes,
    department_response: response,
    featured
  }).eq('id', state.activeIdeaId);

  if (saveBtn) saveBtn.textContent = 'Save Changes';

  if (error) {
    showToast('❌ Error: ' + error.message, 'error');
  } else {
    showToast('✅ Idea updated successfully');
    modal?.classList.add('hidden');
    await loadData();
    renderSuggestions();
    renderOverview();
    updateCharts();
  }
}

/* ─────────────────────────────
   MONTHLY CHALLENGE
───────────────────────────── */
async function loadCurrentChallenge() {
  const { data } = await db.from('settings').select('value').eq('key', 'monthly_challenge').single();
  const el = document.getElementById('challenge-text');
  if (el && data) el.value = data.value;
}

async function handleSaveChallenge() {
  const value = document.getElementById('challenge-text')?.value.trim();
  if (!value) return;
  const btn = document.getElementById('save-challenge-btn');
  btn.textContent = 'Saving...';
  btn.disabled = true;
  const { error } = await db.from('settings')
    .upsert({ key: 'monthly_challenge', value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  btn.textContent = 'Save Challenge';
  btn.disabled = false;
  if (error) showToast('❌ Error saving challenge', 'error');
  else showToast('✅ Challenge updated!');
}

/* ─────────────────────────────
   ANNOUNCEMENTS
───────────────────────────── */
function renderAnnouncements() {
  const tbody = document.getElementById('ann-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (state.announcements.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:#64748b">No announcements yet.</td></tr>`;
    return;
  }

  state.announcements.forEach(ann => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="width:120px">${new Date(ann.created_at).toLocaleDateString()}</td>
      <td style="width:250px;font-weight:600">${escHtml(ann.title)}</td>
      <td>${escHtml(ann.content)}</td>
      <td><button class="btn btn-outline del-ann" data-id="${ann.id}" style="font-size:1rem">🗑️</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.del-ann').forEach(b => {
    b.addEventListener('click', async (e) => {
      if (!confirm('Delete this announcement? This will also remove it from the student homepage.')) return;
      const id = e.currentTarget.dataset.id;
      const { error } = await db.from('announcements').delete().eq('id', id);
      if (error) { showToast('❌ Error deleting announcement', 'error'); return; }
      showToast('🗑️ Announcement deleted');
      await loadData();
      renderAnnouncements();
    });
  });
}

async function handleCreateAnnouncement(e) {
  e.preventDefault();
  const title   = document.getElementById('ann-title')?.value.trim();
  const content = document.getElementById('ann-content')?.value.trim();
  if (!title || !content) return;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) { submitBtn.textContent = 'Publishing...'; submitBtn.disabled = true; }

  const { error } = await db.from('announcements').insert([{ title, content }]);

  if (submitBtn) { submitBtn.textContent = 'Publish Announcement'; submitBtn.disabled = false; }

  if (error) {
    showToast('❌ Error: ' + error.message, 'error');
  } else {
    showToast('✅ Announcement published!');
    e.target.reset();
    await loadData();
    renderAnnouncements();
  }
}

/* ─────────────────────────────
   ANALYTICS (CHART.JS)
───────────────────────────── */
function initAnalytics() {
  if (!window.Chart) { console.error('Chart.js not loaded'); return; }
  Chart.defaults.font.family = 'Inter';

  const ctxCat = document.getElementById('chart-category')?.getContext('2d');
  if (ctxCat) {
    chartCat = new Chart(ctxCat, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{ data: [], backgroundColor: ['#a855f7','#10b981','#f59e0b','#ec4899','#f97316','#6b7280'] }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  }

  const ctxMonth = document.getElementById('chart-month')?.getContext('2d');
  if (ctxMonth) {
    chartMonth = new Chart(ctxMonth, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{ label: 'Suggestions', data: [], backgroundColor: '#2563eb', borderRadius: 4 }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
  }

  updateCharts();
}

function updateCharts() {
  if (chartCat) {
    const counts = {};
    state.ideas.forEach(i => counts[i.category] = (counts[i.category] || 0) + 1);
    chartCat.data.labels = Object.keys(counts).map(c => c.charAt(0).toUpperCase() + c.slice(1));
    chartCat.data.datasets[0].data = Object.values(counts);
    chartCat.update();
  }

  if (chartMonth) {
    const mCounts = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      mCounts[d.toLocaleString('default', { month: 'short', year: '2-digit' })] = 0;
    }
    state.ideas.forEach(idea => {
      const d = new Date(idea.created_at);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (mCounts[key] !== undefined) mCounts[key]++;
    });
    chartMonth.data.labels = Object.keys(mCounts);
    chartMonth.data.datasets[0].data = Object.values(mCounts);
    chartMonth.update();
  }

  // Top Ideas Table
  const topIdeas = [...state.ideas].sort((a, b) => b.votes - a.votes).slice(0, 5);
  const tbody = document.getElementById('top-ideas-tbody');
  if (tbody) {
    tbody.innerHTML = '';
    topIdeas.forEach(i => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escHtml(i.title)}</td><td>${i.votes}</td><td><span class="status-badge st-${getStatusClass(i.status)}">${escHtml(i.status || 'Submitted')}</span></td>`;
      tbody.appendChild(tr);
    });
  }
}

/* ─────────────────────────────
   UTILS
───────────────────────────── */
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = 'toast', 3000);
}
