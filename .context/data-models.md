# Nomi 数据模型

## 实体关系图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              profiles                                    │
├─────────────────────────────────────────────────────────────────────────┤
│ id (uuid, PK)                                                           │
│ user_id (uuid, FK → auth.users)                                         │
│ display_name (text)                                                     │
│ avatar_url (text)                                                       │
│ bio (text)                                                              │
│ is_active (boolean) - 是否启用匹配                                       │
│ onboarding_completed (boolean)                                          │
│ created_at, updated_at (timestamptz)                                    │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           agent_profiles                                 │
├─────────────────────────────────────────────────────────────────────────┤
│ id (uuid, PK)                                                           │
│ profile_id (uuid, FK → profiles)                                        │
│ agent_type (text) - 'emotional' | 'persona' | 'style'                   │
│ content (jsonb) - Agent 分析结果                                         │
│ embedding (vector(1536)) - 用于匹配的向量                                │
│ created_at (timestamptz)                                                │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────��────┐
│                              memories                                    │
├─────────────────────────────────────────────────────────────────────────┤
│ id (uuid, PK)                                                           │
│ profile_id (uuid, FK → profiles)                                        │
│ category (text) - 记忆分类                                               │
│ content (text) - 记忆内容                                                │
│ importance (integer) - 重要程度 1-10                                     │
│ source (text) - 'onboarding' | 'chat' | 'update'                        │
│ created_at (timestamptz)                                                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                               matches                                    │
├─────────────────────────────────────────────────────────────────────────┤
│ id (uuid, PK)                                                           │
│ profile_a_id (uuid, FK → profiles)                                      │
│ profile_b_id (uuid, FK → profiles)                                      │
│ score (float) - 匹配分数 0-1                                             │
│ reason (text) - 匹配原因说明                                             │
│ status (text) - 'pending' | 'approved' | 'rejected' | 'expired'         │
│ approved_by_a (boolean)                                                 │
│ approved_by_b (boolean)                                                 │
│ expires_at (timestamptz) - 48小时过期                                    │
│ created_at (timestamptz)                                                │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │ 1:1
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              meetings                                    │
├─────────────────────────────────────────────────────────────────────────┤
│ id (uuid, PK)                                                           │
│ match_id (uuid, FK → matches)                                           │
│ zoom_meeting_id (text)                                                  │
│ zoom_join_url (text)                                                    │
│ scheduled_at (timestamptz)                                              │
│ duration_minutes (integer)                                              │
│ status (text) - 'scheduling' | 'scheduled' | 'completed' | 'cancelled' │
│ brief (jsonb) - AI 生成的会议简报                                        │
│ created_at (timestamptz)                                                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          meeting_feedback                                │
├─────────────────────────────────────────────────────────────────────────┤
│ id (uuid, PK)                                                           │
│ meeting_id (uuid, FK → meetings)                                        │
│ profile_id (uuid, FK → profiles)                                        │
│ rating (integer) - 1-5 星                                               │
│ feedback (text)                                                         │
│ would_meet_again (boolean)                                              │
│ created_at (timestamptz)                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

## 关系说明

### profiles ↔ agent_profiles (1:N)

- 每个用户有多个 Agent Profile（情感、人格、风格）
- Agent Profile 包含向量用于相似度匹配

### profiles ↔ memories (1:N)

- 记忆是 AI 对话中提取的关键信息
- 按类别和重要程度组织

### profiles ↔ matches (M:N)

- 双向匹配关系
- 需要双方都 approve 才能进入 meeting

### matches ↔ meetings (1:1)

- 确认的 match 创建一个 meeting
- meeting 包含 Zoom 信息和 AI 简报

## 索引策略

```sql
-- 向量搜索索引
CREATE INDEX idx_agent_profiles_embedding
ON agent_profiles USING ivfflat (embedding vector_cosine_ops);

-- 常用查询索引
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_expires_at ON matches(expires_at);
CREATE INDEX idx_memories_profile_id ON memories(profile_id);
```

## RLS 策略

```sql
-- profiles: 用户只能访问自己的 profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

-- matches: 用户只能看到自己参与的 match
CREATE POLICY "Users can view own matches" ON matches
  FOR SELECT USING (
    profile_a_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR profile_b_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- memories: 用户只能访问自己的记忆
CREATE POLICY "Users can manage own memories" ON memories
  FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
```

## 数据流转

```
用户输入
    │
    ▼
┌─────────┐     ┌─────────────┐     ┌────────────────┐
│ memories │ ──→ │ agent_profiles │ ──→ │ embedding vector │
└─────────┘     └─────────────┘     └────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │  pgvector 搜索   │
                                    └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │     matches     │
                                    └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │    meetings     │
                                    └─────────────────┘
```
