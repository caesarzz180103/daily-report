const I18N = {
  zh: {
    all: '全部分类',
    total: '总条数',
    summary: '每小时摘要',
    top: '重点事件（Top 5）',
    news: '快讯列表',
    history: '历史归档（最近更新）',
    search: '搜索标题 / 标签 / 来源',
    sortImportance: '按重要度',
    sortTime: '按时间',
    noData: '当前筛选条件下无内容。',
    noHistory: '暂无历史记录',
    viewJson: '查看 JSON',
    updated: '最近更新时间',
    timezone: '时区',
    sources: '来源数',
    failed: '失败源',
    published: '发布时间',
    importance: '重要度',
    footer: '数据来自公开免费来源。涉及投资内容请先核验原始来源，不构成投资建议。',
    cats: { AI: 'AI', STRATEGY: '策略交易', CRYPTO: '加密货币', WORLD: '世界重大事件', FINANCE: '财经新闻' }
  },
  en: {
    all: 'All Categories', total: 'Total', summary: 'Hourly Summary', top: 'Top Events (Top 5)', news: 'News Feed', history: 'History (Recent)',
    search: 'Search title / tags / source', sortImportance: 'Sort by Importance', sortTime: 'Sort by Time', noData: 'No data under current filters.',
    noHistory: 'No history yet', viewJson: 'View JSON', updated: 'Updated', timezone: 'Timezone', sources: 'Sources', failed: 'Failed',
    published: 'Published', importance: 'Importance', footer: 'Data from public/free sources. Verify original sources before decisions.',
    cats: { AI: 'AI', STRATEGY: 'Strategy', CRYPTO: 'Crypto', WORLD: 'World Events', FINANCE: 'Finance' }
  },
  vi: {
    all: 'Tất cả danh mục', total: 'Tổng số', summary: 'Tóm tắt theo giờ', top: 'Sự kiện nổi bật (Top 5)', news: 'Danh sách tin', history: 'Lịch sử (gần đây)',
    search: 'Tìm tiêu đề / thẻ / nguồn', sortImportance: 'Sắp theo độ quan trọng', sortTime: 'Sắp theo thời gian', noData: 'Không có dữ liệu theo bộ lọc hiện tại.',
    noHistory: 'Chưa có lịch sử', viewJson: 'Xem JSON', updated: 'Cập nhật', timezone: 'Múi giờ', sources: 'Nguồn', failed: 'Nguồn lỗi',
    published: 'Thời gian', importance: 'Độ quan trọng', footer: 'Dữ liệu từ nguồn công khai miễn phí. Hãy kiểm tra nguồn gốc trước khi quyết định.',
    cats: { AI: 'AI', STRATEGY: 'Chiến lược', CRYPTO: 'Crypto', WORLD: 'Sự kiện thế giới', FINANCE: 'Tài chính' }
  }
};

const FALLBACK_COVER = {
  AI: 'https://images.unsplash.com/photo-1677442135136-760c813028c0?auto=format&fit=crop&w=1200&q=60',
  STRATEGY: 'https://images.unsplash.com/photo-1642543348745-6f761c0b3f6b?auto=format&fit=crop&w=1200&q=60',
  CRYPTO: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=1200&q=60',
  WORLD: 'https://images.unsplash.com/photo-1521292270410-a8c4d716d518?auto=format&fit=crop&w=1200&q=60',
  FINANCE: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=60'
};

let reportData;
let cachedItems = [];
let currentSortBy = 'importance';
let currentCategory = 'ALL';
let lang = localStorage.getItem('zz_lang') || 'zh';

const el = (id) => document.getElementById(id);
const t = () => I18N[lang] || I18N.zh;

function fmtTime(iso) {
  return new Date(iso).toLocaleString(lang === 'zh' ? 'zh-CN' : lang, { hour12: false });
}

function applyI18n() {
  el('summaryTitle').textContent = t().summary;
  el('topTitle').textContent = t().top;
  el('newsTitle').textContent = t().news;
  el('historyTitle').textContent = t().history;
  el('search').placeholder = t().search;
  el('sortBy').options[0].text = t().sortImportance;
  el('sortBy').options[1].text = t().sortTime;
  el('footerText').textContent = t().footer;
}

function levelClass(score) {
  if (score >= 80) return 'high';
  if (score >= 60) return 'mid';
  return 'low';
}

function cardTemplate(x) {
  const tags = (x.tags || []).slice(0, 5).map((v) => `<span class="badge">#${v}</span>`).join(' ');
  const cover = x.image_url || FALLBACK_COVER[x.category] || FALLBACK_COVER.WORLD;
  const title = x.title_zh || x.title;
  const summary = x.summary_zh || x.summary;
  return `
    <article class="item">
      <img class="cover" loading="lazy" src="${cover}" alt="${title}" referrerpolicy="no-referrer" />
      <div class="item-body">
        <h3><a href="${x.source_url}" target="_blank" rel="noopener noreferrer">${title}</a></h3>
        <div class="meta-row">
          <span class="badge">${t().cats[x.category] || x.category}</span>
          <span>${x.source_name}</span>
          <span>${t().published}: ${fmtTime(x.published_at)}</span>
          <span class="badge ${levelClass(x.importance_score)}">${t().importance}: ${x.importance_score}</span>
        </div>
        <p>${summary || ''}</p>
        <div class="meta-row">${tags}</div>
      </div>
    </article>
  `;
}

function renderSummary() {
  const stats = reportData.stats || {};
  const grid = el('summaryGrid');
  const cards = [
    ['ALL', t().total, stats.total || 0],
    ['AI', t().cats.AI, stats.AI || 0],
    ['STRATEGY', t().cats.STRATEGY, stats.STRATEGY || 0],
    ['CRYPTO', t().cats.CRYPTO, stats.CRYPTO || 0],
    ['WORLD', t().cats.WORLD, stats.WORLD || 0],
    ['FINANCE', t().cats.FINANCE, stats.FINANCE || 0]
  ];

  grid.innerHTML = cards.map(([key, label, num]) => `
    <button class="card ${currentCategory === key ? 'active' : ''}" data-cat="${key}">
      <div class="label">${label}</div>
      <div class="num">${num}</div>
    </button>
  `).join('');

  grid.querySelectorAll('.card').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.cat;
      renderSummary();
      applyFilters();
    });
  });
}

function renderTop(items) {
  const top = [...items].sort((a, b) => b.importance_score - a.importance_score).slice(0, 5);
  el('topList').innerHTML = top.length ? top.map(cardTemplate).join('') : `<div class="panel">${t().noData}</div>`;
}

function renderList(items) {
  el('list').innerHTML = items.length ? items.map(cardTemplate).join('') : `<div class="panel">${t().noData}</div>`;
}

async function renderHistory() {
  const box = el('history');
  try {
    const res = await fetch('./data/history/index.json?_=' + Date.now());
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) {
      box.textContent = t().noHistory;
      return;
    }
    box.innerHTML = list.slice(0, 12).map((x) => `• ${fmtTime(x.generated_at)} ｜ ${x.total} ｜ <a href="./${x.path}" target="_blank">${t().viewJson}</a>`).join('<br/>');
  } catch {
    box.textContent = t().noHistory;
  }
}

function applyFilters() {
  const keyword = el('search').value.trim().toLowerCase();
  let filtered = cachedItems.filter((x) => {
    const hitCat = currentCategory === 'ALL' || x.category === currentCategory;
    const blob = `${x.title} ${x.title_zh || ''} ${x.summary} ${x.summary_zh || ''} ${x.source_name} ${(x.tags || []).join(' ')}`.toLowerCase();
    return hitCat && (!keyword || blob.includes(keyword));
  });

  filtered = filtered.sort((a, b) => {
    if (currentSortBy === 'time') return new Date(b.published_at) - new Date(a.published_at);
    return b.importance_score - a.importance_score;
  });

  renderList(filtered);
}

function renderMeta() {
  el('meta').textContent = `${t().updated}：${fmtTime(reportData.generated_at)} | ${t().timezone}: UTC | ${t().sources}: ${reportData.meta?.sources_count || 0} | ${t().failed}: ${reportData.meta?.feed_failed || 0} | 中文翻译: ${reportData.meta?.translated_items || 0}`;
}

async function main() {
  el('langSelect').value = lang;
  const res = await fetch('./data/latest.json?_=' + Date.now());
  reportData = await res.json();
  cachedItems = reportData.items || [];

  applyI18n();
  renderMeta();
  el('hourlySummary').textContent = reportData.hourly_summary || '';
  renderSummary();
  renderTop(cachedItems);
  applyFilters();
  await renderHistory();

  el('search').addEventListener('input', applyFilters);
  el('sortBy').addEventListener('change', (e) => {
    currentSortBy = e.target.value;
    applyFilters();
  });
  el('langSelect').addEventListener('change', (e) => {
    lang = e.target.value;
    localStorage.setItem('zz_lang', lang);
    applyI18n();
    renderMeta();
    renderSummary();
    renderTop(cachedItems);
    applyFilters();
    renderHistory();
  });
}

main().catch((err) => {
  console.error(err);
  el('hourlySummary').textContent = 'Load failed.';
});
