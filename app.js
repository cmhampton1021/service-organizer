const STORAGE_KEY = 'carGroups';
const SIMPLIFIED_KEY = 'simplifiedView';
const PRESETS_KEY = 'carPresets';
const UNASSIGNED_KEY = 'unassignedGroups';
const CAPACITIES = [2, 4, 5, 6, 7, 8];

let selectedCapacity = null;
let selectedPresetId = null;
let editingPresetId = null;
let movingPassenger = null;     // { carId, passId } | null
let assigningUnassigned = null; // passId | null

// ── Simplified toggle ────────────────────────────────────────────────────────

function loadSimplified() {
  try { return JSON.parse(localStorage.getItem(SIMPLIFIED_KEY)) === true; }
  catch { return false; }
}

function saveSimplified(val) {
  localStorage.setItem(SIMPLIFIED_KEY, JSON.stringify(val));
}

function handleToggleChange(checked) {
  saveSimplified(checked);
  render();
}

// ── Theme constants ──────────────────────────────────────────────────────────

const LIFE_CARS = [
  { body: '#f56565', dark: '#9b2c2c', light: '#fff5f5', text: '#63171b' },
  { body: '#4299e1', dark: '#2a4365', light: '#ebf8ff', text: '#1a365d' },
  { body: '#f6c90e', dark: '#744210', light: '#fffff0', text: '#5f370e' },
  { body: '#48bb78', dark: '#22543d', light: '#f0fff4', text: '#1c4532' },
  { body: '#ed8936', dark: '#7b341e', light: '#fffaf0', text: '#652b19' },
  { body: '#ed64a6', dark: '#702459', light: '#fff5f7', text: '#521b41' },
];

const PEG_COLORS = [
  '#f687b3','#63b3ed','#9ae6b4','#faf089','#d6bcfa','#fbd38d','#fc8181','#76e4f7',
];

// ── Presets ──────────────────────────────────────────────────────────────────

function loadPresets() {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY)) || []; }
  catch { return []; }
}

function savePresets(presets) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

function handleAddPreset() {
  const nameEl = document.getElementById('presetNameInput');
  const capEl  = document.getElementById('presetCapInput');
  const errEl  = document.getElementById('presetErr');
  const name     = nameEl.value.trim();
  const capacity = parseInt(capEl.value, 10);
  errEl.textContent = '';
  if (!name) { errEl.textContent = 'Enter a preset name.'; nameEl.focus(); return; }
  if (!capacity || capacity < 1) { errEl.textContent = 'Enter a valid seat count.'; capEl.focus(); return; }
  const presets = loadPresets();
  if (presets.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    errEl.textContent = 'A preset with that name already exists.'; nameEl.focus(); return;
  }
  presets.push({ id: uid(), name, capacity });
  savePresets(presets);
  nameEl.value = '';
  capEl.value  = '';
  renderPresets();
}

function startEditPreset(id) {
  editingPresetId = id;
  renderPresets();
  document.getElementById(`edit-name-${id}`)?.focus();
}

function cancelEditPreset() {
  editingPresetId = null;
  renderPresets();
}

function saveEditPreset(id) {
  const nameEl = document.getElementById(`edit-name-${id}`);
  const capEl  = document.getElementById(`edit-cap-${id}`);
  const errEl  = document.getElementById(`edit-err-${id}`);
  const name     = nameEl.value.trim();
  const capacity = parseInt(capEl.value, 10);
  errEl.textContent = '';
  if (!name) { errEl.textContent = 'Name required.'; nameEl.focus(); return; }
  if (!capacity || capacity < 1) { errEl.textContent = 'Valid seat count required.'; capEl.focus(); return; }
  const presets = loadPresets();
  if (presets.some(p => p.id !== id && p.name.toLowerCase() === name.toLowerCase())) {
    errEl.textContent = 'A preset with that name already exists.'; nameEl.focus(); return;
  }
  const preset = presets.find(p => p.id === id);
  if (!preset) return;
  preset.name     = name;
  preset.capacity = capacity;
  savePresets(presets);
  editingPresetId = null;
  renderPresets();
}

function deletePreset(id) {
  savePresets(loadPresets().filter(p => p.id !== id));
  if (selectedPresetId === id) {
    selectedPresetId = null;
    selectedCapacity = null;
    document.getElementById('btnAddCar').disabled = true;
    document.querySelectorAll('.capacity-btn').forEach(b => b.classList.remove('selected'));
  }
  renderPresets();
}

function handlePresetSelect(id) {
  const preset = loadPresets().find(p => p.id === id);
  if (!preset) { selectedPresetId = null; return; }
  selectedPresetId = preset.id;
  selectCapacity(preset.capacity);
}

function togglePresetsPanel() {
  const body    = document.getElementById('presetsBody');
  const header  = document.getElementById('presetsHeader');
  const chevron = document.getElementById('presetsChevron');
  const isOpen  = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  header.classList.toggle('open', !isOpen);
  chevron.classList.toggle('open', !isOpen);
}

function renderPresets() {
  const presets  = loadPresets();
  const listEl   = document.getElementById('presetList');
  const selectEl = document.getElementById('presetSelect');

  if (listEl) {
    listEl.innerHTML = presets.length === 0
      ? '<p class="presets-empty">No presets yet. Add one below.</p>'
      : presets.map(p => {
          if (p.id === editingPresetId) {
            return `
              <div class="preset-item editing">
                <div class="preset-edit-form">
                  <input class="input-edit-name" id="edit-name-${p.id}" type="text" value="${esc(p.name)}" placeholder="Name" />
                  <input class="input-edit-cap"  id="edit-cap-${p.id}"  type="number" min="1" max="20" value="${p.capacity}" placeholder="Seats" />
                  <button class="btn-save-preset"  onclick="saveEditPreset('${p.id}')">Save</button>
                  <button class="btn-cancel-edit"  onclick="cancelEditPreset()">Cancel</button>
                  <span class="form-error" id="edit-err-${p.id}"></span>
                </div>
              </div>`;
          }
          return `
            <div class="preset-item">
              <span class="preset-item-info">${esc(p.name)}<span class="preset-item-cap">(${p.capacity} seats)</span></span>
              <div style="display:flex;gap:.2rem;">
                <button class="btn-edit-preset"   title="Edit preset"   onclick="startEditPreset('${p.id}')">✎</button>
                <button class="btn-delete-preset" title="Delete preset" onclick="deletePreset('${p.id}')">✕</button>
              </div>
            </div>`;
        }).join('');
  }

  if (selectEl) {
    const usedPresetIds = new Set(loadState().map(g => g.presetId).filter(Boolean));
    const current = selectEl.value;
    selectEl.innerHTML = '<option value="">— or pick a preset —</option>' +
      presets.map(p => {
        const used = usedPresetIds.has(p.id);
        return `<option value="${p.id}" ${p.id === current ? 'selected' : ''} ${used ? 'disabled' : ''}>${esc(p.name)} (${p.capacity} seats)${used ? ' — already added' : ''}</option>`;
      }).join('');
    if (usedPresetIds.has(current) && current !== '') selectEl.value = '';
  }
}

// ── State ────────────────────────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function loadState() {
  try {
    const groups = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    let dirty = false;
    groups.forEach(g => {
      g.passengers.forEach(p => {
        if (!p.id) { p.id = uid(); dirty = true; }
      });
    });
    if (dirty) saveState(groups);
    return groups;
  }
  catch { return []; }
}

function saveState(groups) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

// ── Unassigned state ─────────────────────────────────────────────────────────

function loadUnassigned() {
  try { return JSON.parse(localStorage.getItem(UNASSIGNED_KEY)) || []; }
  catch { return []; }
}

function saveUnassigned(list) {
  localStorage.setItem(UNASSIGNED_KEY, JSON.stringify(list));
}

// ── Car group mutations ──────────────────────────────────────────────────────

function addGroup(capacity, name, presetId) {
  const groups = loadState();
  groups.push({ id: uid(), capacity, name: name || null, presetId: presetId || null, passengers: [] });
  saveState(groups);
  render();
  renderPresets();
}

function addPassenger(groupId, lastName, count) {
  const groups = loadState();
  const group  = groups.find(g => g.id === groupId);
  if (!group) return null;
  const used = group.passengers.reduce((s, p) => s + p.count, 0);
  if (used + count > group.capacity) return 'over';
  group.passengers.push({ id: uid(), lastName: lastName.trim(), count });
  saveState(groups);
  render();
  return 'ok';
}

function removePassenger(groupId, idx) {
  const groups = loadState();
  const group  = groups.find(g => g.id === groupId);
  if (!group) return;
  group.passengers.splice(idx, 1);
  saveState(groups);
  render();
}

function stepPassengerCount(groupId, idx, delta) {
  const groups = loadState();
  const group  = groups.find(g => g.id === groupId);
  if (!group) return;
  const othersUsed = group.passengers.reduce((s, p, i) => i !== idx ? s + p.count : s, 0);
  const newCount   = group.passengers[idx].count + delta;
  if (newCount < 1 || othersUsed + newCount > group.capacity) return;
  group.passengers[idx].count = newCount;
  saveState(groups);
  render();
}

function updatePassengerCount(groupId, idx, inputEl) {
  const groups = loadState();
  const group  = groups.find(g => g.id === groupId);
  if (!group) return;
  const newCount   = parseInt(inputEl.value, 10);
  const othersUsed = group.passengers.reduce((s, p, i) => i !== idx ? s + p.count : s, 0);
  if (!newCount || newCount < 1 || othersUsed + newCount > group.capacity) {
    inputEl.classList.add('input-error');
    inputEl.value = group.passengers[idx].count;
    setTimeout(() => { inputEl.classList.remove('input-error'); inputEl.value = group.passengers[idx].count; }, 800);
    return;
  }
  inputEl.classList.remove('input-error');
  group.passengers[idx].count = newCount;
  saveState(groups);
  render();
}

function removeGroup(groupId) {
  const groups = loadState();
  const group  = groups.find(g => g.id === groupId);
  if (group && group.passengers.length > 0) {
    const unassigned = loadUnassigned();
    group.passengers.forEach(p => unassigned.push(p));
    saveUnassigned(unassigned);
  }
  saveState(groups.filter(g => g.id !== groupId));
  if (movingPassenger && movingPassenger.carId === groupId) movingPassenger = null;
  render();
  renderPresets();
}

function clearSession() {
  if (!confirm('Clear all car groups and start a new session?')) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(UNASSIGNED_KEY);
  movingPassenger    = null;
  assigningUnassigned = null;
  render();
}

// ── Unassigned mutations ─────────────────────────────────────────────────────

function addUnassigned(lastName, count) {
  const list = loadUnassigned();
  list.push({ id: uid(), lastName: lastName.trim(), count });
  saveUnassigned(list);
  render();
}

function removeUnassigned(id) {
  saveUnassigned(loadUnassigned().filter(p => p.id !== id));
  if (assigningUnassigned === id) assigningUnassigned = null;
  render();
}

function updateUnassignedName(id, value) {
  const trimmed = value.trim();
  if (!trimmed) return;
  const list = loadUnassigned();
  const p    = list.find(p => p.id === id);
  if (!p || p.lastName === trimmed) return;
  p.lastName = trimmed;
  saveUnassigned(list);
}

function stepUnassignedCount(id, delta) {
  const list = loadUnassigned();
  const p    = list.find(p => p.id === id);
  if (!p) return;
  const newCount = p.count + delta;
  if (newCount < 1) return;
  p.count = newCount;
  saveUnassigned(list);
  renderUnassigned();
}

function updateUnassignedCount(id, inputEl) {
  const list = loadUnassigned();
  const p    = list.find(p => p.id === id);
  if (!p) return;
  const newCount = parseInt(inputEl.value, 10);
  if (!newCount || newCount < 1) {
    inputEl.classList.add('input-error');
    setTimeout(() => { inputEl.classList.remove('input-error'); inputEl.value = p.count; }, 800);
    return;
  }
  p.count = newCount;
  saveUnassigned(list);
}

function handleAddUnassigned() {
  const nameEl  = document.getElementById('unassignedName');
  const countEl = document.getElementById('unassignedCount');
  const errEl   = document.getElementById('unassignedErr');
  const lastName = nameEl.value.trim();
  const count    = parseInt(countEl.value, 10);
  errEl.textContent = '';
  if (!lastName) { errEl.textContent = 'Please enter a name.'; nameEl.focus(); return; }
  if (!count || count < 1) { errEl.textContent = 'Enter a valid number.'; countEl.focus(); return; }
  addUnassigned(lastName, count);
  nameEl.value  = '';
  countEl.value = '1';
}

// ── Move operations ──────────────────────────────────────────────────────────

function moveGroupToCar(sourceId, passId, targetCarId) {
  const groups    = loadState();
  const targetCar = groups.find(g => g.id === targetCarId);
  if (!targetCar) return;

  const targetUsed = targetCar.passengers.reduce((s, p) => s + p.count, 0);
  let passenger;

  if (sourceId === 'unassigned') {
    const unassigned = loadUnassigned();
    const idx = unassigned.findIndex(p => p.id === passId);
    if (idx === -1) return;
    passenger = unassigned[idx];
    if (targetUsed + passenger.count > targetCar.capacity) {
      alert(`Not enough seats. Only ${targetCar.capacity - targetUsed} seat(s) remaining in that car.`);
      return;
    }
    unassigned.splice(idx, 1);
    saveUnassigned(unassigned);
    if (assigningUnassigned === passId) assigningUnassigned = null;
  } else {
    const sourceCar = groups.find(g => g.id === sourceId);
    if (!sourceCar) return;
    const idx = sourceCar.passengers.findIndex(p => p.id === passId);
    if (idx === -1) return;
    passenger = sourceCar.passengers[idx];
    if (targetUsed + passenger.count > targetCar.capacity) {
      alert(`Not enough seats. Only ${targetCar.capacity - targetUsed} seat(s) remaining in that car.`);
      return;
    }
    sourceCar.passengers.splice(idx, 1);
    if (movingPassenger && movingPassenger.passId === passId) movingPassenger = null;
  }

  targetCar.passengers.push(passenger);
  saveState(groups);
  render();
}

function moveGroupToUnassigned(carId, passId) {
  const groups = loadState();
  const car    = groups.find(g => g.id === carId);
  if (!car) return;
  const idx = car.passengers.findIndex(p => p.id === passId);
  if (idx === -1) return;
  const [passenger] = car.passengers.splice(idx, 1);
  saveState(groups);
  const unassigned = loadUnassigned();
  unassigned.push(passenger);
  saveUnassigned(unassigned);
  if (movingPassenger && movingPassenger.passId === passId) movingPassenger = null;
  render();
}

function startMove(carId, passId) {
  movingPassenger     = { carId, passId };
  assigningUnassigned = null;
  render();
}

function cancelMove() {
  movingPassenger = null;
  render();
}

function confirmMove(targetId) {
  if (!movingPassenger || !targetId) return;
  if (targetId === 'unassigned') {
    moveGroupToUnassigned(movingPassenger.carId, movingPassenger.passId);
  } else {
    moveGroupToCar(movingPassenger.carId, movingPassenger.passId, targetId);
  }
}

function confirmMoveFromSelect(passId) {
  const sel = document.getElementById(`move-sel-${passId}`);
  if (!sel || !sel.value) return;
  confirmMove(sel.value);
}

function startAssignUnassigned(passId) {
  assigningUnassigned = passId;
  movingPassenger     = null;
  renderUnassigned();
}

function cancelAssignUnassigned() {
  assigningUnassigned = null;
  renderUnassigned();
}

function confirmAssignUnassigned(passId) {
  const sel = document.getElementById(`assign-sel-${passId}`);
  if (!sel || !sel.value) return;
  moveGroupToCar('unassigned', passId, sel.value);
}

// ── Capacity selector ────────────────────────────────────────────────────────

function initCapacityBtns() {
  const wrap = document.getElementById('capacityBtns');
  wrap.innerHTML = CAPACITIES.map(c =>
    `<button class="capacity-btn" data-cap="${c}" onclick="selectCapacity(${c})">${c}</button>`
  ).join('');
}

function selectCapacity(cap) {
  selectedCapacity = cap;
  document.querySelectorAll('.capacity-btn').forEach(b => {
    b.classList.toggle('selected', +b.dataset.cap === cap);
  });
  document.getElementById('btnAddCar').disabled = false;
}

function handleAddCar() {
  if (!selectedCapacity) return;
  let presetName = null;
  if (selectedPresetId) {
    const preset = loadPresets().find(p => p.id === selectedPresetId);
    if (preset) presetName = preset.name;
  }
  addGroup(selectedCapacity, presetName, selectedPresetId);
  selectedCapacity  = null;
  selectedPresetId  = null;
  document.querySelectorAll('.capacity-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('btnAddCar').disabled = true;
  document.getElementById('presetSelect').value = '';
}

// ── SVG helpers ──────────────────────────────────────────────────────────────

function carSVG(body, dark) {
  return `<svg class="life-car-svg" viewBox="0 0 320 112" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="160" cy="108" rx="148" ry="6" fill="rgba(0,0,0,0.25)"/>
    <rect x="12" y="54" width="296" height="42" rx="11" fill="${body}"/>
    <rect x="12" y="80" width="296" height="16" rx="11" fill="rgba(0,0,0,0.1)"/>
    <path d="M82,54 Q90,14 112,11 L208,11 Q230,14 238,54 Z" fill="${body}"/>
    <path d="M82,54 Q90,14 112,11 L208,11 Q230,14 238,54 Z" fill="rgba(255,255,255,0.12)"/>
    <path d="M97,52 Q104,22 118,17 L154,17 L154,52 Z" fill="rgba(180,235,255,0.55)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
    <path d="M166,52 L166,17 L202,17 Q216,22 223,52 Z" fill="rgba(180,235,255,0.55)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
    <rect x="154" y="16" width="12" height="37" fill="${body}" opacity="0.9"/>
    <rect x="14" y="56" width="292" height="5" rx="2" fill="rgba(255,255,255,0.22)"/>
    <ellipse cx="83" cy="96" rx="30" ry="12" fill="rgba(0,0,0,0.18)"/>
    <ellipse cx="237" cy="96" rx="30" ry="12" fill="rgba(0,0,0,0.18)"/>
    <circle cx="83" cy="94" r="20" fill="#1a202c"/>
    <circle cx="237" cy="94" r="20" fill="#1a202c"/>
    <circle cx="83" cy="94" r="10" fill="#4a5568"/>
    <circle cx="237" cy="94" r="10" fill="#4a5568"/>
    <circle cx="83" cy="94" r="5" fill="#a0aec0"/>
    <circle cx="237" cy="94" r="5" fill="#a0aec0"/>
    <ellipse cx="299" cy="67" rx="10" ry="7" fill="rgba(255,255,200,0.9)"/>
    <ellipse cx="299" cy="67" rx="6" ry="4" fill="rgba(255,255,255,0.95)"/>
    <ellipse cx="21" cy="67" rx="8" ry="6" fill="rgba(255,60,60,0.85)"/>
    <rect x="303" y="74" width="9" height="12" rx="3" fill="${dark}"/>
    <rect x="8" y="74" width="9" height="12" rx="3" fill="${dark}"/>
    <line x1="160" y1="56" x2="160" y2="93" stroke="rgba(0,0,0,0.12)" stroke-width="2"/>
    <rect x="14" y="72" width="292" height="3" rx="1" fill="rgba(255,255,255,0.18)"/>
  </svg>`;
}

function pegSVG(color) {
  const shadow = 'rgba(0,0,0,0.2)';
  return `<svg class="peg-svg" width="17" height="30" viewBox="0 0 17 30" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8.5" cy="6" r="5.5" fill="${color}" stroke="${shadow}" stroke-width="1"/>
    <circle cx="7" cy="4.5" r="2" fill="rgba(255,255,255,0.3)"/>
    <path d="M4,11 Q4.5,10 8.5,10 Q12.5,10 13,11 L12,26 Q10,28 8.5,28 Q7,28 5,26 Z" fill="${color}" stroke="${shadow}" stroke-width="1"/>
    <path d="M4.5,11 Q5,10.5 8.5,10.5 L8.5,28 Q7,28 5,26 Z" fill="rgba(255,255,255,0.15)"/>
  </svg>`;
}

// ── Render: unassigned section ───────────────────────────────────────────────

function renderUnassigned() {
  const container = document.getElementById('unassignedContainer');
  if (!container) return;

  const list   = loadUnassigned();
  const groups = loadState();

  const rows = list.map(p => {
    const isAssigning = assigningUnassigned === p.id;

    const carOptions = groups.map((g, gi) => {
      const used      = g.passengers.reduce((s, ps) => s + ps.count, 0);
      const remaining = g.capacity - used;
      const disabled  = remaining < p.count;
      const label     = g.name || `Car ${gi + 1}`;
      return `<option value="${g.id}"${disabled ? ' disabled' : ''}>${esc(label)} (${remaining} left)${disabled ? ' — full' : ''}</option>`;
    }).join('');

    const assignSection = isAssigning
      ? `<div class="move-controls">
           <select id="assign-sel-${p.id}" class="move-select">
             <option value="">— pick a car —</option>
             ${carOptions}
           </select>
           <button class="btn-move-confirm" onclick="confirmAssignUnassigned('${p.id}')">Assign</button>
           <button class="btn-move-cancel"  onclick="cancelAssignUnassigned()">✕</button>
         </div>`
      : `<button class="btn-assign-to-car"${groups.length === 0 ? ' disabled title="Add a car first"' : ''} onclick="startAssignUnassigned('${p.id}')">Assign to car</button>`;

    return `
      <div class="unassigned-row">
        <input type="text" class="unassigned-name-input" value="${esc(p.lastName)}"
          onblur="updateUnassignedName('${p.id}', this.value)" />
        <div class="simplified-count-control" style="flex-shrink:0;">
          <button class="count-step-btn minus" onclick="stepUnassignedCount('${p.id}', -1)"${p.count <= 1 ? ' disabled' : ''}>−</button>
          <input class="simplified-count-input" type="number" min="1" value="${p.count}"
            onchange="updateUnassignedCount('${p.id}', this)" />
          <button class="count-step-btn plus" onclick="stepUnassignedCount('${p.id}', 1)">+</button>
        </div>
        ${assignSection}
        <button class="btn-delete-passenger" title="Remove group" onclick="removeUnassigned('${p.id}')">✕</button>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="unassigned-panel">
      <div class="unassigned-heading">Unassigned Groups</div>
      ${list.length > 0 ? `<div class="unassigned-list">${rows}</div>` : ''}
      <div class="add-unassigned-form">
        <input type="text"   class="input-name"  id="unassignedName"  placeholder="Name" />
        <input type="number" class="input-count" id="unassignedCount" min="1" value="1" placeholder="# People" />
        <button class="btn-add-passenger" onclick="handleAddUnassigned()">Add Group</button>
        <span class="form-error" id="unassignedErr"></span>
      </div>
    </div>`;
}

// ── Render: car cards ────────────────────────────────────────────────────────

function renderSimplifiedCard(group, num, groups) {
  const used      = group.passengers.reduce((s, p) => s + p.count, 0);
  const remaining = group.capacity - used;
  const carTheme  = LIFE_CARS[(num - 1) % LIFE_CARS.length];

  const familyRows = group.passengers.map((p, i) => {
    const isMoving   = movingPassenger && movingPassenger.carId === group.id && movingPassenger.passId === p.id;
    const othersUsed = group.passengers.reduce((s, p2, idx) => idx !== i ? s + p2.count : s, 0);
    const maxForThis = group.capacity - othersUsed;

    const otherCarsOptions = groups.filter(g => g.id !== group.id).map(g2 => {
      const used2 = g2.passengers.reduce((s, p2) => s + p2.count, 0);
      const rem   = g2.capacity - used2;
      const disabled = rem < p.count;
      const label = g2.name || `Car ${groups.indexOf(g2) + 1}`;
      return `<option value="${g2.id}"${disabled ? ' disabled' : ''}>${esc(label)} (${rem} left)</option>`;
    }).join('');

    const rowContent = isMoving
      ? `<span class="simplified-family-name">${esc(p.lastName)}</span>
         <div class="move-controls">
           <select id="move-sel-${p.id}" class="move-select">
             <option value="">— move to —</option>
             <option value="unassigned">Unassigned</option>
             ${otherCarsOptions}
           </select>
           <button class="btn-move-confirm" onclick="confirmMoveFromSelect('${p.id}')">Move</button>
           <button class="btn-move-cancel"  onclick="cancelMove()">✕</button>
         </div>`
      : `<span class="simplified-family-name">${esc(p.lastName)}</span>
         <div class="simplified-count-control">
           <button class="count-step-btn minus" onclick="stepPassengerCount('${group.id}', ${i}, -1)"${p.count <= 1 ? ' disabled' : ''}>−</button>
           <input class="simplified-count-input" type="number" min="1" max="${maxForThis}" value="${p.count}"
             title="People count for ${esc(p.lastName)}"
             onchange="updatePassengerCount('${group.id}', ${i}, this)" />
           <button class="count-step-btn plus" onclick="stepPassengerCount('${group.id}', ${i}, 1)"${p.count >= maxForThis ? ' disabled' : ''}>+</button>
         </div>
         <button class="btn-move-passenger" title="Move to another car or unassigned" onclick="startMove('${group.id}', '${p.id}')">Move</button>
         <button class="btn-delete-passenger" title="Remove ${esc(p.lastName)}" onclick="removePassenger('${group.id}', ${i})">✕</button>`;

    return `<div class="simplified-family-row">${rowContent}</div>`;
  }).join('');

  const cardLabel  = group.name || `Car ${num}`;
  const footerLabel = remaining === 0
    ? `${cardLabel} &mdash; Full`
    : `${cardLabel} &mdash; ${remaining} seat${remaining !== 1 ? 's' : ''} left`;

  const addForm = remaining === 0 ? '' : `
    <div class="add-passenger-form" style="background:#f7fafc;" id="form-${group.id}">
      <input class="input-name"  type="text"   placeholder="Name"  id="name-${group.id}" />
      <input class="input-count" type="number" min="1" max="${remaining}" value="1" id="count-${group.id}" />
      <button class="btn-add-passenger" onclick="handleAddPassenger('${group.id}')">Add</button>
      <span class="form-error" id="err-${group.id}"></span>
    </div>`;

  return `
    <div class="car-card simplified" style="border: 2px solid ${carTheme.dark};">
      <div class="simplified-header" style="background:${carTheme.dark};">
        <span>${footerLabel}</span>
        <button class="btn-delete-car" title="Remove car" onclick="removeGroup('${group.id}')" style="color:rgba(255,255,255,.75);">🗑</button>
      </div>
      ${group.passengers.length > 0 ? `<div class="simplified-families">${familyRows}</div>` : ''}
      ${addForm}
    </div>`;
}

function renderCard(group, num, groups) {
  const used      = group.passengers.reduce((s, p) => s + p.count, 0);
  const remaining = group.capacity - used;
  const isFull    = remaining === 0;
  const carTheme  = LIFE_CARS[(num - 1) % LIFE_CARS.length];

  const familySections = group.passengers.map((p, i) => {
    const isMoving   = movingPassenger && movingPassenger.carId === group.id && movingPassenger.passId === p.id;
    const pegColor   = PEG_COLORS[i % PEG_COLORS.length];
    const pegs       = Array.from({ length: p.count }, () => pegSVG(pegColor)).join('');
    const othersUsed = group.passengers.reduce((s, p2, idx) => idx !== i ? s + p2.count : s, 0);
    const maxForThis = group.capacity - othersUsed;

    const otherCarsOptions = groups.filter(g => g.id !== group.id).map(g2 => {
      const used2 = g2.passengers.reduce((s, p2) => s + p2.count, 0);
      const rem   = g2.capacity - used2;
      const disabled = rem < p.count;
      const label = g2.name || `Car ${groups.indexOf(g2) + 1}`;
      return `<option value="${g2.id}"${disabled ? ' disabled' : ''}>${esc(label)} (${rem} left)</option>`;
    }).join('');

    const controls = isMoving
      ? `<div class="move-controls" style="margin-top:.3rem;">
           <select id="move-sel-${p.id}" class="move-select">
             <option value="">— move to —</option>
             <option value="unassigned">Unassigned</option>
             ${otherCarsOptions}
           </select>
           <button class="btn-move-confirm" onclick="confirmMoveFromSelect('${p.id}')">Move</button>
           <button class="btn-move-cancel"  onclick="cancelMove()">✕</button>
         </div>`
      : `<div class="simplified-count-control" style="margin:0;">
           <button class="count-step-btn minus" onclick="stepPassengerCount('${group.id}', ${i}, -1)"${p.count <= 1 ? ' disabled' : ''}>−</button>
           <input class="simplified-count-input" type="number" min="1" max="${maxForThis}" value="${p.count}"
             title="People count for ${esc(p.lastName)}"
             onchange="updatePassengerCount('${group.id}', ${i}, this)" />
           <button class="count-step-btn plus" onclick="stepPassengerCount('${group.id}', ${i}, 1)"${p.count >= maxForThis ? ' disabled' : ''}>+</button>
         </div>
         <button class="btn-move-passenger" title="Move to another car or unassigned" onclick="startMove('${group.id}', '${p.id}')">Move</button>
         <button class="btn-delete-passenger" title="Remove ${esc(p.lastName)}" onclick="removePassenger('${group.id}', ${i})">✕</button>`;

    return `
      <div class="life-family">
        <div class="life-pegs">${pegs}</div>
        <div class="life-family-name" style="color:${carTheme.text}">${esc(p.lastName)}</div>
        ${controls}
      </div>`;
  }).join('');

  const addForm = isFull ? '' : `
    <div class="add-passenger-form" style="background:${carTheme.light};" id="form-${group.id}">
      <input class="input-name"  type="text"   placeholder="Name" id="name-${group.id}" />
      <input class="input-count" type="number" min="1" max="${remaining}" value="1" id="count-${group.id}" />
      <button class="btn-add-passenger" onclick="handleAddPassenger('${group.id}')">Add</button>
      <span class="form-error" id="err-${group.id}"></span>
    </div>`;

  const cardLabel   = group.name || `Car ${num}`;
  const footerLabel = isFull
    ? `${cardLabel} &mdash; ${group.capacity} seats &mdash; All Aboard! 🎉`
    : `${cardLabel} &mdash; ${group.capacity} seats &mdash; ${remaining} seat${remaining !== 1 ? 's' : ''} remaining`;

  return `
    <div class="car-card" style="border: 2px solid ${carTheme.dark};">
      <div class="life-car-banner">
        ${carSVG(carTheme.body, carTheme.dark)}
        <button class="btn-delete-car life-delete" title="Remove car" onclick="removeGroup('${group.id}')">🗑</button>
      </div>
      ${group.passengers.length > 0 ? `
        <div class="life-passengers" style="background:${carTheme.light};">
          ${familySections}
        </div>` : ''}
      ${addForm}
      <div class="life-car-footer" style="background:${carTheme.dark};">
        ${footerLabel}
      </div>
    </div>`;
}

// ── Render: main ─────────────────────────────────────────────────────────────

function render() {
  renderUnassigned();

  const groups     = loadState();
  const simplified = loadSimplified();
  const container  = document.getElementById('groupsContainer');

  document.getElementById('simplifiedToggle').checked = simplified;

  const unassigned   = loadUnassigned();
  const totalPeople  = groups.reduce((s, g) => s + g.passengers.reduce((ps, p) => ps + p.count, 0), 0)
    + unassigned.reduce((s, p) => s + p.count, 0);
  const totalEl = document.getElementById('totalCount');
  totalEl.textContent = (groups.length > 0 || unassigned.length > 0) ? `Total: ${totalPeople}` : '';

  if (groups.length === 0) {
    container.innerHTML = '<p class="empty-state">No car groups yet. Select a capacity above and click <strong>Add Car</strong> to get started.</p>';
    return;
  }

  container.innerHTML = `<div class="cars-grid">${
    groups.map((g, i) => simplified ? renderSimplifiedCard(g, i + 1, groups) : renderCard(g, i + 1, groups)).join('')
  }</div>`;
}

// ── Add passenger handler ────────────────────────────────────────────────────

function handleAddPassenger(groupId) {
  const nameEl  = document.getElementById(`name-${groupId}`);
  const countEl = document.getElementById(`count-${groupId}`);
  const errEl   = document.getElementById(`err-${groupId}`);
  const lastName = nameEl.value.trim();
  const count    = parseInt(countEl.value, 10);

  errEl.textContent = '';

  if (!lastName) { errEl.textContent = 'Please enter a last name.'; nameEl.focus(); return; }
  if (!count || count < 1) { errEl.textContent = 'Enter a valid number of people.'; countEl.focus(); return; }

  const result = addPassenger(groupId, lastName, count);
  if (result === 'over') {
    const group = loadState().find(g => g.id === groupId);
    const used  = group.passengers.reduce((s, p) => s + p.count, 0);
    errEl.textContent = `Only ${group.capacity - used} seat(s) remaining.`;
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ─────────────────────────────────────────────────────────────────────
initCapacityBtns();
renderPresets();
render();
