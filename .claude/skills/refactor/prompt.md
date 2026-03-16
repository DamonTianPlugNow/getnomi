# Refactor Skill

分析代码并提供重构建议。

## 使用方法

```
/refactor <file_path>
/refactor src/lib/ai/orchestrator.ts
```

## 重构原则

### 1. 代码异味 (Code Smells)

- 过长函数 (> 50 行)
- 过深嵌套 (> 3 层)
- 重复代码
- 过大的类/模块
- 过多参数 (> 4 个)
- 魔法数字/字符串

### 2. SOLID 原则

- **S**ingle Responsibility: 单一职责
- **O**pen/Closed: 开放封闭
- **L**iskov Substitution: 里氏替换
- **I**nterface Segregation: 接口隔离
- **D**ependency Inversion: 依赖倒置

### 3. 重构手法

- Extract Function: 提取函数
- Extract Variable: 提取变量
- Inline Function: 内联函数
- Rename: 重命名
- Move: 移动代码
- Replace Conditional with Polymorphism: 用多态替换条件

### 4. 项目特定

- Server/Client Component 分离
- 共享逻辑提取到 hooks
- 类型定义集中管理
- 常量提取到配置文件

## 输出格式

### 📊 代码分析

概述代码当前状态和主要问题。

### 🔧 重构建议

按优先级列出重构建议，包含：

- 问题描述
- 重构手法
- 代码示例（Before/After）
- 预期收益

### ⚠️ 注意事项

重构时需要注意的风险和依赖。

## 示例输出

````markdown
## Refactor: src/lib/ai/orchestrator.ts

### 📊 代码分析

- 文件行数: 320 行
- 函数数量: 8 个
- 主要问题: `processMessage` 函数过长 (150 行)，职责不清晰

### 🔧 重构建议

#### 1. 提取 `classifyAndRoute` 函数 (高优先级)

**问题**: `processMessage` 中混合了分类逻辑和路由逻辑

**Before**:

```typescript
async function processMessage(message: string) {
  // 50 行分类逻辑
  const intent = ...;
  const emotion = ...;

  // 100 行路由和处理逻辑
  if (intent === 'question') {
    // ...
  } else if (intent === 'statement') {
    // ...
  }
}
```
````

**After**:

```typescript
async function classifyMessage(message: string) {
  // 分类逻辑
  return { intent, emotion, topics };
}

async function routeToAgent(classification: Classification, message: string) {
  // 路由逻辑
}

async function processMessage(message: string) {
  const classification = await classifyMessage(message);
  return routeToAgent(classification, message);
}
```

**收益**: 职责分离，易于测试，可复用

#### 2. 提取配置常量 (中优先级)

**问题**: 魔法数字散落在代码中

**Before**:

```typescript
if (messages.length > 10) { ... }
const timeout = 30000;
```

**After**:

```typescript
// config.ts
export const ORCHESTRATOR_CONFIG = {
  MAX_CONTEXT_MESSAGES: 10,
  API_TIMEOUT_MS: 30000,
};
```

### ⚠️ 注意事项

1. `processMessage` 被 3 个 API route 调用，重构后需要更新调用方
2. 添加测试覆盖后再进行重构
3. 分步提交，每个重构一个 commit

```

```
