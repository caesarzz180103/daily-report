import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import Parser from 'rss-parser';

const ROOT = process.cwd();
const parser = new Parser({ timeout: 15000 });

async function loadSourceConfig() {
  const p = path.join(ROOT, 'config', 'sources.json');
  const raw = await fs.readFile(p, 'utf8');
  const cfg = JSON.parse(raw);
  const feeds = (cfg.feeds || []).filter((x) => x.enabled !== false);
  return {
    feeds,
    apis: cfg.apis || { coingeckoTrending: true }
  };
}

const KEYWORDS = {
  high: ['breakthrough', 'surge', 'ban', 'approval', 'hack', 'etf', 'fed', 'rate', 'inflation', 'war', 'ceasefire', 'earnings'],
  medium: ['launch', 'update', 'partnership', 'upgrade', 'research', 'model', 'bitcoin', 'ethereum']
};

function hashId(text) {
  return crypto.createHash('sha1').update(text).digest('hex').slice(0, 16);
}

function stripHtml(input = '') {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractTags(title = '', summary = '') {
  const corpus = `${title} ${summary}`.toLowerCase();
  const raw = ['ai', 'llm', 'openai', 'anthropic', 'google', 'crypto', 'bitcoin', 'ethereum', 'etf', 'fed', 'inflation', 'stocks', 'war', 'policy', 'regulation'];
  return raw.filter((k) => corpus.includes(k)).slice(0, 8);
}

function scoreImportance(title = '', summary = '', category = '') {
  const corpus = `${title} ${summary}`.toLowerCase();
  let score = 40;
  for (const x of KEYWORDS.high) if (corpus.includes(x)) score += 12;
  for (const x of KEYWORDS.medium) if (corpus.includes(x)) score += 6;
  if (category === 'WORLD' || category === 'FINANCE') score += 6;
  if (category === 'CRYPTO') score += 4;
  return Math.min(100, score);
}

function makeSummary(items) {
  const c = (name) => items.filter((x) => x.category === name).length;
  const top = [...items].sort((a, b) => b.importance_score - a.importance_score).slice(0, 3);
  const topText = top.map((x) => `【${x.category}】${x.title}`).join('；');
  return `本小时共收录 ${items.length} 条：AI ${c('AI')} 条、策略交易 ${c('STRATEGY')} 条、加密货币 ${c('CRYPTO')} 条、世界事件 ${c('WORLD')} 条、财经 ${c('FINANCE')} 条。重点关注：${topText || '暂无重点事件'}。`;
}

async function fetchFeed(feed) {
  try {
    const parsed = await parser.parseURL(feed.url);
    return {
      ok: true,
      source: feed.source,
      items: (parsed.items || []).slice(0, 10).map((item) => {
        const title = (item.title || '').trim();
        const summary = stripHtml(item.contentSnippet || item.content || item.summary || '').slice(0, 280);
        const sourceUrl = item.link || feed.url;
        const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();
        const id = hashId(`${title}-${sourceUrl}`);
        return {
          id,
          title,
          summary,
          category: feed.category,
          source_name: feed.source,
          source_url: sourceUrl,
          published_at: new Date(publishedAt).toISOString(),
          importance_score: scoreImportance(title, summary, feed.category),
          sentiment: 0,
          tags: extractTags(title, summary),
          region: 'global'
        };
      })
    };
  } catch (err) {
    console.warn(`[WARN] Feed failed: ${feed.source} => ${err.message}`);
    return { ok: false, source: feed.source, error: err.message, items: [] };
  }
}

async function fetchCoinGecko() {
  try {
    const url = 'https://api.coingecko.com/api/v3/search/trending';
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const now = new Date().toISOString();
    return (data.coins || []).slice(0, 5).map((x) => ({
      id: hashId(`cg-${x.item?.id}-${now}`),
      title: `Trending Crypto: ${x.item?.name} (${x.item?.symbol})`,
      summary: `CoinGecko trending rank #${x.item?.market_cap_rank ?? 'N/A'}.`,
      category: 'CRYPTO',
      source_name: 'CoinGecko',
      source_url: `https://www.coingecko.com/en/coins/${x.item?.id}`,
      published_at: now,
      importance_score: 55,
      sentiment: 0,
      tags: ['crypto', 'trending', (x.item?.symbol || '').toLowerCase()].filter(Boolean),
      region: 'global'
    }));
  } catch (err) {
    console.warn(`[WARN] CoinGecko failed => ${err.message}`);
    return [];
  }
}

function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const x of items) {
    const key = `${x.title.toLowerCase()}|${x.source_url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x);
  }
  return out;
}

function buildStats(items) {
  const s = { total: items.length, AI: 0, STRATEGY: 0, CRYPTO: 0, WORLD: 0, FINANCE: 0 };
  for (const x of items) if (s[x.category] !== undefined) s[x.category] += 1;
  return s;
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function main() {
  const sourceConfig = await loadSourceConfig();
  const feedResults = await Promise.all(sourceConfig.feeds.map(fetchFeed));
  const coingecko = sourceConfig.apis.coingeckoTrending ? await fetchCoinGecko() : [];

  const failed_sources = feedResults.filter((x) => !x.ok).map((x) => ({ source: x.source, error: x.error }));
  const items = dedupe([...feedResults.flatMap((x) => x.items), ...coingecko])
    .filter((x) => x.title)
    .sort((a, b) => b.importance_score - a.importance_score)
    .slice(0, 120);

  const now = new Date();
  const report = {
    generated_at: now.toISOString(),
    hourly_summary: makeSummary(items),
    meta: {
      sources_count: sourceConfig.feeds.length + (sourceConfig.apis.coingeckoTrending ? 1 : 0),
      feed_ok: sourceConfig.feeds.length - failed_sources.length,
      feed_failed: failed_sources.length,
      failed_sources,
      version: '1.2.0'
    },
    stats: buildStats(items),
    items
  };

  const dataDir = path.join(ROOT, 'data');
  const historyDay = now.toISOString().slice(0, 10);
  const historyHour = now.toISOString().slice(11, 13);
  const historyDir = path.join(dataDir, 'history', historyDay);

  await ensureDir(historyDir);
  await fs.writeFile(path.join(dataDir, 'latest.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(historyDir, `${historyHour}.json`), JSON.stringify(report, null, 2));

  const indexPath = path.join(dataDir, 'history', 'index.json');
  let index = [];
  try {
    index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
  } catch {}

  index.unshift({ generated_at: report.generated_at, path: `data/history/${historyDay}/${historyHour}.json`, total: report.stats.total });
  index = index.slice(0, 500);
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

  console.log(`[OK] Report generated: ${report.generated_at}, items=${items.length}`);
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
