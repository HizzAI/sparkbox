import re

with open('app.js', 'r') as f:
    content = f.read()

# 1. Update fetchIdeas and state
state_target = """const state = {
  currentPage:  'home',
  activeFilter: 'all',
  votedIds:     new Set(),
  localIdeas:   [],
};"""
state_replace = """const state = {
  currentPage:  'home',
  activeFilter: 'all',
  votedIds:     new Set(),
  localIdeas:   [],
  announcements: []
};"""
content = content.replace(state_target, state_replace)

fetch_target = """async function fetchIdeas() {
  const { data, error } = await supabase.from('ideas').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching ideas:', error);
    return;
  }
  state.localIdeas = data;
}"""
fetch_replace = """async function fetchIdeas() {
  const [ideasRes, annRes] = await Promise.all([
    supabase.from('ideas').select('*').order('featured', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('announcements').select('*').order('created_at', { ascending: false })
  ]);
  
  if (!ideasRes.error) state.localIdeas = ideasRes.data;
  if (!annRes.error) state.announcements = annRes.data;
}"""
content = content.replace(fetch_target, fetch_replace)

# 2. Update onPageEnter to render announcements
page_enter_target = "if (page === 'home')         { renderHomeIdeas(); animateStats(); animateXPBars(); }"
page_enter_replace = "if (page === 'home')         { renderHomeIdeas(); animateStats(); animateXPBars(); renderAnnouncements(); }"
content = content.replace(page_enter_target, page_enter_replace)

# 3. Add renderAnnouncements function
render_ann = """

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
"""
content += render_ann

# 4. Modify buildIdeaCard to show Featured and Department Response
card_top_target = """    <div class="card-top">
      <div style="display:flex; flex-direction:column; gap:4px">
        <h3 class="card-title">${escHtml(idea.title)}</h3>
        <span style="font-size:0.75rem; color:var(--text-muted); font-family: monospace;">ID: ${idea.id.split('-')[0]}</span>
      </div>"""
card_top_replace = """    <div class="card-top">
      <div style="display:flex; flex-direction:column; gap:4px">
        <h3 class="card-title">${idea.featured ? '⭐ ' : ''}${escHtml(idea.title)}</h3>
        <span style="font-size:0.75rem; color:var(--text-muted); font-family: monospace;">ID: ${idea.id.split('-')[0]}</span>
      </div>"""
content = content.replace(card_top_target, card_top_replace)

card_bottom_target = """      <div class="card-meta">
        <span class="meta-item"><span aria-hidden="true">👤</span> ${escHtml(idea.author_name || 'Anonymous')}</span>
        <span class="meta-item"><span aria-hidden="true">📅</span> ${new Date(idea.created_at).toLocaleDateString()}</span>
      </div>
    </div>"""
card_bottom_replace = """      <div class="card-meta">
        <span class="meta-item"><span aria-hidden="true">👤</span> ${escHtml(idea.author_name || 'Anonymous')}</span>
        <span class="meta-item"><span aria-hidden="true">📅</span> ${new Date(idea.created_at).toLocaleDateString()}</span>
      </div>
    </div>
    ${idea.department_response ? `
    <div style="margin-top: 15px; padding: 12px; background: rgba(59,130,246,0.1); border-left: 3px solid var(--accent); border-radius: 4px;">
      <div style="font-size: 0.75rem; font-weight: 700; color: var(--accent); margin-bottom: 4px; text-transform: uppercase;">Department Response</div>
      <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.4;">${escHtml(idea.department_response)}</p>
    </div>
    ` : ''}"""
content = content.replace(card_bottom_target, card_bottom_replace)

with open('app.js', 'w') as f:
    f.write(content)

