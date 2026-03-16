# ADR-002: 使用 Supabase 作为后端服务

## 状态

Accepted

## 日期

2024-03-13

## 背景

项目需要：

- 用户认证 (OAuth)
- PostgreSQL 数据库
- 向量搜索 (匹配算法)
- 实时通知
- 文件存储 (头像)

## 决策

使用 Supabase 作为 Backend-as-a-Service 平台。

## 选项考虑

### 选项 1: Supabase

- 优点：
  - 开源，可自托管
  - PostgreSQL + pgvector 原生支持
  - 内置 Auth、Realtime、Storage
  - RLS 提供行级安全
  - 慷慨的免费额度
- 缺点：
  - 部分高级功能需要付费
  - 自托管需要运维能力

### 选项 2: Firebase

- 优点：Google 生态，文档丰富
- 缺点：
  - NoSQL 不适合复杂查询
  - 不支持向量搜索
  - 厂商锁定严重

### 选项 3: 自建 PostgreSQL + Auth0 + Pusher

- 优点：灵活，可定制
- 缺点：
  - 需要集成多个服务
  - 运维成本高
  - 开发周期长

### 选项 4: PlanetScale + Clerk + Ably

- 优点：各服务都很优秀
- 缺点：
  - MySQL 不支持 pgvector
  - 需要额外的向量数据库
  - 成本较高

## 理由

1. pgvector 是匹配算法的核心，Supabase 原生支持
2. 一站式解决 Auth、DB、Realtime、Storage
3. RLS 简化了权限管理
4. 开源可自托管，避免厂商锁定
5. 与 Next.js 集成良好

## 影响

- 正面：开发速度快，功能完整
- 负面：需要学习 Supabase 特有的 API
- 风险：免费额度可能不够，需要监控用量

## 相关

- Supabase 文档: https://supabase.com/docs
- pgvector: https://github.com/pgvector/pgvector
- ADR-001: Next.js App Router
