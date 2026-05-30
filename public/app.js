// ── State ──────────────────────────────────────────────────────────────────
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let moodEntries = [];
let dayData = {};
let selectedAnxiety = null;
let selectedIrrit = null;

// Farmaci persistenti (lista fissa, indipendente dal giorno)
let medList = [];

const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const MOODS = ['+3','+2','+1','0','-1','-2','-3'];
const MOOD_LABELS = {'+3':'Alto +3','+2':'Alto +2','+1':'Alto +1','0':'Normale',
                     '-1':'Basso -1','-2':'Basso -2','-3':'Basso -3'};

// ── Keys ───────────────────────────────────────────────────────────────────
function getKey(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function todayKey() {
  const t = new Date();
  return getKey(t.getFullYear(), t.getMonth(), t.getDate());
}

// ── Storage ────────────────────────────────────────────────────────────────
function loadStorage() {
  try { dayData = JSON.parse(localStorage.getItem('moodDiaryData') || '{}'); }
  catch(e) { dayData = {}; }
  try { medList = JSON.parse(localStorage.getItem('moodDiaryMeds') || '[]'); }
  catch(e) { medList = []; }
}
function saveStorage() {
  try { localStorage.setItem('moodDiaryData', JSON.stringify(dayData)); }
  catch(e) { console.warn('localStorage write failed', e); }
}
function saveMedList() {
  try { localStorage.setItem('moodDiaryMeds', JSON.stringify(medList)); }
  catch(e) { console.warn('localStorage write failed', e); }
}

// ── Init ───────────────────────────────────────────────────────────────────
function init() {
  loadStorage();
  updateMonthLabel();
  renderMoodEntries();
  renderScaleBtns('anxietyBtns', 'anx');
  renderScaleBtns('irritBtns', 'irr');
  loadTodayData();
  renderMedPanel();
  renderMonthTable();
}

// ── Navigation ─────────────────────────────────────────────────────────────
function changeMonth(dir) {
  currentMonth += dir;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
  updateMonthLabel();
  renderMonthTable();
}
function updateMonthLabel() {
  document.getElementById('monthLabel').textContent = MONTHS[currentMonth] + ' ' + currentYear;
}
function switchTab(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('sec-' + id).classList.add('active');
  btn.classList.add('active');
  if (id === 'grafico') renderMonthTable();
}

// ── Scale buttons ──────────────────────────────────────────────────────────
function renderScaleBtns(cid, type) {
  const c = document.getElementById(cid);
  c.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement('button');
    b.className = 'scale-btn';
    b.textContent = i;
    b.onclick = () => selectScale(i, type, cid);
    c.appendChild(b);
  }
}
function selectScale(val, type, cid) {
  if (type === 'anx') selectedAnxiety = val;
  else selectedIrrit = val;
  document.querySelectorAll('#' + cid + ' .scale-btn').forEach((b, i) => {
    b.classList.remove('sel-anx', 'sel-irr');
    if (i < val) b.classList.add(type === 'anx' ? 'sel-anx' : 'sel-irr');
  });
}

// ── Mood entries ───────────────────────────────────────────────────────────
function addMoodEntry() {
  const now = new Date();
  const t = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  moodEntries.push({ time: t, value: null, note: '' });
  renderMoodEntries();
}
function removeMoodEntry(idx) {
  moodEntries.splice(idx, 1);
  renderMoodEntries();
}
function renderMoodEntries() {
  const container = document.getElementById('moodEntriesContainer');
  container.innerHTML = '';
  if (!moodEntries.length) {
    container.innerHTML = '<p style="font-size:12px;color:#888;text-align:center;padding:8px 0">Nessuna rilevazione. Aggiungi un\'entrata.</p>';
    return;
  }
  moodEntries.forEach((entry, idx) => {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom:10px;padding:8px;background:#f5f5f5;border-radius:8px';

    const timeRow = document.createElement('div');
    timeRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:6px';
    timeRow.innerHTML = `
      <i class="ti ti-clock" style="font-size:14px;color:#888"></i>
      <input type="time" value="${entry.time}"
        style="border:1px solid #d0d7de;border-radius:6px;padding:3px 6px;background:#fff;font-size:12px"
        onchange="moodEntries[${idx}].time=this.value">
      <button onclick="removeMoodEntry(${idx})"
        style="margin-left:auto;background:none;border:none;color:#888;cursor:pointer">
        <i class="ti ti-x"></i>
      </button>`;

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px';
    MOODS.forEach(v => {
      const b = document.createElement('button');
      b.className = 'mood-btn' + (entry.value === v ? ' selected' : '');
      b.setAttribute('data-v', v);
      b.textContent = v;
      b.title = MOOD_LABELS[v];
      b.onclick = () => { moodEntries[idx].value = v; renderMoodEntries(); };
      btnRow.appendChild(b);
    });

    const noteInput = document.createElement('textarea');
    noteInput.placeholder = 'Nota per questa rilevazione (opzionale)...';
    noteInput.value = entry.note || '';
    noteInput.style.cssText = 'width:100%;padding:5px 8px;border:1px solid #d0d7de;border-radius:6px;background:#fff;font-size:12px;resize:none;font-family:inherit;line-height:1.4';
    noteInput.rows = 2;
    noteInput.oninput = () => { moodEntries[idx].note = noteInput.value; };

    row.appendChild(timeRow);
    row.appendChild(btnRow);
    row.appendChild(noteInput);
    container.appendChild(row);
  });
}

// ── Meds (lista persistente) ───────────────────────────────────────────────
function addMed() {
  medList.push({ name: '' });
  saveMedList();
  renderMedPanel();
}
function removeMed(idx) {
  medList.splice(idx, 1);
  saveMedList();
  // Rimuovi anche dai dati giornalieri
  const key = todayKey();
  if (dayData[key] && dayData[key].medsTaken) {
    dayData[key].medsTaken.splice(idx, 1);
    saveStorage();
  }
  renderMedPanel();
}
function renderMedPanel() {
  const list = document.getElementById('medList');
  list.innerHTML = '';
  const key = todayKey();
  const takenToday = (dayData[key] && dayData[key].medsTaken) ? dayData[key].medsTaken : medList.map(() => false);

  if (!medList.length) {
    list.innerHTML = '<p style="font-size:12px;color:#888;padding:4px 0">Nessun farmaco. Aggiungine uno e verrà ricordato ogni giorno.</p>';
    return;
  }
  medList.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'med-item';
    row.innerHTML = `
      <input class="med-name" type="text" placeholder="Nome/mg" value="${m.name}"
        onchange="medList[${i}].name=this.value;saveMedList();renderMedPanel()">
      <input type="checkbox" class="med-check" ${takenToday[i] ? 'checked' : ''}
        title="Assunto oggi" onchange="toggleMedTaken(${i},this.checked)">
      <button onclick="removeMed(${i})"
        style="background:none;border:none;color:#888;cursor:pointer">
        <i class="ti ti-trash" style="font-size:14px"></i>
      </button>`;
    list.appendChild(row);
  });
}
function toggleMedTaken(idx, checked) {
  const key = todayKey();
  if (!dayData[key]) dayData[key] = {};
  if (!dayData[key].medsTaken) dayData[key].medsTaken = medList.map(() => false);
  dayData[key].medsTaken[idx] = checked;
  saveStorage();
}

// ── Save / Load day ────────────────────────────────────────────────────────
function saveDay() {
  const key = todayKey();
  if (!dayData[key]) dayData[key] = {};
  dayData[key] = {
    ...dayData[key],
    moods:      moodEntries.filter(e => e.value !== null),
    hours:      document.getElementById('hoursSlept').value,
    sleepNotes: document.getElementById('sleepNotes').value,
    weight:     document.getElementById('weightField').value,
    anxiety:    selectedAnxiety,
    irrit:      selectedIrrit,
    alcohol:    document.getElementById('alcoholField').value,
    notes:      document.getElementById('notesField').value,
    savedAt:    new Date().toISOString()
  };
  saveStorage();
  showToast('Giornata salvata ✓');
  renderMonthTable();
}

function loadTodayData() {
  const d = dayData[todayKey()];
  if (!d) return;
  moodEntries = d.moods ? JSON.parse(JSON.stringify(d.moods)) : [];
  // Compatibilità: aggiungi campo note se manca
  moodEntries = moodEntries.map(e => ({ note: '', ...e }));
  renderMoodEntries();
  if (d.hours)      document.getElementById('hoursSlept').value = d.hours;
  if (d.sleepNotes) document.getElementById('sleepNotes').value = d.sleepNotes;
  if (d.weight)     document.getElementById('weightField').value = d.weight;
  if (d.anxiety)    { selectedAnxiety = d.anxiety; selectScale(d.anxiety, 'anx', 'anxietyBtns'); }
  if (d.irrit)      { selectedIrrit = d.irrit; selectScale(d.irrit, 'irr', 'irritBtns'); }
  if (d.alcohol)    document.getElementById('alcoholField').value = d.alcohol;
  if (d.notes)      document.getElementById('notesField').value = d.notes;
}

// ── Mood helpers ───────────────────────────────────────────────────────────
function moodVal(v) { return v !== null ? parseInt(v) : null; }

function moodCell(entries) {
  if (!entries || !entries.length) return '—';
  const vals = entries.map(e => moodVal(e.value)).filter(v => v !== null);
  if (!vals.length) return '—';
  const avg = vals.reduce((a,b) => a+b, 0) / vals.length;
  const avgStr = Number.isInteger(avg) ? (avg > 0 ? '+'+avg : ''+avg) : (avg > 0 ? '+' : '') + avg.toFixed(1);
  const cls = avg > 0 ? 'cell-high' : avg < 0 ? 'cell-low' : 'cell-norm';
  const hasNotes = entries.some(e => e.note && e.note.trim());
  const noteIcon = hasNotes ? ' 💬' : '';
  const tooltip = entries.map(e => e.time + ': ' + (e.value||'?') + (e.note ? ' — ' + e.note : '')).join('\n');
  return `<span class="cell-mood ${cls}" title="${tooltip.replace(/"/g,'&quot;')}">${avgStr}${noteIcon}</span>`;
}

// ── Month table ────────────────────────────────────────────────────────────
function renderMonthTable() {
  const tbody = document.getElementById('monthTableBody');
  tbody.innerHTML = '';
  const days = new Date(currentYear, currentMonth + 1, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const key  = getKey(currentYear, currentMonth, d);
    const data = dayData[key];
    const tr   = document.createElement('tr');
    const isToday = key === todayKey();
    if (isToday) tr.style.fontWeight = '500';

    const moods = (data && data.moods) ? data.moods : [];
    const morning   = moods.filter(e => e.time < '13:00');
    const afternoon = moods.filter(e => e.time >= '13:00');
    const allValid  = moods.filter(e => e.value !== null);
    let avgHtml = '—';
    if (allValid.length) {
      const avg = allValid.reduce((a,e) => a + parseInt(e.value), 0) / allValid.length;
      const avgStr = (avg > 0 ? '+' : '') + avg.toFixed(1).replace('.0','');
      const cls = avg > 0 ? 'cell-high' : avg < 0 ? 'cell-low' : 'cell-norm';
      avgHtml = `<span class="cell-mood ${cls}">${avgStr}</span>`;
    }

    const takenCount = (data && data.medsTaken) ? data.medsTaken.filter(Boolean).length : 0;
    const sn = data && data.sleepNotes ? data.sleepNotes : '—';

    tr.innerHTML = `
      <td style="font-weight:500;color:${isToday ? '#0d9e8a' : '#1a1a1a'}">${d}</td>
      <td>${moodCell(morning)}</td>
      <td>${moodCell(afternoon)}</td>
      <td>${avgHtml}</td>
      <td>${data && data.hours ? data.hours + 'h' : '—'}</td>
      <td style="max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px" title="${sn}">${sn}</td>
      <td>${data && data.weight ? data.weight + ' kg' : '—'}</td>
      <td>${data && data.anxiety ? data.anxiety + '/5' : '—'}</td>
      <td>${data && data.irrit ? data.irrit + '/5' : '—'}</td>
      <td>${medList.length > 0 ? takenCount + '/' + medList.length : '—'}</td>
      <td style="max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px">${data && data.notes ? data.notes : '—'}</td>`;
    tbody.appendChild(tr);
  }
}

// ── CSV export ─────────────────────────────────────────────────────────────
function downloadCSV() {
  const days = new Date(currentYear, currentMonth + 1, 0).getDate();
  const rows = [['Giorno','Umore mattina','Umore pomeriggio','Media umore',
                 'Ore sonno','Note sonno','Peso (kg)',
                 'Ansia (1-5)','Irritabilità (1-5)','Farmaci assunti','Alcol/droghe','Note']];
  for (let d = 1; d <= days; d++) {
    const data  = dayData[getKey(currentYear, currentMonth, d)] || {};
    const moods = data.moods || [];
    const morning   = moods.filter(e => e.time < '13:00');
    const afternoon = moods.filter(e => e.time >= '13:00');
    const allValid  = moods.filter(e => e.value !== null);
    const avg = allValid.length ? (allValid.reduce((a,e) => a+parseInt(e.value),0)/allValid.length).toFixed(1) : '';
    const fmtMoods = arr => arr.map(e => e.time+':'+e.value+(e.note?' ('+e.note+')':'')).join(' | ');
    const takenCount = (data.medsTaken) ? data.medsTaken.filter(Boolean).length : 0;
    rows.push([
      d,
      fmtMoods(morning),
      fmtMoods(afternoon),
      avg,
      data.hours || '',
      (data.sleepNotes || '').replace(/,/g, ';'),
      data.weight || '',
      data.anxiety || '',
      data.irrit || '',
      medList.length > 0 ? takenCount + '/' + medList.length : '',
      data.alcohol || '',
      (data.notes || '').replace(/,/g, ';')
    ]);
  }
  const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `diario_umore_${MONTHS[currentMonth]}_${currentYear}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV scaricato ✓');
}

// ── Reminders ──────────────────────────────────────────────────────────────
function toggleReminder(btn) {
  btn.classList.toggle('on');
  const on = btn.classList.contains('on');
  if (on && 'Notification' in window) {
    Notification.requestPermission().then(p => {
      if (p !== 'granted') showToast('Abilita le notifiche nelle impostazioni');
    });
  }
  showToast(on ? 'Promemoria attivato' : 'Promemoria disattivato');
}

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(() => t.style.opacity = '0', 2500);
}

// ── Backup (AES-256-GCM) ───────────────────────────────────────────────────
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function exportBackup() {
  const password = prompt('Scegli una password per il backup (salvala in un posto sicuro!):');
  if (!password) return;
  const password2 = prompt('Ripeti la password:');
  if (password !== password2) { showToast('Le password non coincidono'); return; }
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const enc = new TextEncoder();
    const payload_data = { dayData, medList };
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(payload_data)));
    const payload = {
      v: 2,
      salt: Array.from(salt),
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diario_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup esportato ✓');
  } catch(e) {
    showToast('Errore durante l\'esportazione');
    console.error(e);
  }
}

function importBackup() {
  document.getElementById('importFileInput').click();
}

async function handleImportFile(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  const password = prompt('Inserisci la password del backup:');
  if (!password) return;
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    if (payload.v !== 1 && payload.v !== 2) { showToast('Formato backup non riconosciuto'); return; }
    const salt = new Uint8Array(payload.salt);
    const iv = new Uint8Array(payload.iv);
    const data = new Uint8Array(payload.data);
    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    const dec = new TextDecoder();
    const imported = JSON.parse(dec.decode(decrypted));
    if (payload.v === 2) {
      if (confirm(`Importare ${Object.keys(imported.dayData).length} giorni e ${imported.medList.length} farmaci?`)) {
        dayData = imported.dayData;
        medList = imported.medList;
        saveStorage();
        saveMedList();
        loadTodayData();
        renderMedPanel();
        renderMonthTable();
        showToast('Backup importato ✓');
      }
    } else {
      if (confirm(`Importare ${Object.keys(imported).length} giorni? I dati attuali verranno sostituti.`)) {
        dayData = imported;
        saveStorage();
        loadTodayData();
        renderMonthTable();
        showToast('Backup importato ✓');
      }
    }
  } catch(e) {
    showToast('Password errata o file corrotto');
    console.error(e);
  }
}

// ── Start ──────────────────────────────────────────────────────────────────
init();
