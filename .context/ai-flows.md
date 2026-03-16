# Nomi AI 流程文档

## AI 模块架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Orchestrator                                   │
│                      (src/lib/ai/orchestrator.ts)                       │
│                                                                         │
│  职责：协调各专业 Agent，管理对话流程，生成最终响应                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   Classifier        │ │   ConversationFlow  │ │      Memory         │
│   (classifier.ts)   │ │ (conversation-flow) │ │    (memory.ts)      │
│                     │ │                     │ │                     │
│ • 意图识别          │ │ • 话题引导          │ │ • 记忆存储          │
│ • 情感检测          │ │ • 阶段管理          │ │ • 记忆检索          │
│ • 话题分类          │ │ • 完成度追踪        │ │ • 重要性评估        │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   EmotionalAgent    │ │    PersonaAgent     │ │   UserStyleAgent    │
│   (emotional.ts)    │ │    (persona.ts)     │ │   (user-style.ts)   │
│                     │ │                     │ │                     │
│ • 情感模式分析      │ │ • 性格特征提取      │ │ • 沟通风格分析      │
│ • 情绪触发点        │ │ • 价值观识别        │ │ • 表达偏好          │
│ • 情感需求          │ │ • 兴趣爱好          │ │ • 互动模式          │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

## Onboarding 对话流程

### 阶段定义

```
Stage 1: 破冰 (Ice Breaking)
├── 目标：建立信任，了解基本信息
├── 话题：名字、职业、日常生活
└── 完成条件：获取 display_name + 基本背景

Stage 2: 深入了解 (Deep Dive)
├── 目标：挖掘性格特征和价值观
├── 话题：兴趣爱好、人生经历、重要决定
└── 完成条件：收集 5+ 条有意义的记忆

Stage 3: 情感探索 (Emotional Exploration)
├── 目标：理解情感模式和需求
├── 话题：人际关系、情感经历、理想伴侣
└── 完成条件：情感画像基本完整

Stage 4: 总结确认 (Summary & Confirmation)
├── 目标：确认理解正确，生成 Profile
├── 话题：总结回顾、补充修正
└── 完成条件：用户确认 Profile
```

### 对话流程图

```
┌──────────────┐
│   用户输入   │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│  Classifier  │────▶│  意图识别    │
└──────┬───────┘     │  • 回答问题  │
       │             │  • 提问      │
       │             │  • 闲聊      │
       │             │  • 结束信号  │
       │             └──────────────┘
       ▼
┌──────────────┐
│   Memory     │
│  存储/检索   │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────────────────────┐
│ Conversation │────▶│  判断当前阶段                │
│    Flow      │     │  • 是否需要切换话题          │
└──────┬───────┘     │  • 是否需要深入追问          │
       │             │  • 是否可以进入下一阶段      │
       │             └──────────────────────────────┘
       ▼
┌──────────────┐
│ Orchestrator │
│  生成响应    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Streaming   │
│   Response   │
└──────────────┘
```

## Agent Profile 生成

### 触发时机

```
Onboarding 完成
      │
      ▼
Inngest: profile/created
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│                  generateAgentProfiles                       │
│                                                             │
│  1. 获取所有 memories                                        │
│  2. 并行调用三个 Agent 分析                                  │
│  3. 生成 embedding 向量                                      │
│  4. 存储 agent_profiles                                      │
└─────────────────────────────────────────────────────────────┘
```

### Agent 输出格式

```typescript
// EmotionalAgent 输出
interface EmotionalProfile {
  emotional_patterns: string[]; // 情感模式
  triggers: {
    // 情绪触发点
    positive: string[];
    negative: string[];
  };
  attachment_style: string; // 依恋类型
  emotional_needs: string[]; // 情感需求
  communication_in_conflict: string; // 冲突时的沟通方式
}

// PersonaAgent 输出
interface PersonaProfile {
  personality_traits: string[]; // 性格特征
  values: string[]; // 核心价值观
  interests: string[]; // 兴趣爱好
  life_goals: string[]; // 人生目标
  deal_breakers: string[]; // 不能接受的事
}

// UserStyleAgent 输出
interface UserStyleProfile {
  communication_style: string; // 沟通风格
  humor_type: string; // 幽默类型
  social_preference: string; // 社交偏好
  energy_level: string; // 能量水平
  decision_making: string; // 决策方式
}
```

## 匹配算法

### 向量搜索

```sql
-- 使用 pgvector 进行相似度搜索
SELECT
  ap.profile_id,
  1 - (ap.embedding <=> target_embedding) as similarity
FROM agent_profiles ap
WHERE ap.profile_id != current_profile_id
  AND ap.agent_type = 'persona'
ORDER BY ap.embedding <=> target_embedding
LIMIT 20;
```

### Claude 智能排序

```
输入：
├── 当前用户的 Agent Profiles
├── 候选用户列表（含 Agent Profiles）
└── 匹配偏好设置

处理：
├── 分析兼容性维度
│   ├── 性格互补性
│   ├── 价值观一致性
│   ├── 兴趣重叠度
│   └── 沟通风格匹配
├── 计算综合分数
└── 生成匹配理由

输出：
├── 排序后的候选列表
├── 每个候选的匹配分数 (0-1)
└── 匹配理由说明
```

## Prompt 安全

### 用户输入隔离

```typescript
// 所有用户输入都用 XML 标签包裹
const prompt = `
分析以下用户输入：

<user_input>
${userMessage}
</user_input>

请提取关键信息...
`;
```

### 输出验证

```typescript
// 使用 Zod 验证 LLM 输出
const AgentOutputSchema = z.object({
  personality_traits: z.array(z.string()).max(10),
  values: z.array(z.string()).max(5),
  // ...
});

const result = AgentOutputSchema.safeParse(llmOutput);
if (!result.success) {
  // 处理验证失败
}
```

## 错误处理

### 重试策略

```typescript
// Inngest 自动重试配置
export const generateAgentProfiles = inngest.createFunction(
  {
    id: "generate-agent-profiles",
    retries: 3,
    backoff: {
      type: "exponential",
      minDelay: 1000,
      maxDelay: 60000,
    },
  },
  { event: "profile/created" },
  async ({ event, step }) => {
    // ...
  },
);
```

### 降级策略

```
Claude API 失败
      │
      ├── 重试 3 次
      │
      ├── 失败后：使用缓存的 Prompt 模板生成基础 Profile
      │
      └── 通知用户稍后重试
```

## 性能优化

### 并行处理

```typescript
// 三个 Agent 并行分析
const [emotional, persona, style] = await Promise.all([
  emotionalAgent.analyze(memories),
  personaAgent.analyze(memories),
  userStyleAgent.analyze(memories),
]);
```

### Streaming 响应

```typescript
// 使用 Server-Sent Events 实时返回
const stream = await claude.messages.stream({
  model: "claude-3-sonnet",
  messages: [...],
});

for await (const chunk of stream) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
}
```
