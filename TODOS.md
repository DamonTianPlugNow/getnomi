# A2A Platform - TODOs

## Phase 2 (Post-MVP)

### P2-1: 匹配算法优化
- **What**: 基于用户反馈调整匹配权重
- **Why**: 提高匹配质量，增加用户满意度
- **Effort**: L
- **Depends on**: 需要足够的反馈数据积累

### P2-2: 移动端适配
- **What**: PWA 或原生 App
- **Why**: 提升移动端用户体验
- **Effort**: M

### P2-3: 会议前动态推送
- **What**: 会议前 5 分钟推送对方最新动态摘要
- **Why**: 提升用户体验，帮助破冰
- **Effort**: S

### P2-4: 会议后跟进提醒
- **What**: 询问是否保持联系，自动设置跟进提醒
- **Why**: 帮助用户维护关系网络
- **Effort**: S

### P2-5: Onboarding Streaming Response
- **What**: AI 对话回复改为流式输出，用户可以看到逐字显示
- **Why**: 提升用户体验，减少等待感
- **Effort**: M
- **Context**: 当前 handleOnboardingChat 返回完整响应，需要改为 SSE 流式返回

### P2-6: Onboarding 对话数据库持久化
- **What**: 将 onboarding 对话历史存储到数据库，支持跨设备同步
- **Why**: 当前使用 localStorage，换设备会丢失对话进度
- **Effort**: M
- **Context**: 需要新建 onboarding_sessions 表，存储 user_id, messages, profile_data, status

## Phase 3 (Future)

### P3-1: Agent 自主沟通
- **What**: Agent 之间可以自主对话协商
- **Why**: 真正的 A2A 体验
- **Effort**: XL

### P3-2: 语音 Memory 输入
- **What**: 用户可以通过语音创建 Memory Profile
- **Why**: 降低输入门槛
- **Effort**: M

### P3-3: 关系图谱可视化
- **What**: 展示用户的关系网络
- **Why**: 增加用户粘性，网络效应
- **Effort**: L

### P3-4: 推荐算法（协同过滤）
- **What**: 基于相似用户的行为推荐
- **Why**: 提高匹配精度
- **Effort**: L

### P3-5: API 开放
- **What**: 开放 API 给第三方集成
- **Why**: 平台化，生态建设
- **Effort**: L

## Technical Debt

### TD-1: 扩展性限制
- **What**: Supabase 免费层连接数/存储限制
- **When**: 用户量 > 1000 时需升级
- **Severity**: MEDIUM

### TD-2: 单一 LLM 依赖
- **What**: 完全依赖 Claude，无降级方案
- **Mitigation**: 后续可加 OpenAI 作为备选
- **Severity**: LOW

### TD-3: 单一会议平台
- **What**: 只支持 Zoom
- **Mitigation**: 后续加飞书/Google Meet
- **Severity**: LOW

### TD-4: 全局数据库错误处理
- **What**: API routes 中数据库错误处理分散，缺少统一的错误处理层
- **Why**: 当数据库连接失败或 RLS 策略阻���访问时，错误信息不够友好
- **Mitigation**: 创建统一的数据库错误处理 wrapper，提供一致的错误响应格式
- **Severity**: MEDIUM

### TD-5: React Error Boundary
- **What**: 前端缺少 Error Boundary 组件
- **Why**: React 渲染错误会导致整个页面白屏，用户体验差
- **Mitigation**: 添加全局 Error Boundary + 关键页面局部 Error Boundary
- **Severity**: MEDIUM

### TD-6: 批量每日匹配优化
- **What**: dailyMatching 函数对每个用户单独触发 matching/trigger 事件
- **Why**: 当用户量大时，会产生大量独立的 Inngest 事件，可能触发速率限制
- **Mitigation**: 改为批量处理，每批 50-100 用户，或使用 Inngest 的 step.sendEvent 批量发送
- **Severity**: LOW (MVP 阶段用户量小，暂不影响)
