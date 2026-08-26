# 部署说明

ZZULI.dev 是静态站点，推荐部署到 Cloudflare Pages。

## Cloudflare Pages

推荐使用 Pages 的 Git 集成，不需要在仓库里配置部署 Token。Cloudflare 连接 GitHub 仓库后，按下面配置即可：

- Root directory：`frontend`
- Build command：`npm run build`
- Build output directory：`build`
- Environment variables：`NODE_VERSION=22`

如果使用 Wrangler 直接上传构建产物，才需要额外准备 `CLOUDFLARE_ACCOUNT_ID` 和可部署 Pages 的 `CLOUDFLARE_API_TOKEN`，然后上传 `frontend/build`。

## 数据采集

站点构建时只读取 `data/*.json`，前端不会在用户访问时请求 GitHub 或 Cloudflare API。

- `collect-blog-posts.yml`：采集博客文章
- `collect-github-activity.yml`：采集成员 GitHub 贡献日历，使用 `GITHUB_TOKEN`
- `collect-site-stats.yml`：采集站点访问统计，需要仓库 Secrets：
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ZONE_TAG`

Cloudflare 访问统计接入：

1. 在 Cloudflare Dashboard 打开 `My Profile` -> `API Tokens` -> `Create Token` -> `Custom token`。
2. 权限选择 `Account` -> `Account Analytics` -> `Read`，Zone Resources 限制到 `zzuli.dev` 所在 zone。
3. 在 `zzuli.dev` zone 概览页复制 `Zone ID`，写入 GitHub Secrets：`CLOUDFLARE_ZONE_TAG`。
4. 把 API Token 写入 GitHub Secrets：`CLOUDFLARE_API_TOKEN`。
5. 手动运行 `Collect site stats` workflow。成功后会更新 `data/site-stats.json`，首页会显示“站点访问”卡片。

本地测试：

```bash
set -a
source .env
set +a
npm --prefix frontend run collect:site-stats
```

本地 `.env` 只用于你自己运行采集脚本，不要提交。仓库提供了 `.env.example` 作为模板；前端页面构建不需要这些 Token。

站点统计默认读取最近 30 天 Cloudflare zone 日统计：

- `totalPageViews`：由 `dailyPageViews` 按日期累计，重复运行同一天只会覆盖当天数值，不会重复累加。
- `uniqueVisitors`：近 30 天按天独立访客汇总，会标记为近似值，不作为“总访客”。

Cloudflare 的日统计节点不支持按 hostname 或 `requestSource` 过滤；`SITE_STATS_DAYS<=7` 时脚本会额外用 `httpRequestsAdaptiveGroups` 按 `SITE_STATS_HOSTNAME` 查询请求和访次。
