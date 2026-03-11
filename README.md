# ZZ Daily Report

一个基于 **GitHub Pages + GitHub Actions** 的自动化日报项目。

## 目标
- 每小时整点自动抓取免费公开信息
- 覆盖：AI、策略交易、加密货币、世界重大事件、财经新闻
- 自动生成结构化 JSON 报告并发布到网页
- 全静态站点，无需服务器

## 技术架构
- 前端：原生 HTML/CSS/JS（静态页面）
- 数据生成：Node.js 脚本（`scripts/build-report.mjs`）
- 数据源：RSS + CoinGecko 免费 API
- 调度：GitHub Actions (`.github/workflows/hourly-report.yml`)
- 托管：GitHub Pages

## 目录结构

```
ZZ Daily Report/
├─ .github/workflows/hourly-report.yml
├─ data/
│  ├─ latest.json
│  └─ history/
├─ scripts/build-report.mjs
├─ index.html
├─ app.js
├─ style.css
├─ package.json
└─ README.md
```

## 本地运行

```bash
npm install
npm run build:report
# 然后用任意静态服务器打开 index.html
```

## GitHub Pages 发布
1. 把仓库推到 GitHub（建议仓库名：`zz-daily-report`）
2. 在仓库设置里启用 Pages（Source: Deploy from a branch）
3. 选择 `main` 分支 + `/ (root)`
4. 等待 Actions 首次成功后，页面即可访问

## 数据说明
- `data/latest.json`：最新一轮整点报告（包含 `meta.failed_sources`）
- `data/history/YYYY-MM-DD/HH.json`：历史小时报告
- `data/history/index.json`：历史索引

## 上线建议（5分钟）
1. 新建 GitHub 仓库 `zz-daily-report`
2. 推送本地代码到 `main`
3. GitHub → Settings → Pages → Deploy from a branch → `main` / root
4. GitHub → Actions，手动执行一次 `hourly-report`（workflow_dispatch）
5. 打开 Pages 链接检查页面与数据是否正常

## 备注
- 所有信息源均为公开免费源
- 页面展示摘要与来源链接，不搬运全文
- 可按需继续扩展来源和筛选逻辑
