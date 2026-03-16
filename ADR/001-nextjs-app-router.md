# ADR-001: 使用 Next.js App Router

## 状态

Accepted

## 日期

2024-03-13

## 背景

项目需要选择前端框架和路由方案。需要支持：

- 服务端渲染 (SEO)
- API Routes (后端逻辑)
- 流式响应 (AI 对话)
- 国际化

## 决策

使用 Next.js 14+ 的 App Router 作为全栈框架。

## 选项考虑

### 选项 1: Next.js Pages Router

- 优点：成熟稳定，文档丰富，社区支持好
- 缺点：不支持 Server Components，数据获取模式较旧

### 选项 2: Next.js App Router

- 优点：
  - Server Components 减少客户端 JS
  - 更好的流式支持
  - 更灵活的布局系统
  - 原生支持 loading/error 状态
- 缺点：
  - 相对较新，部分生态未完全适配
  - 学习曲线

### 选项 3: Remix

- 优点：优秀的数据加载模式，表单处理
- 缺点：生态较小，部署选项有限

### 选项 4: 前后端分离 (React + Express)

- 优点：架构清晰，技术栈灵活
- 缺点：需要维护两个项目，部署复杂

## 理由

1. App Router 的 Server Components 非常适合 AI 应用，可以在服务端处理敏感的 API 调用
2. 流式响应支持对 AI 对话体验至关重要
3. Vercel 部署无缝集成
4. 单一代码库降低维护成本

## 影响

- 正面：开发效率高，部署简单，性能好
- 负面：需要学习新的数据获取模式
- 风险：部分第三方库可能不兼容 Server Components

## 相关

- Next.js 文档: https://nextjs.org/docs
- App Router 迁移指南: https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration
