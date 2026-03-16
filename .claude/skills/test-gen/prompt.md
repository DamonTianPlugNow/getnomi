# Test Generation Skill

为指定代码生成单元测试。

## 使用方法

```
/test-gen <file_path>
/test-gen src/lib/ai/classifier.ts
```

## 测试框架

- 测试框架: Vitest
- 断言库: Vitest 内置
- Mock: vi.mock, vi.fn

## 测试原则

### 1. 测试结构

- 使用 `describe` 组织测试套件
- 使用 `it` 或 `test` 描述具体行为
- 测试描述使用中文，清晰表达预期

### 2. 测试覆盖

- 正常路径 (Happy Path)
- 边界条件 (Edge Cases)
- 错误处理 (Error Cases)
- 异步操作

### 3. Mock 策略

- 外部 API 调用必须 Mock
- 数据库操作使用 Mock 或测试数据库
- 时间相关使用 `vi.useFakeTimers()`

### 4. 项目特定

- AI 相关函数 Mock Claude/OpenAI 响应
- Supabase 操作 Mock `@supabase/supabase-js`
- Inngest 函数使用 `inngest/test` 工具

## 输出格式

生成完整的测试文件，放在同目录下，命名为 `{filename}.test.ts`。

## 示例输出

```typescript
// src/lib/ai/classifier.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { classifyIntent, detectEmotion } from "./classifier";
import { createClient } from "@/lib/ai/claude";

// Mock Claude client
vi.mock("@/lib/ai/claude", () => ({
  createClient: vi.fn(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

describe("Classifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("classifyIntent", () => {
    it("应该正确识别问题类型的输入", async () => {
      const mockResponse = {
        content: [{ type: "text", text: '{"intent": "question"}' }],
      };
      vi.mocked(createClient().messages.create).mockResolvedValue(mockResponse);

      const result = await classifyIntent("你是谁？");

      expect(result.intent).toBe("question");
    });

    it("应该正确识别陈述类型的输入", async () => {
      const mockResponse = {
        content: [{ type: "text", text: '{"intent": "statement"}' }],
      };
      vi.mocked(createClient().messages.create).mockResolvedValue(mockResponse);

      const result = await classifyIntent("我喜欢读书");

      expect(result.intent).toBe("statement");
    });

    it("当 API 调用失败时应该抛出错误", async () => {
      vi.mocked(createClient().messages.create).mockRejectedValue(
        new Error("API Error"),
      );

      await expect(classifyIntent("test")).rejects.toThrow("API Error");
    });
  });

  describe("detectEmotion", () => {
    it("应该检测积极情绪", async () => {
      const mockResponse = {
        content: [
          { type: "text", text: '{"emotion": "positive", "confidence": 0.9}' },
        ],
      };
      vi.mocked(createClient().messages.create).mockResolvedValue(mockResponse);

      const result = await detectEmotion("今天心情很好！");

      expect(result.emotion).toBe("positive");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("应该处理空输入", async () => {
      const result = await detectEmotion("");

      expect(result.emotion).toBe("neutral");
    });
  });
});
```

## 测试命令

```bash
# 运行所有测试
pnpm test

# 运行特定文件
pnpm test src/lib/ai/classifier.test.ts

# 运行并查看覆盖率
pnpm test --coverage

# 监听模式
pnpm test --watch
```
