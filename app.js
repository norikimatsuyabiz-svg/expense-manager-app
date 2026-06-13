import { supabase } from './supabase.js';

// --- State ---
let selectedId = null;
let cachedRecords = [];

// --- DB layer ---

async function loadRecords() {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function createRecord(fields) {
  const { data, error } = await supabase
    .from('expenses')
    .insert([fields])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateRecord(id, fields) {
  const { data, error } = await supabase
    .from('expenses')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function removeRecord(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

async function fetchCategoryTotals() {
  const { data, error } = await supabase.rpc('get_category_totals');
  if (error) throw error;
  return data ?? [];
}

async function fetchStatusCounts() {
  const { data, error } = await supabase.rpc('get_status_counts');
  if (error) throw error;
  return data ?? [];
}

// --- Utilities ---

function formatDate(iso) {
  return iso.replace(/-/g, '/');
}

function formatAmount(n) {
  return '¥' + Number(n).toLocaleString('ja-JP');
}

function formatCreatedAt(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function truncate(str, len) {
  return str && str.length > len ? str.slice(0, len) + '…' : (str || '');
}

function statusBadgeHTML(status) {
  if (status === 'pending') {
    return '<span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">申請中</span>';
  }
  return '<span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">精算済</span>';
}

// --- Pane management ---

const PANES = ['pane-empty', 'pane-detail', 'pane-form'];

function showPane(name) {
  PANES.forEach(id => {
    document.getElementById(id).classList.toggle('hidden', id !== name);
  });
}

// --- Refresh ---

async function refresh() {
  try {
    cachedRecords = await loadRecords();
  } catch (e) {
    document.getElementById('expense-list').innerHTML =
      '<p class="text-sm text-red-400 text-center py-8">データの取得に失敗しました</p>';
    return;
  }
  updateSummary(cachedRecords);
  renderList(cachedRecords);
}

// --- Summary ---

function updateSummary(records) {
  const total   = records.reduce((s, r) => s + r.amount, 0);
  const pending = records.filter(r => r.status === 'pending').length;
  const settled = records.filter(r => r.status === 'settled').length;
  document.getElementById('summary-total').textContent   = formatAmount(total);
  document.getElementById('summary-pending').textContent = `${pending}件`;
  document.getElementById('summary-settled').textContent = `${settled}件`;
}

// --- List rendering ---

function renderList(records) {
  const list  = document.getElementById('expense-list');
  const query = document.getElementById('search-box').value.trim().toLowerCase();
  const filtered = query
    ? records.filter(r =>
        r.category.toLowerCase().includes(query) ||
        (r.memo || '').toLowerCase().includes(query)
      )
    : [...records];

  if (filtered.length === 0) {
    list.innerHTML = '<p class="text-sm text-gray-400 text-center py-8">該当する経費がありません</p>';
    return;
  }

  list.innerHTML = filtered.map(r => `
    <div class="expense-card rounded-lg border border-gray-200 bg-white shadow-sm px-4 py-3 ${r.id === selectedId ? 'card-selected' : ''}" data-id="${r.id}">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-gray-500">${formatDate(r.date)}</span>
        ${statusBadgeHTML(r.status)}
      </div>
      <div class="flex items-baseline justify-between">
        <span class="text-base font-semibold text-gray-800">${formatAmount(r.amount)}</span>
        <span class="text-xs text-gray-500 ml-2">${r.category}</span>
      </div>
      ${r.memo ? `<p class="text-xs text-gray-400 mt-1 truncate">${truncate(r.memo, 30)}</p>` : ''}
    </div>
  `).join('');

  list.querySelectorAll('.expense-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedId = card.dataset.id;
      const record = cachedRecords.find(r => r.id === selectedId);
      if (record) showDetail(record);
      renderList(cachedRecords);
    });
  });
}

// --- Detail view ---

function showDetail(record) {
  document.getElementById('detail-date').textContent       = formatDate(record.date);
  document.getElementById('detail-category').textContent  = record.category;
  document.getElementById('detail-amount').textContent    = formatAmount(record.amount);
  document.getElementById('detail-memo').textContent      = record.memo || '—';
  document.getElementById('detail-created-at').textContent = formatCreatedAt(record.created_at);
  document.getElementById('detail-status-badge').innerHTML = statusBadgeHTML(record.status);
  document.getElementById('btn-toggle-status').textContent =
    record.status === 'pending' ? '精算済にする' : '申請中に戻す';
  showPane('pane-detail');
}

// --- Form ---

function openForm(record = null) {
  const isEdit = record !== null;
  document.getElementById('form-title').textContent   = isEdit ? '経費を編集' : '新規経費登録';
  document.getElementById('field-id').value           = isEdit ? record.id : '';
  document.getElementById('field-date').value         = isEdit ? record.date : '';
  document.getElementById('field-category').value     = isEdit ? record.category : '';
  document.getElementById('field-amount').value       = isEdit ? record.amount : '';
  document.getElementById('field-memo').value         = isEdit ? (record.memo || '') : '';
  clearErrors();
  showPane('pane-form');
}

function clearErrors() {
  ['date', 'category', 'amount'].forEach(f =>
    document.getElementById(`err-${f}`).classList.add('hidden')
  );
}

function validate() {
  let valid = true;
  if (!document.getElementById('field-date').value) {
    document.getElementById('err-date').classList.remove('hidden');
    valid = false;
  }
  if (!document.getElementById('field-category').value) {
    document.getElementById('err-category').classList.remove('hidden');
    valid = false;
  }
  const amt = parseInt(document.getElementById('field-amount').value, 10);
  if (!amt || amt < 1) {
    document.getElementById('err-amount').classList.remove('hidden');
    valid = false;
  }
  return valid;
}

async function saveRecord() {
  clearErrors();
  if (!validate()) return;

  const id       = document.getElementById('field-id').value;
  const date     = document.getElementById('field-date').value;
  const category = document.getElementById('field-category').value;
  const amount   = parseInt(document.getElementById('field-amount').value, 10);
  const memo     = document.getElementById('field-memo').value.trim();

  try {
    let saved;
    if (id) {
      saved = await updateRecord(id, { date, category, amount, memo });
      selectedId = id;
    } else {
      saved = await createRecord({ date, category, amount, memo });
      selectedId = saved.id;
    }
    await refresh();
    showDetail(saved);
  } catch (e) {
    alert('保存に失敗しました: ' + e.message);
  }
}

// --- Stats modal ---

async function openStatsModal() {
  const overlay = document.getElementById('stats-modal-overlay');
  const loading = document.getElementById('modal-loading');
  const content = document.getElementById('modal-content');
  overlay.classList.remove('hidden');
  loading.classList.remove('hidden');
  content.classList.add('hidden');
  loading.textContent = '読み込み中…';
  try {
    const [categories, statuses] = await Promise.all([
      fetchCategoryTotals(),
      fetchStatusCounts(),
    ]);
    renderStats(categories, statuses);
    loading.classList.add('hidden');
    content.classList.remove('hidden');
  } catch (e) {
    loading.textContent = 'データの取得に失敗しました';
  }
}

function closeStatsModal() {
  document.getElementById('stats-modal-overlay').classList.add('hidden');
}

function renderStats(categories, statuses) {
  document.getElementById('modal-category').innerHTML = categories.map(c => `
    <div class="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0">
      <span class="text-sm text-gray-700">${c.category}</span>
      <span class="text-sm font-semibold text-gray-800">${formatAmount(c.total)}</span>
    </div>
  `).join('');

  document.getElementById('modal-status').innerHTML = statuses.map(s => `
    <div class="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0">
      ${statusBadgeHTML(s.status)}
      <span class="text-sm font-semibold text-gray-800">${s.count}件</span>
    </div>
  `).join('');
}

// --- Events ---

function bindEvents() {
  document.getElementById('btn-new').addEventListener('click', () => {
    selectedId = null;
    renderList(cachedRecords);
    openForm();
  });

  document.getElementById('btn-save').addEventListener('click', saveRecord);

  document.getElementById('btn-cancel').addEventListener('click', () => {
    if (selectedId) {
      const r = cachedRecords.find(rec => rec.id === selectedId);
      if (r) { showDetail(r); return; }
    }
    showPane('pane-empty');
  });

  document.getElementById('btn-edit').addEventListener('click', () => {
    const r = cachedRecords.find(rec => rec.id === selectedId);
    if (r) openForm(r);
  });

  document.getElementById('btn-delete').addEventListener('click', async () => {
    if (!selectedId) return;
    if (!confirm('この経費を削除しますか？')) return;
    try {
      await removeRecord(selectedId);
      selectedId = null;
      await refresh();
      showPane('pane-empty');
    } catch (e) {
      alert('削除に失敗しました: ' + e.message);
    }
  });

  document.getElementById('btn-toggle-status').addEventListener('click', async () => {
    if (!selectedId) return;
    const r = cachedRecords.find(rec => rec.id === selectedId);
    if (!r) return;
    try {
      const updated = await updateRecord(selectedId, {
        status: r.status === 'pending' ? 'settled' : 'pending',
      });
      await refresh();
      showDetail(updated);
    } catch (e) {
      alert('更新に失敗しました: ' + e.message);
    }
  });

  document.getElementById('search-box').addEventListener('input', () => {
    renderList(cachedRecords);
  });

  document.getElementById('btn-stats').addEventListener('click', openStatsModal);
  document.getElementById('modal-close').addEventListener('click', closeStatsModal);

  document.getElementById('stats-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('stats-modal-overlay')) closeStatsModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!document.getElementById('stats-modal-overlay').classList.contains('hidden')) {
      closeStatsModal();
      return;
    }
    const formVisible = !document.getElementById('pane-form').classList.contains('hidden');
    if (formVisible && selectedId) {
      const r = cachedRecords.find(rec => rec.id === selectedId);
      if (r) { showDetail(r); return; }
    }
    selectedId = null;
    renderList(cachedRecords);
    showPane('pane-empty');
  });
}

// --- Init ---

async function init() {
  await refresh();
  showPane('pane-empty');
  bindEvents();
}

document.addEventListener('DOMContentLoaded', init);
