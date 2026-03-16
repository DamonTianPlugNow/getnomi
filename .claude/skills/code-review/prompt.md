# Code Review Skill

审查代码质量、安全性和最佳实践。

## 使用方法

```
/code-review <file_path>
/code-review src/lib/ai/orchestrator.ts
```

## 检查清单

### 1. 类型安全

- [ ] 避免使用 `any` 类型
- [ ] 正确处理 `null` 和 `undefined`
- [ ] 函数参数和返回值有明确类型
- [ ] 使用 Zod 验证外部数据

### 2. 错误处理

- [ ] try-catch 覆盖可能失败的操作
- [ ] 错误信息有意义，便于调试
- [ ] 不吞掉错误（silent catch）
- [ ] API 返回适当的错误状态码

### 3. 安全漏洞 (OWASP Top 10)

- [ ] SQL 注入：使用参数化查询
- [ ] XSS：转义用户输入
- [ ] CSRF：验证请求来源
- [ ] 敏感数据：不在日志中暴露
- [ ] 认证：检查用户权限

### 4. 性能问题

- [ ] 避免 N+1 查询
- [ ] 大数据集使用分页
- [ ] 适当使用缓存
- [ ] 避免不必要的重渲染

### 5. 代码规范

- [ ] 命名清晰有意义
- [ ] 函数职责单一
- [ ] 避免过深嵌套
- [ ] 删除无用代码和注释

### 6. 项目特定

- [ ] Server/Client Component 使用正确
- [ ] Supabase RLS 策略覆盖
- [ ] AI Prompt 中用户输入已隔离
- [ ] Inngest 任务有重试配置

## 输出格式

### 🔴 严重问题 (必须修复)

安全漏洞、数据丢失风险、崩溃 bug

### 🟡 建议改进 (推荐修复)

性能问题、代码可读性、潜在 bug

### 🟢 优点

代码中做得好的地方，值得保持

## 示例输出

````markdown
## Code Review: src/lib/ai/orchestrator.ts

### 🔴 严重问题

1. **SQL 注入风险** (L45)

   ```typescript
   // 问题代码
   const result = await db.query(`SELECT * FROM users WHERE id = '${userId}'`);

   // 建议修复
   const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
   ```
````

### 🟡 建议改进

1. **缺少错误处理** (L78-82)
   `generateResponse` 函数没有 try-catch，API 调用失败会导致未处理异常。

2. **类型不明确** (L23)
   `options` 参数使用了 `any` 类型，建议定义具体接口。

### 🟢 优点

1. 函数职责划分清晰，易于测试
2. 用户输入正确使用 XML 标签隔离
3. 日志记录完整，便于调试

```

```
