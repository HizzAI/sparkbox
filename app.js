'use strict';

/* ─────────────────────────────
   DUMMY DATA
───────────────────────────── */
const supabaseUrl = 'https://scioaxiojiituzovaxrg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaW9heGlvamlpdHV6b3ZheHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MjY2OTUsImV4cCI6MjEwMDMwMjY5NX0._rl07aJgRwxlGfMP27Q_z-zoNJwhRuqf425p5EwPy74';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// IDEAS fetched from DB
async function fetchIdeas() {
  const [ideasRes, annRes, settingsRes] = await Promise.all([
    supabaseClient.from('ideas').select('*').order('featured', { ascending: false }).order('created_at', { ascending: false }),
    supabaseClient.from('announcements').select('*').order('created_at', { ascending: false }),
    supabaseClient.from('settings').select('*')
  ]);

  if (!ideasRes.error) state.localIdeas = ideasRes.data || [];
  if (!annRes.error)   state.announcements = annRes.data || [];
  if (!settingsRes.error && settingsRes.data) {
    state.settings = {};
    settingsRes.data.forEach(r => { state.settings[r.key] = r.value; });
  }
}

const LEADERS = [
  { name: 'Rahul',  xp: 1500, badge: 'Innovation Hero',  color: '#f59e0b', initial: 'R', badgeColor: '#f97316' },
  { name: 'Priya',  xp: 1200, badge: 'Idea Creator', color: '#8b5cf6', initial: 'P', badgeColor: '#8b5cf6' },
  { name: 'Amit',   xp: 900,  badge: 'Change Maker',    color: '#10b981', initial: 'A', badgeColor: '#10b981' },
  { name: 'Sneha',  xp: 780,  badge: 'Idea Starter',    color: '#3b82f6', initial: 'S', badgeColor: '#3b82f6' },
  { name: 'Kiran',  xp: 640,  badge: 'Idea Starter',    color: '#ec4899', initial: 'K', badgeColor: '#ec4899' },
];

const ACHIEVEMENTS = [
  {
    icon: '💡', name: 'Idea Starter', xp: '+50 XP',
    desc: 'First suggestion submitted.',
    progress: 100, unlocked: true,
    color: 'rgba(16,185,129,.12)',
  },
  {
    icon: '🔥', name: 'Change Maker', xp: '+200 XP',
    desc: 'Suggestion implemented.',
    progress: 100, unlocked: true,
    color: 'rgba(245,158,11,.12)',
  },
  {
    icon: '🚀', name: 'Innovation Hero', xp: '+500 XP',
    desc: 'Multiple useful ideas submitted.',
    progress: 60, unlocked: false,
    color: 'rgba(139,92,246,.12)',
  },
  {
    icon: '🏆', name: 'Spark Champion', xp: '+1000 XP',
    desc: 'Top contributor.',
    progress: 82, unlocked: false,
    color: 'rgba(249,115,22,.12)',
  },
];

const CATEGORY_META = {
  academic:       { label: '🎓 Academic',          color: '#a855f7' },
  laboratory:     { label: '🧪 Labs',              color: '#10b981' },
  events:         { label: '🎉 Events',            color: '#f59e0b' },
  projects:       { label: '🚀 Projects',          color: '#ec4899' },
  infrastructure: { label: '🏗️ Infrastructure',    color: '#f97316' },
  other:          { label: '✨ Other',             color: '#6b7280' }
};

const STATUS_META = {
  'submitted':   { label: 'Submitted',    cls: 'status-submitted',   dot: '🔵' },
  'under review':{ label: 'Under Review', cls: 'status-review',      dot: '🟡' },
  'approved':    { label: 'Approved',     cls: 'status-approved',    dot: '🟣' },
  'implemented': { label: 'Implemented',  cls: 'status-implemented', dot: '🟢' },
  'rejected':    { label: 'Rejected',     cls: 'status-rejected',    dot: '🔴' },
};

/* ─────────────────────────────
   STATE
───────────────────────────── */
const state = {
  currentPage:  'home',
  activeFilter: 'all',
  votedIds:     new Set(JSON.parse(localStorage.getItem('sb_voted') || '[]')),
  localIdeas:   [],
  announcements: [],
  settings:     {}
};

/* ─────────────────────────────
   ROUTER
───────────────────────────── */
function getPage() {
  const hash = location.hash.replace('#', '').trim() || 'home';
  const valid = ['home','submit','feed','leaderboard','achievements','halloffame','timeline','about','contact','faq','404'];
  return valid.includes(hash) ? hash : '404';
}

function navigate(page) {
  if (state.currentPage === page) return;
  const old = document.getElementById(`page-${state.currentPage}`);
  const next = document.getElementById(`page-${page}`);
  if (!next) return;
  old?.classList.add('hidden');
  next.classList.remove('hidden');
  next.style.animation = 'none';
  requestAnimationFrame(() => {
    next.style.animation = '';
    next.style.animation = 'page-in 600ms cubic-bezier(0.16,1,0.3,1) both';
  });
  state.currentPage = page;
  updateNavLinks(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  onPageEnter(page);
}

function generateSkeletonHTML(count) {
  return Array(count).fill().map(() => `
    <div class="idea-card skeleton-card">
      <div class="skeleton-line" style="width: 40%; height: 20px; margin-bottom: 1rem;"></div>
      <div class="skeleton-line" style="width: 80%; height: 24px; margin-bottom: 0.5rem;"></div>
      <div class="skeleton-line" style="width: 60%; height: 24px; margin-bottom: 1.5rem;"></div>
      <div class="skeleton-line" style="width: 100%; height: 60px; margin-bottom: 1.5rem;"></div>
      <div class="skeleton-line" style="width: 100%; height: 40px; border-radius: var(--radius-full);"></div>
    </div>
  `).join('');
}

async function onPageEnter(page) {
  if (page === 'home') {
    const el = document.getElementById('home-ideas-grid');
    if(el) el.innerHTML = generateSkeletonHTML(3);
  }
  if (page === 'feed') {
    const el = document.getElementById('feed-grid');
    if(el) el.innerHTML = generateSkeletonHTML(6);
  }

  await fetchIdeas();
  if (page === 'home')        { renderHomeIdeas(); animateStats(); animateXPBars(); renderAnnouncements(); renderIdeaOfWeek(); renderMonthlyChallenge(); renderTrending(); }
  if (page === 'feed')        renderFeed();
  if (page === 'leaderboard') renderLeaderboard();
  if (page === 'achievements') renderAchievements();
  if (page === 'halloffame')  renderHallOfFame();
  if (page === 'timeline')    renderTimeline();
}

function updateNavLinks(page) {
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
}

/* ─────────────────────────────
   IDEA CARD BUILDER
───────────────────────────── */
function buildIdeaCard(idea, index = 0) {
  const cat  = CATEGORY_META[idea.category] || { label: idea.category, color: '#7c3aed' };
  const stat = STATUS_META[(idea.status || 'submitted').toLowerCase()] || STATUS_META['submitted'];
  const voted = state.votedIds.has(idea.id);

  const card = document.createElement('article');
  card.className = 'idea-card';
  card.style.setProperty('--i', index);
  card.style.animationDelay = `${index * 70}ms`;
  card.setAttribute('aria-label', `Idea: ${idea.title}`);

  card.innerHTML = `
    <div class="card-top">
      <div style="display:flex; flex-direction:column; gap:4px">
        <h3 class="card-title">${idea.featured ? '⭐ ' : ''}${escHtml(idea.title)}</h3>
        <span style="font-size:0.75rem; color:var(--text-muted); font-family: monospace;">ID: ${idea.id.split('-')[0]}</span>
      </div>
      <span class="status-badge ${stat.cls}" aria-label="Status: ${stat.label}">
        ${stat.dot} ${stat.label}
      </span>
    </div>
    <p class="card-desc">${escHtml(idea.description || idea.desc)}</p>
    <div class="card-meta">
      <span class="card-category" style="--cat:${cat.color}">${cat.label}</span>
      <button class="vote-btn ${voted ? 'voted' : ''}"
              aria-label="${voted ? 'Remove vote' : 'Upvote'} for ${escHtml(idea.title)}"
              data-id="${idea.id}">
        <span class="vote-icon" aria-hidden="true">${voted ? '🔥' : '👍'}</span>
        <span class="vote-count">${idea.votes}</span>
      </button>
    </div>
    <div class="card-meta" style="margin-top:8px;font-size:0.8rem;opacity:0.7">
      <span>👤 ${escHtml(idea.author_name || 'Anonymous')}</span>
      <span>📅 ${new Date(idea.created_at).toLocaleDateString()}</span>
    </div>
    ${idea.department_response ? `
    <div style="margin-top:12px;padding:10px 12px;background:rgba(59,130,246,0.08);border-left:3px solid #3b82f6;border-radius:4px">
      <div style="font-size:0.7rem;font-weight:700;color:#3b82f6;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">Dept. Response</div>
      <p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.4;margin:0">${escHtml(idea.department_response)}</p>
    </div>
    ` : ''}
  `;

  card.querySelector('.vote-btn').addEventListener('click', handleVote);
  return card;
}

async function handleVote(e) {
  const btn  = e.currentTarget;
  const id   = btn.dataset.id;
  const idea = state.localIdeas.find(i => i.id === id);
  if (!idea) return;

  const wasVoted = state.votedIds.has(id);

  // Toggle
  if (wasVoted) {
    state.votedIds.delete(id);
    idea.votes = Math.max(0, idea.votes - 1);
    btn.classList.remove('voted');
    btn.querySelector('.vote-icon').textContent = '👍';
  } else {
    state.votedIds.add(id);
    idea.votes++;
    btn.classList.add('voted');
    const icon = btn.querySelector('.vote-icon');
    icon.textContent = '🔥';
    // Pulse animation
    icon.classList.remove('pulse');
    requestAnimationFrame(() => icon.classList.add('pulse'));
    setTimeout(() => icon.classList.remove('pulse'), 500);
    showToast('🔥 Vote added! +5 XP earned');
  }

  // Persist voted IDs to localStorage
  localStorage.setItem('sb_voted', JSON.stringify([...state.votedIds]));

  btn.querySelector('.vote-count').textContent = idea.votes;
  btn.setAttribute('aria-label', wasVoted ? `Upvote ${idea.title}` : `Remove vote for ${idea.title}`);

  await supabaseClient.from('ideas').update({ votes: idea.votes }).eq('id', id);
}

/* ─────────────────────────────
   HOME RENDER
───────────────────────────── */
function renderHomeIdeas() {
  const grid = document.getElementById('home-ideas-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const recent = [...state.localIdeas].slice(0, 4);
  if (recent.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💡</div>
        <h3 class="empty-state-title">No ideas yet</h3>
        <p>Be the first to share an innovative suggestion.</p>
      </div>
    `;
    return;
  }
  recent.forEach((idea, i) => grid.appendChild(buildIdeaCard(idea, i)));
}

/* ─────────────────────────────
   FEED RENDER
───────────────────────────── */
function renderFeed(filter = state.activeFilter) {
  const grid = document.getElementById('feed-grid');
  if (!grid) return;
  grid.innerHTML = '';

  let filtered = state.localIdeas;
  if (filter !== 'all') filtered = filtered.filter(i => i.category === filter);

  const sort = document.getElementById('feed-sort')?.value || 'votes';
  if (sort === 'votes')       filtered = [...filtered].sort((a, b) => b.votes - a.votes);
  if (sort === 'recent')      filtered = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (sort === 'implemented') filtered = filtered.filter(i => (i.status || '').toLowerCase() === 'implemented');

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3 class="empty-state-title">No ideas found</h3>
        <p>We couldn't find any ideas matching this filter.</p>
      </div>
    `;
    return;
  }
  filtered.forEach((idea, i) => grid.appendChild(buildIdeaCard(idea, i)));
}

/* ─────────────────────────────
   LEADERBOARD RENDER
───────────────────────────── */
function renderLeaderboard() {
  const list = document.getElementById('leaderboard-list');
  if (!list) return;
  list.innerHTML = '';

  LEADERS.forEach((user, idx) => {
    const div = document.createElement('div');
    div.className = 'lb-full-item';
    div.style.setProperty('--i', idx);
    const maxXp = LEADERS[0].xp;
    const pct   = Math.round((user.xp / maxXp) * 100);
    const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
    
    div.innerHTML = `
      <div class="lb-full-rank" style="min-width: 80px; font-size: 1rem;">${rankEmoji} Rank ${idx + 1}</div>
      <div class="lb-avatar" style="--color:${user.color}" aria-hidden="true">${user.initial}</div>
      <div class="lb-full-info">
        <span class="lb-full-name">${escHtml(user.name)}</span>
        <div class="lb-full-stats">
          <span class="lb-badge" style="background:color-mix(in srgb,${user.badgeColor} 15%,transparent);color:${user.badgeColor};border:1px solid color-mix(in srgb,${user.badgeColor} 30%,transparent)">${escHtml(user.badge)}</span>
        </div>
        <div class="xp-bar-wrap" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" style="margin-top:8px">
          <div class="xp-bar" style="--xp:${pct}%"></div>
        </div>
      </div>
      <div class="lb-full-xp">${user.xp.toLocaleString()} XP</div>
    `;
    list.appendChild(div);
  });

  // Animate XP bars after render
  setTimeout(() => {
    list.querySelectorAll('.xp-bar').forEach(b => b.classList.add('animated'));
  }, 200);
}

/* ─────────────────────────────
   ACHIEVEMENTS RENDER
───────────────────────────── */
function renderAchievements() {
  const grid = document.getElementById('achievements-grid');
  if (!grid) return;
  grid.innerHTML = '';

  ACHIEVEMENTS.forEach((ach, i) => {
    const card = document.createElement('div');
    card.className = `achievement-card${ach.unlocked ? '' : ' locked'}`;
    card.style.setProperty('--i', i);
    card.style.setProperty('--acolor', ach.color);
    card.innerHTML = `
      <span class="achievement-icon" aria-hidden="true">${ach.icon}</span>
      <h3 class="achievement-name">${escHtml(ach.name)}</h3>
      <p class="achievement-desc">${escHtml(ach.desc)}</p>
      <div class="achievement-xp">${ach.xp}</div>
      <div class="achievement-progress" aria-label="Progress: ${ach.progress}%">
        <div class="achievement-progress-bar">
          <div class="achievement-progress-fill" style="--prog:${ach.progress}%"></div>
        </div>
        <div class="achievement-unlock">${ach.progress}% complete</div>
      </div>
      <span class="unlock-badge ${ach.unlocked ? 'unlocked-badge' : 'locked-badge'}">
        ${ach.unlocked ? '✅ Unlocked' : '🔒 Locked'}
      </span>
    `;
    grid.appendChild(card);
  });

  // Animate progress bars
  setTimeout(() => {
    grid.querySelectorAll('.achievement-progress-fill').forEach(b => b.classList.add('animated'));
  }, 300);
}

/* ─────────────────────────────
   STAT COUNTER ANIMATION
───────────────────────────── */
async function animateStats() {
  // Update targets based on DB
  const totalIdeas = state.localIdeas.length;
  const implemented = state.localIdeas.filter(i => (i.status || '').toLowerCase() === 'implemented').length;
  const contributors = new Set(
    state.localIdeas
      .map(i => i.author_name)
      .filter(n => n && n.toLowerCase() !== 'anonymous')
  ).size;
  
  const counters = document.querySelectorAll('#page-home .counter');
  if(counters[0]) counters[0].dataset.target = totalIdeas;
  if(counters[1]) counters[1].dataset.target = implemented;
  if(counters[2]) counters[2].dataset.target = contributors;

  counters.forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased   = 1 - Math.pow(1 - elapsed, 3); // ease-out-cubic
      el.textContent = Math.floor(eased * target).toLocaleString();
      if (elapsed < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  // Animate stat bars
  setTimeout(() => {
    document.querySelectorAll('#page-home .stat-fill').forEach(el => el.classList.add('animated'));
  }, 200);
}

function animateXPBars() {
  setTimeout(() => {
    document.querySelectorAll('#page-home .xp-bar').forEach(b => b.classList.add('animated'));
  }, 400);
}

/* ─────────────────────────────
   FORM LOGIC
───────────────────────────── */
function initForm() {
  const form       = document.getElementById('idea-form');
  const formCard   = document.getElementById('submit-form-card');
  const successCard = document.getElementById('success-card');
  const submitBtn  = document.getElementById('submit-btn');
  const submitAnother = document.getElementById('submit-another');

  const titleInput = document.getElementById('idea-title');
  const descInput  = document.getElementById('idea-desc');
  const titleCount = document.getElementById('title-count');
  const descCount  = document.getElementById('desc-count');

  titleInput?.addEventListener('input', () => {
    titleCount.textContent = `${titleInput.value.length} / 100`;
    titleCount.style.color = titleInput.value.length > 90 ? 'var(--accent)' : 'var(--text-muted)';
  });
  descInput?.addEventListener('input', () => {
    descCount.textContent = `${descInput.value.length} / 500`;
    descCount.style.color = descInput.value.length > 460 ? 'var(--accent)' : 'var(--text-muted)';
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    const desc = descInput.value.trim();
    const category = document.getElementById('idea-category').value;
    
    if (!title || !desc || !category) {
      showToast('⚠️ Please fill all required fields', 'error');
      return;
    }

    // Simulate async submit
    const btnText   = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    submitBtn.disabled = true;


    // Insert to Supabase
    const { data, error } = await supabaseClient.from('ideas').insert([{
      title: title,
      description: desc,
      category: category,
      author_name: document.getElementById('idea-name').value.trim() || 'Anonymous'
    }]).select();

    if (error) {
       console.error(error);
       showToast('❌ Error submitting idea', 'error');
       btnText.classList.remove('hidden');
       btnLoader.classList.add('hidden');
       submitBtn.disabled = false;
       return;
    }

    if (data && data.length > 0) {
       state.localIdeas.unshift(data[0]);
    }

    // Show success
    formCard.classList.add('hidden');
    successCard.classList.remove('hidden');
    launchConfetti();
    form.reset();
    titleCount.textContent = '0 / 100';
    descCount.textContent  = '0 / 500';

    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
    submitBtn.disabled = false;
  });

  submitAnother?.addEventListener('click', () => {
    successCard.classList.add('hidden');
    formCard.classList.remove('hidden');
  });
}

/* ─────────────────────────────
   FEED FILTER + SORT
───────────────────────────── */
function initFeedControls() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeFilter = btn.dataset.filter;
      renderFeed(state.activeFilter);
    });
  });

  document.getElementById('feed-sort')?.addEventListener('change', () => renderFeed(state.activeFilter));
  
  document.getElementById('track-id-input')?.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    if (val) {
      // search by ID substring
      const filtered = state.localIdeas.filter(i => String(i.id).toLowerCase().includes(val));
      renderFeedArray(filtered);
    } else {
      renderFeed(state.activeFilter);
    }
  });
}

function renderFeedArray(filtered) {
  const grid = document.getElementById('feed-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--text-muted)">
      <div style="font-size:3rem;margin-bottom:12px">🔍</div>
      <p>No ideas found.</p>
    </div>`;
    return;
  }
  filtered.forEach((idea, i) => grid.appendChild(buildIdeaCard(idea, i)));
}


/* ─────────────────────────────
   NAV LINKS — intercept all clicks
───────────────────────────── */
function initNavigation() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-page]');
    if (!link) return;
    e.preventDefault();
    const page = link.dataset.page;
    history.pushState(null, '', `#${page}`);
    navigate(page);
    // Close mobile menu if open
    const navLinks = document.getElementById('nav-links');
    const toggle   = document.getElementById('nav-toggle');
    navLinks?.classList.remove('open');
    toggle?.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
  });

  window.addEventListener('popstate', () => navigate(getPage()));

  // Mobile hamburger
  document.getElementById('nav-toggle')?.addEventListener('click', function () {
    const open = this.classList.toggle('open');
    this.setAttribute('aria-expanded', open);
    document.getElementById('nav-links')?.classList.toggle('open', open);
  });

  // Navbar scroll shadow
  window.addEventListener('scroll', () => {
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });
}

/* ─────────────────────────────
   PARTICLE BACKGROUND
───────────────────────────── */
function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  let W, H, particles;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function mkParticle() {
    return {
      x:  Math.random() * W,
      y:  Math.random() * H,
      r:  Math.random() * 1.5 + .4,
      vx: (Math.random() - .5) * .25,
      vy: (Math.random() - .5) * .25,
      alpha: Math.random() * .6 + .1,
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: 100 }, mkParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168,85,247,${p.alpha})`;
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0)  p.x = W;
      if (p.x > W)  p.x = 0;
      if (p.y < 0)  p.y = H;
      if (p.y > H)  p.y = 0;
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); }, { passive: true });
  init();
  draw();
}

/* ─────────────────────────────
   CONFETTI
───────────────────────────── */
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.classList.add('active');

  const colors  = ['#7c3aed','#a855f7','#f97316','#f59e0b','#10b981','#3b82f6','#ec4899'];
  const pieces  = Array.from({ length: 120 }, () => ({
    x:   Math.random() * canvas.width,
    y:   Math.random() * canvas.height - canvas.height,
    w:   Math.random() * 8 + 4,
    h:   Math.random() * 4 + 2,
    rot: Math.random() * 360,
    rotV: (Math.random() - .5) * 6,
    vy:  Math.random() * 3 + 2,
    vx:  (Math.random() - .5) * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    alpha: 1,
  }));

  let frame = 0;
  function step() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      if (p.y > canvas.height + 20) return;
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      p.y   += p.vy;
      p.x   += p.vx;
      p.rot += p.rotV;
      p.alpha = Math.max(0, p.alpha - 0.007);
    });
    frame++;
    if (frame < 200) requestAnimationFrame(step);
    else canvas.classList.remove('active');
  }
  requestAnimationFrame(step);
}

/* ─────────────────────────────
   TOAST
───────────────────────────── */
let toastTimer;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = 'toast', 2800);
}

/* ─────────────────────────────
   INTERSECTION OBSERVER (cards)
───────────────────────────── */
function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('.xp-bar').forEach(b => b.classList.add('animated'));
        e.target.querySelectorAll('.stat-fill').forEach(b => b.classList.add('animated'));
        e.target.querySelectorAll('.achievement-progress-fill').forEach(b => b.classList.add('animated'));
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.section, .leaderboard-full, .achievements-grid').forEach(el => obs.observe(el));
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
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ─────────────────────────────
   INIT
───────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initNavigation();
  initForm();
  initFeedControls();
  initScrollReveal();

  // Bootstrap correct page from hash
  const startPage = getPage();
  state.currentPage = 'home'; // force navigate
  document.getElementById('page-home')?.classList.remove('hidden');
  // hide all non-home pages
  ['submit','feed','leaderboard','achievements','halloffame','timeline','about','contact','faq','404'].forEach(p => {
    document.getElementById(`page-${p}`)?.classList.add('hidden');
  });
  if (startPage !== 'home') {
    navigate(startPage);
  } else {
    updateNavLinks('home');
    onPageEnter('home');
  }
});


function renderAnnouncements() {
  const banner = document.getElementById('announcements-banner');
  const list = document.getElementById('announcements-list');
  if(!banner || !list) return;
  
  if(state.announcements.length === 0) {
    banner.style.display = 'none';
    return;
  }
  
  banner.style.display = 'block';
  list.innerHTML = state.announcements.map(a => `
    <div style="padding: 1rem; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius);">
      <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">${new Date(a.created_at).toLocaleDateString()}</div>
      <h3 style="font-weight: 600; margin-bottom: 8px;">${escHtml(a.title)}</h3>
      <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.4;">${escHtml(a.content)}</p>
    </div>
  `).join('');
}

/* ─────────────────────────────
   PHASE 4: IDEA OF THE WEEK
───────────────────────────── */
function renderIdeaOfWeek() {
  const featured = state.localIdeas.find(i => i.featured);
  const section = document.getElementById('home-highlights-section');
  if (!section) return;

  if (!featured) {
    // hide only the iotw part; challenge still shows
    document.getElementById('idea-of-week-wrap')?.style.setProperty('display', 'none');
  } else {
    document.getElementById('idea-of-week-wrap')?.style.removeProperty('display');
    const CATEGORY_MAP = {
      academic: '🎓 Academic', laboratory: '🧪 Labs', events: '🎉 Events',
      projects: '🚀 Projects', infrastructure: '🏗️ Infrastructure', other: '✨ Other'
    };
    document.getElementById('iotw-title').textContent = featured.title;
    document.getElementById('iotw-desc').textContent = featured.description || '';
    document.getElementById('iotw-cat').textContent = CATEGORY_MAP[featured.category] || featured.category;
    document.getElementById('iotw-author').textContent = `By ${escHtml(featured.author_name || 'Anonymous')}`;
  }
  section.style.display = '';
}

/* ─────────────────────────────
   PHASE 4: MONTHLY CHALLENGE
───────────────────────────── */
function renderMonthlyChallenge() {
  const prompt = state.settings['monthly_challenge'] || 'How can we improve our department?';
  const el = document.getElementById('challenge-prompt');
  if (el) el.textContent = `"${prompt}"`;

  const section = document.getElementById('home-highlights-section');
  if (section) section.style.display = '';
}

/* ─────────────────────────────
   PHASE 4: TRENDING IDEAS
───────────────────────────── */
function renderTrending() {
  const list = document.getElementById('trending-list');
  const section = document.getElementById('trending-section');
  if (!list || !section) return;
  list.innerHTML = '';

  const top5 = [...state.localIdeas].sort((a, b) => b.votes - a.votes).slice(0, 5);
  if (top5.length === 0) { section.style.display = 'none'; return; }
  section.style.display = '';

  const rankClasses = ['gold', 'silver', 'bronze', '', ''];
  const rankLabels  = ['🥇', '🥈', '🥉', '#4', '#5'];
  const CATEGORY_MAP = {
    academic: '🎓', laboratory: '🧪', events: '🎉',
    projects: '🚀', infrastructure: '🏗️', other: '✨'
  };

  top5.forEach((idea, idx) => {
    const item = document.createElement('div');
    item.className = 'trending-item';
    item.innerHTML = `
      <div class="trending-rank ${rankClasses[idx]}">${rankLabels[idx]}</div>
      <div class="trending-info">
        <div class="trending-title">${escHtml(idea.title)}</div>
        <div class="trending-sub">${CATEGORY_MAP[idea.category] || ''} ${escHtml(idea.category)} · ${escHtml(idea.status || 'Submitted')}</div>
      </div>
      <div class="trending-votes">🔥 ${idea.votes}</div>
    `;
    list.appendChild(item);
  });
}

/* ─────────────────────────────
   PHASE 4: HALL OF FAME
───────────────────────────── */
function renderHallOfFame() {
  const hofGrid = document.getElementById('hof-grid');
  const hofList = document.getElementById('hof-trending-list');
  if (!hofGrid || !hofList) return;

  const ideas = state.localIdeas;
  hofGrid.innerHTML = '';
  hofList.innerHTML = '';

  // Most Voted
  const mostVoted = [...ideas].sort((a, b) => b.votes - a.votes)[0];
  // Latest Implemented
  const implemented = ideas.filter(i => (i.status || '').toLowerCase() === 'implemented');
  const latestImpl = implemented.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  // Most Active Category
  const catCount = {};
  ideas.forEach(i => catCount[i.category] = (catCount[i.category] || 0) + 1);
  const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];
  // Featured / Idea of Month
  const featured = ideas.find(i => i.featured);

  const CATEGORY_LABEL = {
    academic: '🎓 Academic', laboratory: '🧪 Laboratory', events: '🎉 Events',
    projects: '🚀 Projects', infrastructure: '🏗️ Infrastructure', other: '✨ Other'
  };

  const cards = [
    {
      cls: 'gold', icon: '🏆', label: 'Most Voted Idea',
      value: mostVoted ? escHtml(mostVoted.title) : 'No ideas yet',
      sub: mostVoted ? `${mostVoted.votes} votes · ${CATEGORY_LABEL[mostVoted.category] || mostVoted.category}` : ''
    },
    {
      cls: 'green', icon: '✅', label: 'Latest Implemented',
      value: latestImpl ? escHtml(latestImpl.title) : 'None yet',
      sub: latestImpl ? `Implemented · By ${escHtml(latestImpl.author_name || 'Anonymous')}` : 'Keep submitting great ideas!'
    },
    {
      cls: 'purple', icon: '⭐', label: 'Idea of the Week',
      value: featured ? escHtml(featured.title) : 'Not selected yet',
      sub: featured ? `By ${escHtml(featured.author_name || 'Anonymous')}` : 'Admin picks weekly'
    },
    {
      cls: 'blue', icon: '📊', label: 'Most Active Category',
      value: topCat ? (CATEGORY_LABEL[topCat[0]] || topCat[0]) : 'N/A',
      sub: topCat ? `${topCat[1]} ideas submitted` : ''
    }
  ];

  cards.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = `hof-card ${c.cls}`;
    div.style.setProperty('--i', i);
    div.innerHTML = `
      <div class="hof-icon">${c.icon}</div>
      <div class="hof-label">${c.label}</div>
      <div class="hof-value">${c.value}</div>
      <div class="hof-sub">${c.sub}</div>
    `;
    hofGrid.appendChild(div);
  });

  // Top 10 all-time
  const rankClasses = ['gold','silver','bronze','','','','','','',''];
  const rankLabels  = ['🥇','🥈','🥉','#4','#5','#6','#7','#8','#9','#10'];
  const top10 = [...ideas].sort((a, b) => b.votes - a.votes).slice(0, 10);
  top10.forEach((idea, idx) => {
    const item = document.createElement('div');
    item.className = 'trending-item';
    item.innerHTML = `
      <div class="trending-rank ${rankClasses[idx]}">${rankLabels[idx]}</div>
      <div class="trending-info">
        <div class="trending-title">${escHtml(idea.title)}</div>
        <div class="trending-sub">${CATEGORY_LABEL[idea.category] || idea.category} · By ${escHtml(idea.author_name || 'Anonymous')}</div>
      </div>
      <div class="trending-votes">🔥 ${idea.votes}</div>
    `;
    hofList.appendChild(item);
  });
}

/* ─────────────────────────────
   PHASE 4: IMPLEMENTED TIMELINE
───────────────────────────── */
function renderTimeline() {
  const container = document.getElementById('timeline-list');
  if (!container) return;
  container.innerHTML = '';

  const implemented = state.localIdeas
    .filter(i => (i.status || '').toLowerCase() === 'implemented')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (implemented.length === 0) {
    container.innerHTML = `
      <div class="timeline-empty">
        <div class="empty-icon">🚀</div>
        <p style="font-size:1.1rem;font-weight:600;margin-bottom:.5rem">No implemented ideas yet</p>
        <p style="font-size:.9rem">Be the first to have your idea implemented!</p>
        <a href="#submit" class="btn btn-primary" data-page="submit" style="margin-top:1.5rem;display:inline-flex">Submit Your Idea 💡</a>
      </div>
    `;
    return;
  }

  const CATEGORY_LABEL = {
    academic: '🎓 Academic', laboratory: '🧪 Laboratory', events: '🎉 Events',
    projects: '🚀 Projects', infrastructure: '🏗️ Infrastructure', other: '✨ Other'
  };

  implemented.forEach((idea, i) => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.style.animationDelay = `${i * 80}ms`;
    item.innerHTML = `
      <div class="timeline-dot implemented"></div>
      <div class="timeline-card">
        <div class="timeline-date">
          ${new Date(idea.created_at).toLocaleDateString('en-IN', { year:'numeric', month:'long', day:'numeric' })}
          · ${CATEGORY_LABEL[idea.category] || idea.category}
          · By ${escHtml(idea.author_name || 'Anonymous')}
        </div>
        <div class="timeline-title">✅ ${escHtml(idea.title)}</div>
        <p style="font-size:.9rem;color:var(--text-secondary);line-height:1.5;margin:.5rem 0 0">${escHtml(idea.description || '')}</p>
        ${idea.department_response ? `
        <div class="timeline-response">
          <div class="timeline-response-label">🏛️ Department Action</div>
          ${escHtml(idea.department_response)}
        </div>` : ''}
      </div>
    `;
    container.appendChild(item);
  });

  // Re-wire any submit data-page links inside timeline
  container.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
  });
}

