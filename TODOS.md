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
