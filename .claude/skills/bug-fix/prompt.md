# Bug Fix Skill

分析 bug 并提供修复方案。

## 使用方法

```
/bug-fix <description>
/bug-fix 用户登录后跳转到空白页
/bug-fix "TypeError: Cannot read property 'id' of undefined"
```

## 调试流程

### 1. 复现问题

- 确认复现步骤
- 确认环境（开发/生产）
- 收集错误信息

### 2. 定位原因

- 分析错误堆栈
- 检查相关代码
- 查看日志
- 检查数据状态

### 3. 制定方案

- 确定根本原因
- 评估影响范围
- 设计修复方案

### 4. 验证修复

- 编写测试用例
- 本地验证
- 回归测试

## 常见 Bug 类型

### 类型错误

```typescript
// 问题: 访问可能为 undefined 的属性
const name = user.profile.name; // TypeError

// 修复: 可选链 + 默认值
const name = user?.profile?.name ?? "Unknown";
```

### 异步问题

```typescript
// 问题: 未等待异步操作
function loadData() {
  const data = fetchData(); // Promise, not data
  return data.items; // undefined
}

// 修复: 正确处理 Promise
async function loadData() {
  const data = await fetchData();
  return data.items;
}
```

### 状态问题

```typescript
// 问题: 闭包捕获旧值
useEffect(() => {
  const timer = setInterval(() => {
    console.log(count); // 始终是初始值
  }, 1000);
  return () => clearInterval(timer);
}, []); // 缺少依赖

// 修复: 添加依赖或使用 ref
useEffect(() => {
  const timer = setInterval(() => {
    console.log(count);
  }, 1000);
  return () => clearInterval(timer);
}, [count]);
```

### 认证问题

```typescript
// 问题: 未检查用户登录状态
export async function GET(request: Request) {
  const profile = await getProfile(userId); // userId 可能为空
}

// 修复: 添加认证检查
export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const profile = await getProfile(session.user.id);
}
```

## 输出格式

### 🔍 问题分析

描述 bug 的表现和可能原因。

### 🎯 根本原因

确定的根本原因和相关代码位置。

### 💡 修复方案

具体的修复代码和步骤。

### ✅ 验证方法

如何验证 bug 已修复。

## 示例输出

````markdown
## Bug Fix: 用户登录后跳转到空白页

### 🔍 问题分析

**表现**: 用户通过 Google OAuth 登录后，页面跳转到 `/dashboard` 但显示空白

**可能原因**:

1. Session 未正确设置
2. Dashboard 页面加载错误
3. 重定向逻辑问题

### 🎯 根本原因

**位置**: `src/middleware.ts:45`

**原因**: Middleware 在 OAuth callback 完成前就进行了重定向检查，此时 session 尚未写入 cookie。

```typescript
// 问题代码
if (!session && isProtectedRoute) {
  return NextResponse.redirect("/login");
}
```
````

### 💡 修复方案

**方案**: 排除 auth callback 路由的检查

```typescript
// src/middleware.ts
const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/callback");

if (!session && isProtectedRoute && !isAuthCallback) {
  return NextResponse.redirect("/login");
}
```

### ✅ 验证方法

1. 清除浏览器 cookies
2. 访问 `/login`
3. 点击 "Google 登录"
4. 验证成功跳转到 `/dashboard` 并显示用户信息
5. 刷新页面，确认 session 保持

```

```
