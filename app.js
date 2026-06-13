(function () {
  'use strict';

  // --- 定数 ---
  const STORAGE_KEY = 'expense-records';
  const CATEGORIES = ['交通費', '会議費', '接待費', '消耗品', '通信費', 'その他'];

  const SEED_DATA = [
    { date: '2026-05-08', category: '交通費', amount: 1280,  memo: '新宿→品川 出張往復',         status: 'settled' },
    { date: '2026-05-15', category: '接待費', amount: 12800, memo: '〇〇社 山田様 会食',          status: 'settled' },
    { date: '2026-05-22', category: '会議費', amount: 3200,  memo: '社内MTG 飲み物・軽食',        status: 'pending' },
    { date: '2026-06-03', category: '消耗品', amount: 550,   memo: 'ボールペン・付箋 購入',       status: 'pending' },
    { date: '2026-06-10', category: '通信費', amount: 4980,  memo: 'モバイルWi-Fi 6月分',         status: 'pending' },
  ];

  // --- 状態 ---
  let selectedId = null;

  // --- localStorage ---
  function loadRecords() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  }

  function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  // --- 初期データ投入 ---
  function seedIfEmpty() {
    if (localStorage.getItem(STORAGE_KEY) !== null) return;
    const records = SEED_DATA.map((d) => ({
      id:        'exp_' + Date.now() + Math.random().toString(36).slice(2, 6),
      date:      d.date,
      category:  d.category,
      amount:    d.amount,
      memo:      d.memo,
      status:    d.status,
      createdAt: new Date().toISOString(),
    }));
    saveRecords(records);
  }

  // --- ユーティリティ ---
  function formatDate(isoDate) {
    return isoDate.replace(/-/g, '/');
  }

  function formatAmount(n) {
    return '¥' + n.toLocaleString('ja-JP');
  }

  function formatCreatedAt(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  function truncate(str, len) {
    return str.length > len ? str.slice(0, len) + '…' : str;
  }

  function statusBadgeHTML(status) {
    if (status === 'pending') {
      return '<span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">申請中</span>';
    }
    return '<span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">精算済</span>';
  }

  // --- 画面切替 ---
  const PANES = ['pane-empty', 'pane-detail', 'pane-form'];

  function showPane(name) {
    PANES.forEach((id) => {
      const el = document.getElementById(id);
      if (id === name) el.classList.remove('hidden');
      else el.classList.add('hidden');
    });
  }

  // --- サマリ更新 ---
  function updateSummary(records) {
    const total   = records.reduce((s, r) => s + r.amount, 0);
    const pending = records.filter(r => r.status === 'pending').length;
    const settled = records.filter(r => r.status === 'settled').length;
    document.getElementById('summary-total').textContent   = formatAmount(total);
    document.getElementById('summary-pending').textContent = `${pending}件`;
    document.getElementById('summary-settled').textContent = `${settled}件`;
  }

  // --- カードリスト描画 ---
  function renderList(records) {
    const list = document.getElementById('expense-list');
    const query = document.getElementById('search-box').value.trim().toLowerCase();

    const filtered = query
      ? records.filter(r =>
          r.category.toLowerCase().includes(query) ||
          r.memo.toLowerCase().includes(query)
        )
      : [...records];

    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (filtered.length === 0) {
      list.innerHTML = '<p class="text-sm text-gray-400 text-center py-8">該当する経費がありません</p>';
      return;
    }

    list.innerHTML = filtered.map(r => `
      <div
        class="expense-card rounded-lg border border-gray-200 bg-white shadow-sm px-4 py-3 ${r.id === selectedId ? 'card-selected' : ''}"
        data-id="${r.id}"
      >
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
        const record = loadRecords().find(r => r.id === selectedId);
        if (record) showDetail(record);
        renderList(loadRecords());
      });
    });
  }

  // --- 詳細表示 ---
  function showDetail(record) {
    document.getElementById('detail-date').textContent       = formatDate(record.date);
    document.getElementById('detail-category').textContent  = record.category;
    document.getElementById('detail-amount').textContent    = formatAmount(record.amount);
    document.getElementById('detail-memo').textContent      = record.memo || '—';
    document.getElementById('detail-created-at').textContent = formatCreatedAt(record.createdAt);
    document.getElementById('detail-status-badge').innerHTML = statusBadgeHTML(record.status);

    const toggleBtn = document.getElementById('btn-toggle-status');
    if (record.status === 'pending') {
      toggleBtn.textContent = '精算済にする';
    } else {
      toggleBtn.textContent = '申請中に戻す';
    }

    showPane('pane-detail');
  }

  // --- フォームを開く（新規・編集） ---
  function openForm(record = null) {
    const isEdit = record !== null;
    document.getElementById('form-title').textContent = isEdit ? '経費を編集' : '新規経費登録';
    document.getElementById('field-id').value       = isEdit ? record.id : '';
    document.getElementById('field-date').value     = isEdit ? record.date : '';
    document.getElementById('field-category').value = isEdit ? record.category : '';
    document.getElementById('field-amount').value   = isEdit ? record.amount : '';
    document.getElementById('field-memo').value     = isEdit ? record.memo : '';

    clearErrors();
    showPane('pane-form');
  }

  // --- バリデーション ---
  function clearErrors() {
    ['date', 'category', 'amount'].forEach(field => {
      document.getElementById(`err-${field}`).classList.add('hidden');
    });
  }

  function validate() {
    let valid = true;
    const date     = document.getElementById('field-date').value;
    const category = document.getElementById('field-category').value;
    const amount   = parseInt(document.getElementById('field-amount').value, 10);

    if (!date) {
      document.getElementById('err-date').classList.remove('hidden');
      valid = false;
    }
    if (!category) {
      document.getElementById('err-category').classList.remove('hidden');
      valid = false;
    }
    if (!amount || amount < 1) {
      document.getElementById('err-amount').classList.remove('hidden');
      valid = false;
    }
    return valid;
  }

  // --- 保存（Create / Update） ---
  function saveRecord() {
    clearErrors();
    if (!validate()) return;

    const id       = document.getElementById('field-id').value;
    const date     = document.getElementById('field-date').value;
    const category = document.getElementById('field-category').value;
    const amount   = parseInt(document.getElementById('field-amount').value, 10);
    const memo     = document.getElementById('field-memo').value.trim();

    const records = loadRecords();

    if (id) {
      const idx = records.findIndex(r => r.id === id);
      if (idx !== -1) {
        records[idx] = { ...records[idx], date, category, amount, memo };
      }
      selectedId = id;
    } else {
      const newRecord = {
        id:        'exp_' + Date.now(),
        date, category, amount, memo,
        status:    'pending',
        createdAt: new Date().toISOString(),
      };
      records.push(newRecord);
      selectedId = newRecord.id;
    }

    saveRecords(records);
    updateSummary(records);
    renderList(records);

    const saved = records.find(r => r.id === selectedId);
    if (saved) showDetail(saved);
  }

  // --- 削除 ---
  function deleteRecord() {
    if (!selectedId) return;
    if (!confirm('この経費を削除しますか？')) return;

    const records = loadRecords().filter(r => r.id !== selectedId);
    saveRecords(records);
    selectedId = null;
    updateSummary(records);
    renderList(records);
    showPane('pane-empty');
  }

  // --- ステータス切替 ---
  function toggleStatus() {
    if (!selectedId) return;
    const records = loadRecords();
    const idx = records.findIndex(r => r.id === selectedId);
    if (idx === -1) return;

    records[idx].status = records[idx].status === 'pending' ? 'settled' : 'pending';
    saveRecords(records);
    updateSummary(records);
    renderList(records);
    showDetail(records[idx]);
  }

  // --- イベント登録 ---
  function bindEvents() {
    document.getElementById('btn-new').addEventListener('click', () => {
      selectedId = null;
      renderList(loadRecords());
      openForm();
    });

    document.getElementById('btn-save').addEventListener('click', saveRecord);

    document.getElementById('btn-cancel').addEventListener('click', () => {
      if (selectedId) {
        const record = loadRecords().find(r => r.id === selectedId);
        if (record) { showDetail(record); return; }
      }
      showPane('pane-empty');
    });

    document.getElementById('btn-edit').addEventListener('click', () => {
      const record = loadRecords().find(r => r.id === selectedId);
      if (record) openForm(record);
    });

    document.getElementById('btn-delete').addEventListener('click', deleteRecord);

    document.getElementById('btn-toggle-status').addEventListener('click', toggleStatus);

    document.getElementById('search-box').addEventListener('input', () => {
      renderList(loadRecords());
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const formVisible = !document.getElementById('pane-form').classList.contains('hidden');
        if (formVisible && selectedId) {
          const record = loadRecords().find(r => r.id === selectedId);
          if (record) { showDetail(record); return; }
        }
        selectedId = null;
        renderList(loadRecords());
        showPane('pane-empty');
      }
    });
  }

  // --- 初期化 ---
  function init() {
    seedIfEmpty();
    const records = loadRecords();
    updateSummary(records);
    renderList(records);
    showPane('pane-empty');
    bindEvents();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
