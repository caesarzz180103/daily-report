const categoryText = {
  AI: 'AI',
  STRATEGY: '策略交易',
  CRYPTO: '加密货币',
  WORLD: '世界重大事件',
  FINANCE: '财经新闻'
};

let cachedItems = [];

function el(id) {
  return document.getElementById(id);
}

function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', { hour12: false });
}

function renderSummary(report) {
  const grid = el('summaryGrid');
  const stats = report.stats || {};
  const cards = [
    ['总条数', stats.total || 0],
    ['AI', stats.AI || 0],
    ['策略交易', stats.STRATEGY || 0],
    ['加密货币', stats.CRYPTO || 0],
    ['世界事件', stats.WORLD || 0],
    ['财经', stats.FINANCE || 0]
  ];
  grid.innerHTML = cards
    .map(([label, num]) => `<div class="card"><div class="label">${label}</div><div class="num">${num}</div></div>`)
    .join('');
}

function renderList(items) {
  const list = el('list');
  if (!items.length) {
    list.innerHTML = '<div class="panel">当前筛选条件下无内容。</div>';
    return;
  }

  list.innerHTML = items
    .map((x) => {
      const tags = (x.tags || []).slice(0, 5).map((t) => `<span class="badge">#${t}</span>`).join(' ');
      return `
        <article class="item">
          <h3><a href="${x.source_url}" target="_blank" rel="noopener noreferrer">${x.title}</a></h3>
          <div class="meta-row">
            <span class="badge">${categoryText[x.category] || x.category}</span>
            <span>${x.source_name}</span>
            <span>发布时间: ${fmtTime(x.published_at)}</span>
            <span>重要度: ${x.importance_score}</span>
          </div>
          <p>${x.summary || '（无摘要）'}</p>
          <div class="meta-row">${tags}</div>
        </article>
      `;
    })
    .join('');
}

function applyFilters() {
  const keyword = el('search').value.trim().toLowerCase();
  const cat = el('categoryFilter').value;

  const filtered = cachedItems.filter((x) => {
    const hitCat = cat === 'ALL' || x.category === cat;
    const blob = `${x.title} ${x.summary} ${x.source_name} ${(x.tags || []).join(' ')}`.toLowerCase();
    const hitKeyword = !keyword || blob.includes(keyword);
    return hitCat && hitKeyword;
  });

  renderList(filtered);
}

async function renderHistory() {
  const box = el('history');
  try {
    const res = await fetch('./data/history/index.json?_=' + Date.now());
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) {
      box.textContent = '暂无历史记录';
      return;
    }

    box.innerHTML = list
      .slice(0, 12)
      .map((x) => `• ${fmtTime(x.generated_at)} ｜ 共 ${x.total} 条 ｜ <a href="./${x.path}" target="_blank" rel="noopener noreferrer">查看 JSON</a>`)
      .join('<br/>');
  } catch {
    box.textContent = '历史索引加载失败';
  }
}

async function main() {
  const res = await fetch('./data/latest.json?_=' + Date.now());
  const report = await res.json();

  el('meta').textContent = `最近更新时间：${fmtTime(report.generated_at)} | 时区：UTC | 来源数：${report.meta?.sources_count || 0}`;
  el('hourlySummary').textContent = report.hourly_summary || '暂无摘要';

  renderSummary(report);
  cachedItems = (report.items || []).sort((a, b) => b.importance_score - a.importance_score);
  applyFilters();
  await renderHistory();

  el('search').addEventListener('input', applyFilters);
  el('categoryFilter').addEventListener('change', applyFilters);
}

main().catch((err) => {
  console.error(err);
  el('hourlySummary').textContent = '加载失败，请稍后刷新。';
});
