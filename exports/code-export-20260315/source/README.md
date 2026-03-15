# 食刻 · 大学城美食地图（V1.0）

完整实现版本，包含 `Web + API` 双端：

- `Web`：React + Vite + TypeScript，支持地图视图 / 图片流视图。
- `API`：Fastify + TypeScript，提供匿名会话、推荐、社区、审核、提醒等接口。
- `PWA`：manifest + service worker，支持添加到主屏。

## 核心能力

- 场景输入：人数、时段、时间压力 + 主观描述
- 推荐引擎：规则评分 + AI 可插拔增强 + 换一批 40% 新店策略
- 双类型商户：正式餐厅（🍴）+ 小摊贩（🚩）
- 详情闭环：查看详情 -> 就去这家了 -> 站内提醒 -> 评价提交
- 社区能力：发帖、评论、众包上架（默认进入审核队列）
- 运营能力：审核队列查询 + 审核动作接口

## 目录结构

- `src/`：前端应用
- `api/src/`：后端 Fastify 服务
- `api/sql/schema.sql`：PostgreSQL 表结构脚本
- `public/manifest.webmanifest`、`public/sw.js`：PWA 资源

## 技术栈

- 前端：React 19、Vite 8、React Router 7、TypeScript
- 后端：Fastify 5、Zod、ioredis（可选）、pg（可选）
- 地图：高德 JS API（未配置 Key 时前端自动降级为模拟地图）
- 测试：Vitest（前后端单测）

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 配置前端环境变量（根目录 `.env` 或 `.env.local`）

```bash
cp .env.example .env
```

3. 构建并启动 API（默认 `http://localhost:8787`）

```bash
npm run build:api
npm run start:api
```

4. 启动 Web（新终端）

```bash
npm run dev:web
```

## 环境变量

前端 `.env`：

```bash
VITE_AMAP_KEY=
VITE_AMAP_SECURITY_CODE=
VITE_APP_CITY=大学城
VITE_API_BASE_URL=http://localhost:8787
```

高德 Key 配置位置：

1. 本地开发：在项目根目录 `.env.local`（推荐）填写 `VITE_AMAP_KEY` 和 `VITE_AMAP_SECURITY_CODE`。
2. 线上部署（如 Vercel）：在项目环境变量里配置同名变量并重新部署。
3. 未配置时：前端会自动显示“模拟地图模式”，推荐功能仍可用。
4. 安全加载：应用启动时会先执行 `window._AMapSecurityConfig = { securityJsCode: '...' }`，再加载 JS API 2.0。

后端 `api/.env`（可参考 `api/.env.example`）：

```bash
API_PORT=8787
API_HOST=0.0.0.0
ADMIN_KEY=shike-admin
RATE_LIMIT_PER_MINUTE=120
REDIS_URL=
DATABASE_URL=
AI_API_ENDPOINT=
AI_API_KEY=
AI_MODEL=
DEEPSEEK_API_KEY=
DEEPSEEK_API_ENDPOINT=https://api.deepseek.com/chat/completions
DEEPSEEK_MODEL=deepseek-chat
AI_TIMEOUT_MS=1200
```

说明：

- 未配置 `REDIS_URL` 时自动使用内存限流。
- 未配置 `AI_API_ENDPOINT` / `AI_API_KEY` / `DEEPSEEK_API_KEY` 时自动使用本地兜底 AI 逻辑。
- 配置 `DEEPSEEK_API_KEY` 后，后端会优先使用 DeepSeek 进行意图提取与摘要生成。
- 当前 API 默认使用内存存储运行态数据；配置 `DATABASE_URL` 后会自动执行 schema 并开启 PostgreSQL 镜像落库。

## 数据说明

- 当前仓库内置的餐厅与社区内容用于产品演示和交互联调，属于示例数据（Mock + 人工整理）。
- 若要上线，请替换为真实门店清单、真实经纬度与真实评论数据源。

## 常用脚本

- `npm run dev:web`：启动前端开发服务器
- `npm run build:api`：编译后端
- `npm run start:api`：启动后端
- `npm run test`：运行全部单测
- `npm run build`：构建后端 + 前端
- `npm run preview`：预览前端构建产物

## 页面路由

- `/`：首页场景输入
- `/map`：地图推荐页
- `/detail/:id`：餐厅详情页 + 评价提交
- `/community`：社区广场 + 发帖评论 + 众包上架

## API 路由（主要）

- `POST /api/v1/anon/session`
- `POST /api/v1/recommendations`
- `POST /api/v1/recommendations/:sceneId/refresh`
- `GET /api/v1/restaurants/:id`
- `POST /api/v1/decisions/go`
- `POST /api/v1/reviews`
- `GET /api/v1/community/posts`
- `POST /api/v1/community/posts`
- `POST /api/v1/community/posts/:postId/comments`
- `POST /api/v1/submissions/place`
- `GET /api/v1/notifications/in-app`
- `POST /api/v1/notifications/:id/ack`
- `GET /api/v1/admin/moderation/queue`
- `POST /api/v1/admin/moderation/:id/action`
