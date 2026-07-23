import re

with open('app.js', 'r') as f:
    content = f.read()

# 1. Add Supabase init and remove IDEAS
content = re.sub(
    r"const IDEAS = \[.*?\];",
    """const supabaseUrl = 'https://scioaxiojiituzovaxrg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaW9heGlvamlpdHV6b3ZheHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MjY2OTUsImV4cCI6MjEwMDMwMjY5NX0._rl07aJgRwxlGfMP27Q_z-zoNJwhRuqf425p5EwPy74';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// IDEAS fetched from DB
async function fetchIdeas() {
  const { data, error } = await supabase.from('ideas').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching ideas:', error);
    return;
  }
  state.localIdeas = data;
}""",
    content,
    flags=re.DOTALL
)

# 2. Update state.localIdeas
content = content.replace("localIdeas:   [...IDEAS],", "localIdeas:   [],")

# 3. Modify onPageEnter to be async and fetch ideas
content = content.replace(
    "function onPageEnter(page) {",
    "async function onPageEnter(page) {\n  await fetchIdeas();"
)

# 4. Modify handleVote
vote_target = """function handleVote(e) {
  const btn  = e.currentTarget;
  const id   = parseInt(btn.dataset.id, 10);
  const idea = state.localIdeas.find(i => i.id === id);
  if (!idea) return;

  const wasVoted = state.votedIds.has(id);
  if (wasVoted) {
    state.votedIds.delete(id);
    idea.votes--;
    btn.classList.remove('voted');
    btn.querySelector('.vote-icon').textContent = '👍';
  } else {
    state.votedIds.add(id);
    idea.votes++;
    btn.classList.add('voted');
    btn.querySelector('.vote-icon').textContent = '🔥';
    showToast('🔥 Vote added! +5 XP earned');
    btn.querySelector('.vote-icon').style.animation = 'none';
    requestAnimationFrame(() => { btn.querySelector('.vote-icon').style.animation = ''; });
  }
  btn.querySelector('.vote-count').textContent = idea.votes;
  btn.setAttribute('aria-label', wasVoted ? `Upvote ${idea.title}` : `Remove vote for ${idea.title}`);
}"""

vote_replacement = """async function handleVote(e) {
  const btn  = e.currentTarget;
  const id   = btn.dataset.id;
  const idea = state.localIdeas.find(i => i.id === id);
  if (!idea) return;

  const wasVoted = state.votedIds.has(id);
  if (wasVoted) {
    state.votedIds.delete(id);
    idea.votes--;
    btn.classList.remove('voted');
    btn.querySelector('.vote-icon').textContent = '👍';
    await supabase.from('ideas').update({ votes: idea.votes }).eq('id', id);
  } else {
    state.votedIds.add(id);
    idea.votes++;
    btn.classList.add('voted');
    btn.querySelector('.vote-icon').textContent = '🔥';
    showToast('🔥 Vote added! +5 XP earned');
    btn.querySelector('.vote-icon').style.animation = 'none';
    requestAnimationFrame(() => { btn.querySelector('.vote-icon').style.animation = ''; });
    await supabase.from('ideas').update({ votes: idea.votes }).eq('id', id);
  }
  btn.querySelector('.vote-count').textContent = idea.votes;
  btn.setAttribute('aria-label', wasVoted ? `Upvote ${idea.title}` : `Remove vote for ${idea.title}`);
}"""
content = content.replace(vote_target, vote_replacement)

# 5. Modify Form Submission
form_target = """    // Add to local ideas
    const newIdea = {
      id:       Date.now(),
      title:    titleInput.value.trim(),
      desc:     document.getElementById('idea-desc').value.trim(),
      category: document.getElementById('idea-category').value,
      votes:    0,
      status:   'submitted',
      author:   document.getElementById('idea-name').value.trim() || 'Anonymous',
      date:     new Date().toISOString().split('T')[0],
    };
    state.localIdeas.unshift(newIdea);

    // Show success"""

form_replacement = """    // Insert to Supabase
    const { data, error } = await supabase.from('ideas').insert([{
      title: titleInput.value.trim(),
      description: document.getElementById('idea-desc').value.trim(),
      category: document.getElementById('idea-category').value,
      author_name: document.getElementById('idea-name').value.trim() || 'Anonymous'
    }]).select();

    if (error) {
       showToast('❌ Error submitting idea');
       btnText.classList.remove('hidden');
       btnLoader.classList.add('hidden');
       submitBtn.disabled = false;
       return;
    }

    if (data && data.length > 0) {
       state.localIdeas.unshift(data[0]);
    }

    // Show success"""
content = content.replace(form_target, form_replacement)

# Remove the simulated async submit await sleep
content = content.replace("    await sleep(1400);\n", "")

# 6. Add ID Tracking
feed_controls_target = """  document.getElementById('feed-sort')?.addEventListener('change', () => renderFeed(state.activeFilter));
}"""
feed_controls_replacement = """  document.getElementById('feed-sort')?.addEventListener('change', () => renderFeed(state.activeFilter));
  
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
"""
content = content.replace(feed_controls_target, feed_controls_replacement)

# 7. Add short ID and description mapping in card builder
card_target = """    <div class="card-top">
      <h3 class="card-title">${escHtml(idea.title)}</h3>"""
card_replacement = """    <div class="card-top">
      <div style="display:flex; flex-direction:column; gap:4px">
        <h3 class="card-title">${escHtml(idea.title)}</h3>
        <span style="font-size:0.75rem; color:var(--text-muted); font-family: monospace;">ID: ${idea.id.split('-')[0]}</span>
      </div>"""
content = content.replace(card_target, card_replacement)

desc_target = """    <p class="card-desc">${escHtml(idea.desc)}</p>"""
desc_replacement = """    <p class="card-desc">${escHtml(idea.description || idea.desc)}</p>"""
content = content.replace(desc_target, desc_replacement)

# 8. Stats Animation Update
animate_stats_target = """function animateStats() {
  const counters = document.querySelectorAll('#page-home .counter');
  counters.forEach(el => {
    const target = parseInt(el.dataset.target, 10);"""

animate_stats_replacement = """async function animateStats() {
  // Update targets based on DB
  const totalIdeas = state.localIdeas.length;
  const implemented = state.localIdeas.filter(i => i.status === 'implemented').length;
  const contributors = new Set(state.localIdeas.map(i => i.author_name)).size;
  
  const counters = document.querySelectorAll('#page-home .counter');
  if(counters[0]) counters[0].dataset.target = totalIdeas;
  if(counters[1]) counters[1].dataset.target = implemented;
  if(counters[2]) counters[2].dataset.target = contributors;

  counters.forEach(el => {
    const target = parseInt(el.dataset.target, 10);"""
content = content.replace(animate_stats_target, animate_stats_replacement)

with open('app.js', 'w') as f:
    f.write(content)

