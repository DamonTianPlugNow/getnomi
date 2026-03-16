# Nomi API 接口规范

## 认证

所有 API 请求需要携带 Supabase Auth Session Cookie。未认证请求返回 `401 Unauthorized`。

## Profile APIs

### GET /api/profile

获取当前用户的 Profile。

**Response 200:**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "display_name": "string",
  "avatar_url": "string | null",
  "bio": "string | null",
  "is_active": "boolean",
  "onboarding_completed": "boolean",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "agent_profiles": [
    {
      "agent_type": "emotional | persona | style",
      "content": "object"
    }
  ]
}
```

**Response 404:** Profile 不存在

---

### POST /api/profile

创建新 Profile（Onboarding 完成时调用）。

**Request Body:**

```json
{
  "display_name": "string",
  "avatar_url": "string | null"
}
```

**Response 201:** 创建成功，返回 Profile 对象

**Response 409:** Profile 已存在

---

### PUT /api/profile

更新 Profile。

**Request Body:**

```json
{
  "display_name": "string | undefined",
  "bio": "string | undefined",
  "is_active": "boolean | undefined"
}
```

**Response 200:** 更新成功，返回 Profile 对象

---

### GET /api/profile/export

导出 Profile 为 Markdown 文件。

**Response 200:**

```
Content-Type: text/markdown
Content-Disposition: attachment; filename="{display_name}.md"

# {display_name} 的个人档案
...
```

---

## Chat APIs

### POST /api/chat/onboarding

Onboarding AI 对话接口（Streaming）。

**Request Body:**

```json
{
  "message": "string",
  "conversation_id": "string | undefined"
}
```

**Response 200:** Server-Sent Events (SSE)

```
data: {"type": "text", "content": "..."}
data: {"type": "memory", "category": "...", "content": "..."}
data: {"type": "done", "conversation_id": "..."}
```

---

## Match APIs

### GET /api/match

获取当前用户的匹配列表。

**Query Parameters:**

- `status`: `pending | approved | rejected | expired` (可选)

**Response 200:**

```json
{
  "matches": [
    {
      "id": "uuid",
      "other_profile": {
        "id": "uuid",
        "display_name": "string",
        "avatar_url": "string | null",
        "bio": "string | null"
      },
      "score": "number (0-1)",
      "reason": "string",
      "status": "string",
      "my_approval": "boolean | null",
      "expires_at": "ISO8601",
      "created_at": "ISO8601"
    }
  ]
}
```

---

### POST /api/match

批准或拒绝匹配。

**Request Body:**

```json
{
  "match_id": "uuid",
  "action": "approve | reject"
}
```

**Response 200:**

```json
{
  "match": { ... },
  "meeting_created": "boolean"
}
```

---

## Meeting APIs

### GET /api/meeting

获取会议列表。

**Query Parameters:**

- `status`: `scheduling | scheduled | completed | cancelled` (可选)

**Response 200:**

```json
{
  "meetings": [
    {
      "id": "uuid",
      "match_id": "uuid",
      "other_profile": { ... },
      "zoom_join_url": "string | null",
      "scheduled_at": "ISO8601 | null",
      "duration_minutes": "number",
      "status": "string",
      "brief": "object | null"
    }
  ]
}
```

---

### POST /api/meeting

提交时间偏好。

**Request Body:**

```json
{
  "meeting_id": "uuid",
  "available_slots": [
    {
      "start": "ISO8601",
      "end": "ISO8601"
    }
  ]
}
```

**Response 200:** 更新成功

---

### PUT /api/meeting

提交会议反馈。

**Request Body:**

```json
{
  "meeting_id": "uuid",
  "rating": "number (1-5)",
  "feedback": "string | undefined",
  "would_meet_again": "boolean"
}
```

**Response 200:** 反馈已保存

---

## 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### 常见错误码

| Code               | HTTP Status | Description            |
| ------------------ | ----------- | ---------------------- |
| `UNAUTHORIZED`     | 401         | 未登录或 session 过期  |
| `FORBIDDEN`        | 403         | 无权访问该资源         |
| `NOT_FOUND`        | 404         | 资源不存在             |
| `VALIDATION_ERROR` | 400         | 请求参数验证失败       |
| `CONFLICT`         | 409         | 资源冲突（如重复创建） |
| `RATE_LIMITED`     | 429         | 请求过于频繁           |
| `INTERNAL_ERROR`   | 500         | 服务器内部错误         |

---

## Rate Limiting

- AI Chat 接口: 10 requests/minute
- 其他 API: 60 requests/minute
- 超限返回 `429 Too Many Requests`

---

## Webhook Events (Inngest)

### profile/created

Profile 创建完成时触发。

```json
{
  "name": "profile/created",
  "data": {
    "profile_id": "uuid"
  }
}
```

### match/confirmed

双方都批准匹配时触发。

```json
{
  "name": "match/confirmed",
  "data": {
    "match_id": "uuid"
  }
}
```

### meeting/scheduled

会议时间确定时触发。

```json
{
  "name": "meeting/scheduled",
  "data": {
    "meeting_id": "uuid"
  }
}
```
