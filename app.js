// ===== DATA STORE (localStorage) =====
const ADMIN = { cnic: 'admin', password: 'admin123' };

function getData(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; }
}
function setData(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function getVoters()     { return getData('voters', []); }
function getCandidates() { return getData('candidates', defaultCandidates()); }
function getVotes()      { return getData('votes', {}); }
function isElectionOn()  { return getData('electionOn', false); }

function defaultCandidates() {
  return [
    { id: 1, name: 'Ahmed Ali',    party: 'Pakistan Tehreek-e-Insaf', constituency: 'NA-1 Karachi East', avatar: '👨‍💼' },
    { id: 2, name: 'Fatima Khan',  party: 'Pakistan Muslim League-N',  constituency: 'NA-1 Karachi East', avatar: '👩‍💼' },
    { id: 3, name: 'Bilal Raza',   party: 'Pakistan Peoples Party',    constituency: 'NA-2 Karachi West', avatar: '🧑‍💼' },
    { id: 4, name: 'Sara Mirza',   party: 'Muttahida Qaumi Movement',  constituency: 'NA-2 Karachi West', avatar: '👩‍⚖️' },
    { id: 5, name: 'Usman Ghani',  party: 'Pakistan Tehreek-e-Insaf',  constituency: 'NA-5 Islamabad',    avatar: '👨‍⚖️' },
  ];
}

// ===== PAGE NAVIGATION =====
let currentUser = null;

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'vote')    renderCandidates();
  if (id === 'results') renderResults();
  if (id === 'admin')   renderAdmin();
}

// ===== AUTH =====
function registerVoter() {
  const name  = document.getElementById('regName').value.trim();
  const cnic  = document.getElementById('regCnic').value.trim();
  const pass  = document.getElementById('regPass').value.trim();
  const const_ = document.getElementById('regConstituency').value;
  const msg   = document.getElementById('regMsg');

  if (!name || !cnic || !pass || !const_) return showMsg(msg, 'error', 'Please fill all fields.');
  if (!/^\d{5}-\d{7}-\d$/.test(cnic)) return showMsg(msg, 'error', 'Invalid CNIC format. Use: 42101-1234567-1');

  const voters = getVoters();
  if (voters.find(v => v.cnic === cnic)) return showMsg(msg, 'error', 'This CNIC is already registered.');

  voters.push({ name, cnic, password: pass, constituency: const_, hasVoted: false });
  setData('voters', voters);
  showMsg(msg, 'success', 'Registered successfully! You can now login.');
  setTimeout(() => showPage('login'), 1500);
}

function loginUser() {
  const cnic = document.getElementById('loginCnic').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  const msg  = document.getElementById('loginMsg');

  if (!cnic || !pass) return showMsg(msg, 'error', 'Please enter CNIC and password.');

  // Admin login
  if (cnic === ADMIN.cnic && pass === ADMIN.password) {
    currentUser = { isAdmin: true };
    document.getElementById('adminLink').style.display = 'inline';
    document.getElementById('logoutBtn').style.display = 'inline';
    showPage('admin');
    return;
  }

  // Voter login
  const voter = getVoters().find(v => v.cnic === cnic && v.password === pass);
  if (!voter) return showMsg(msg, 'error', 'Invalid CNIC or password.');

  currentUser = voter;
  document.getElementById('logoutBtn').style.display = 'inline';
  document.getElementById('voterGreet').textContent =
    `Welcome, ${voter.name}! You are voting in constituency: ${voter.constituency}`;

  if (voter.hasVoted) {
    showPage('results');
    document.getElementById('backToVote').style.display = 'none';
  } else if (!isElectionOn()) {
    showMsg(msg, 'info', 'Election has not started yet. Please wait.');
  } else {
    showPage('vote');
  }
}

function logout() {
  currentUser = null;
  document.getElementById('adminLink').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'none';
  showPage('home');
}

// ===== VOTING =====
let selectedCandidate = null;

function renderCandidates() {
  selectedCandidate = null;
  const list = document.getElementById('candidateList');
  const voteMsg = document.getElementById('voteMsg');
  voteMsg.className = 'msg';
  list.innerHTML = '';

  if (!currentUser) { showPage('login'); return; }
  if (currentUser.hasVoted) { showPage('results'); return; }

  const candidates = getCandidates().filter(c =>
    !currentUser.constituency || c.constituency === currentUser.constituency
  );

  if (!candidates.length) {
    list.innerHTML = '<p style="color:#888">No candidates available for your constituency yet.</p>';
    return;
  }

  candidates.forEach(c => {
    const card = document.createElement('div');
    card.className = 'candidate-card';
    card.innerHTML = `
      <div class="avatar">${c.avatar || '🧑'}</div>
      <h4>${c.name}</h4>
      <div class="party">${c.party}</div>
      <div class="constituency">${c.constituency}</div>
    `;
    card.onclick = () => {
      document.querySelectorAll('.candidate-card').forEach(x => x.classList.remove('selected'));
      card.classList.add('selected');
      selectedCandidate = c;
    };
    list.appendChild(card);
  });
}

function castVote() {
  const msg = document.getElementById('voteMsg');
  if (!selectedCandidate) return showMsg(msg, 'error', 'Please select a candidate first.');
  if (!isElectionOn()) return showMsg(msg, 'error', 'Election is not active right now.');
  if (currentUser.hasVoted) return showMsg(msg, 'error', 'You have already voted.');

  // Record vote
  const votes = getVotes();
  votes[selectedCandidate.id] = (votes[selectedCandidate.id] || 0) + 1;
  setData('votes', votes);

  // Mark voter
  const voters = getVoters();
  const idx = voters.findIndex(v => v.cnic === currentUser.cnic);
  if (idx !== -1) { voters[idx].hasVoted = true; setData('voters', voters); currentUser.hasVoted = true; }

  showMsg(msg, 'success', `✅ Vote cast for ${selectedCandidate.name}! Thank you for voting.`);
  setTimeout(() => { showPage('results'); document.getElementById('backToVote').style.display = 'none'; }, 1800);
}

// ===== RESULTS =====
function renderResults() {
  const container = document.getElementById('resultsChart');
  container.innerHTML = '';
  const candidates = getCandidates();
  const votes = getVotes();

  if (!candidates.length) {
    container.innerHTML = '<p style="text-align:center;color:#888">No candidates added yet.</p>';
    return;
  }

  const totals = candidates.map(c => ({ ...c, votes: votes[c.id] || 0 }));
  totals.sort((a, b) => b.votes - a.votes);
  const maxVotes = totals[0].votes || 1;

  totals.forEach((c, i) => {
    const pct = ((c.votes / maxVotes) * 100).toFixed(1);
    const winner = i === 0 && c.votes > 0;
    container.innerHTML += `
      <div class="result-bar-wrap">
        <div class="cname">
          <span>${c.avatar || '🧑'} ${c.name} – <em style="font-weight:400;color:#888">${c.party}</em>
            ${winner ? '<span class="winner-badge">🏆 Leading</span>' : ''}
          </span>
          <span class="votes">${c.votes} vote${c.votes !== 1 ? 's' : ''}</span>
        </div>
        <div class="bar-bg">
          <div class="bar-fill" style="width:${pct}%"></div>
        </div>
        <div style="font-size:0.78rem;color:#aaa;margin-top:4px">${c.constituency}</div>
      </div>
    `;
  });
}

// ===== ADMIN =====
function addCandidate() {
  const name  = document.getElementById('candName').value.trim();
  const party = document.getElementById('candParty').value.trim();
  const const_ = document.getElementById('candConst').value;
  const msg   = document.getElementById('candMsg');

  if (!name || !party || !const_) return showMsg(msg, 'error', 'Please fill all candidate fields.');

  const candidates = getCandidates();
  const avatars = ['👨‍💼','👩‍💼','🧑‍💼','👨‍⚖️','👩‍⚖️','🧑‍🦱','👩‍🦳','👨‍🦲'];
  candidates.push({
    id: Date.now(),
    name, party, constituency: const_,
    avatar: avatars[Math.floor(Math.random() * avatars.length)]
  });
  setData('candidates', candidates);
  showMsg(msg, 'success', `Candidate "${name}" added successfully.`);
  document.getElementById('candName').value = '';
  document.getElementById('candParty').value = '';
  renderAdmin();
}

function toggleElection() {
  const on = isElectionOn();
  setData('electionOn', !on);
  const btn = document.getElementById('toggleElection');
  btn.textContent = !on ? 'Stop Election' : 'Start Election';
  btn.className = !on ? 'stop' : '';
}

function resetVotes() {
  if (!confirm('Are you sure you want to reset ALL votes? This cannot be undone.')) return;
  setData('votes', {});
  const voters = getVoters().map(v => ({ ...v, hasVoted: false }));
  setData('voters', voters);
  alert('All votes have been reset.');
  renderAdmin();
}

function renderAdmin() {
  // Toggle button state
  const btn = document.getElementById('toggleElection');
  if (isElectionOn()) { btn.textContent = 'Stop Election'; btn.classList.add('stop'); }
  else { btn.textContent = 'Start Election'; btn.classList.remove('stop'); }

  // Voter table
  const voters = getVoters();
  const vt = document.getElementById('voterTable');
  if (!voters.length) { vt.innerHTML = '<p style="color:#aaa">No voters registered yet.</p>'; }
  else {
    vt.innerHTML = `<table>
      <tr><th>#</th><th>Name</th><th>CNIC</th><th>Constituency</th><th>Voted</th></tr>
      ${voters.map((v, i) => `<tr>
        <td>${i+1}</td><td>${v.name}</td><td>${v.cnic}</td>
        <td>${v.constituency}</td>
        <td style="color:${v.hasVoted?'#2e7d32':'#c62828'}">${v.hasVoted ? '✅ Yes' : '❌ No'}</td>
      </tr>`).join('')}
    </table>`;
  }

  // Candidate table
  const candidates = getCandidates();
  const votes = getVotes();
  const ct = document.getElementById('candidateTable');
  ct.innerHTML = `<table>
    <tr><th>#</th><th>Name</th><th>Party</th><th>Constituency</th><th>Votes</th><th>Action</th></tr>
    ${candidates.map((c, i) => `<tr>
      <td>${i+1}</td><td>${c.avatar} ${c.name}</td><td>${c.party}</td>
      <td>${c.constituency}</td><td>${votes[c.id] || 0}</td>
      <td><button onclick="deleteCandidate(${c.id})" style="padding:4px 12px;font-size:0.8rem;background:#c62828;border-radius:6px;">Remove</button></td>
    </tr>`).join('')}
  </table>`;
}

function deleteCandidate(id) {
  if (!confirm('Remove this candidate?')) return;
  setData('candidates', getCandidates().filter(c => c.id !== id));
  const votes = getVotes();
  delete votes[id];
  setData('votes', votes);
  renderAdmin();
}

// ===== UTILITY =====
function showMsg(el, type, text) {
  el.textContent = text;
  el.className = 'msg ' + type;
}

// Init default candidates if none exist
if (!localStorage.getItem('candidates')) setData('candidates', defaultCandidates());
