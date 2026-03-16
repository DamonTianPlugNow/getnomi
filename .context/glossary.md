# Nomi 术语表

## 核心概念

### Profile (档案)

用户的个人档案，包含基本信息、AI 生成的分析结果。是整个系统的核心数据实体。

### Agent Profile (Agent 档案)

AI Agent 对用户进行分析后生成的结构化数据。每个用户有多个 Agent Profile：

- **Emotional Profile**: 情感模式分析
- **Persona Profile**: 人格特征分析
- **Style Profile**: 沟通风格分析

### Memory (记忆)

从 AI 对话中提取的关键信息片段。按类别和重要程度组织，用于生成 Agent Profile。

### Match (匹配)

两个用户之间的潜在连接。包含匹配分数、原因、双方审批状态。

### Meeting (会议)

确认匹配后创建的 Zoom 视频会议。包含会议简报和反馈。

---

## AI 相关

### Orchestrator (编排器)

AI 对话的核心控制器，负责协调各专业 Agent，管理对话流程。

### Classifier (分类器)

分析用户输入的意图、情感、话题类型。

### Conversation Flow (对话流程)

管理 Onboarding 对话的阶段和进度。

### Embedding (向量嵌入)

将文本转换为高维向量，用于相似度搜索。使用 OpenAI text-embedding-3-small 模型。

### pgvector

PostgreSQL 的向量扩展，支持向量存储和相似度搜索。

---

## 技术术语

### App Router

Next.js 13+ 的路由系统，基于文件系统，支持 Server Components。

### Server Components

在服务端渲染的 React 组件，不包含客户端 JavaScript。

### Client Components

在客户端运行的 React 组件，使用 `"use client"` 指令标记。

### RLS (Row Level Security)

Supabase/PostgreSQL 的行级安全策略，确保用户只能访问自己的数据。

### SSE (Server-Sent Events)

服务端向客户端推送实时数据的技术，用于 AI 对话的流式响应。

### Inngest

事件驱动的后台任务框架，支持重试、调度、工作���。

---

## 业务术语

### Onboarding (入职引导)

新用户首次使用时的 AI 对话流程，收集用户信息并生成 Profile。

### Ice Breaking (破冰)

Onboarding 的第一阶段，建立信任，了解基本信息。

### Deep Dive (深入了解)

Onboarding 的第二阶段，挖掘性格特征和价值观。

### Emotional Exploration (情感探索)

Onboarding 的第三阶段，理解情感模式和需求。

### Meeting Brief (会议简报)

AI 为即将进行的会议生成的准备材料，包含双方共同点、建议话题等。

### Export (导出)

将 Profile 导出为 Markdown 文件，便于用户保存和分享。

---

## 状态值

### Profile Status

- `onboarding_completed: false` - 正在进行 Onboarding
- `onboarding_completed: true` - Onboarding 完成
- `is_active: true` - 启用匹配功能
- `is_active: false` - 禁用匹配功能

### Match Status

- `pending` - 等待双方审批
- `approved` - 双方都已批准
- `rejected` - 一方拒绝
- `expired` - 48小时未响应，已过期

### Meeting Status

- `scheduling` - 正在协调时间
- `scheduled` - 时间已确定
- `completed` - 会议已完成
- `cancelled` - 会议已取消

---

## 缩写

| 缩写  | 全称                              | 说明           |
| ----- | --------------------------------- | -------------- |
| LLM   | Large Language Model              | 大语言模型     |
| RLS   | Row Level Security                | 行级安全       |
| SSE   | Server-Sent Events                | 服务端推送事件 |
| OAuth | Open Authorization                | 开放授权协议   |
| JWT   | JSON Web Token                    | JSON 网络令牌  |
| API   | Application Programming Interface | 应用程序接口   |
| CRUD  | Create, Read, Update, Delete      | 增删改查       |
| i18n  | Internationalization              | 国际化         |
| ADR   | Architecture Decision Record      | 架构决策记录   |
