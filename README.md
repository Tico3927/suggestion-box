# 📮 意见箱

一个免费、匿名、全功能的意见箱网站。纯静态前端 + Supabase 后端，部署到 Cloudflare Pages。

## ✨ 功能

- **匿名提交** — 用户可选择匿名，保护隐私
- **分类管理** — 教学 / 生活 / 管理 / 其他
- **管理后台** — 密码保护，查看、筛选、搜索所有意见
- **状态跟踪** — 待处理 → 已读 → 已回复 → 归档
- **回复功能** — 管理员可回复意见，自动邮件通知用户
- **分页 / 搜索 / 筛选** — 按分类、状态、关键词筛选
- **CSV 导出** — 一键导出所有意见数据
- **响应式设计** — 手机 / 平板 / 桌面端完美适配

## 🏗️ 技术栈

| 层级 | 技术 | 免费额度 |
|------|------|----------|
| 前端 | HTML + Tailwind CSS + Vanilla JS | Cloudflare Pages 无限带宽 |
| 后端 | Supabase Edge Functions (Deno) | 每月 50 万次调用 |
| 数据库 | Supabase PostgreSQL | 500MB 存储 |
| 邮件 | Resend（可选） | 每天 100 封 |

## 🚀 部署步骤

### 第一步：创建 Supabase 项目

1. 打开 [supabase.com](https://supabase.com) 注册/登录
2. 点击 **New project**，填写项目名称（如 `suggestion-box`）
3. 设置数据库密码（记下来，后面要用）
4. 选择离你最近的区域（如 `ap-southeast-1` 新加坡）
5. 点击 **Create project**，等待 2 分钟

### 第二步：部署数据库 Schema

1. 在 Supabase Dashboard 左侧点击 **SQL Editor**
2. 点击 **New query**
3. 复制 `schema.sql` 的全部内容粘贴进去
4. 点击右下角 **Run** 执行
5. 左侧 **Table Editor** 应该能看到 `suggestions`、`replies`、`admin_sessions` 三张表

### 第三步：部署 Edge Functions

> 需要安装 Supabase CLI。在终端执行以下命令：

```bash
# 安装 Supabase CLI（如果还没装）
npm install -g supabase

# 登录
supabase login

# 进入项目目录
cd suggestion-box

# 关联你的 Supabase 项目
supabase link --project-ref YOUR_PROJECT_REF
# 项目引用在 Supabase Dashboard 的 Settings → General 里找到

# 设置环境变量（密码 + 邮件）
supabase secrets set ADMIN_PASSWORD=你的管理密码
supabase secrets set RESEND_API_KEY=re_xxx  # 可选，用于邮件通知
supabase secrets set FROM_EMAIL=你的发送邮箱  # 可选

# 部署 Edge Functions
supabase functions deploy admin-api
supabase functions deploy send-notification
```

### 第四步：部署前端到 Cloudflare Pages

1. 把 `suggestion-box` 文件夹上传到 GitHub 仓库
2. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com)
3. 左侧点击 **Workers & Pages** → **Pages** → **Create a project**
4. 选择 **Connect to Git**，选择你的 GitHub 仓库
5. 构建设置：
   - **Build command**: 留空（纯静态文件）
   - **Build output directory**: `.`（根目录）
6. 点击 **Save and Deploy**

### 第五步：配置前端

部署成功后，修改 `index.html` 和 `admin.html` 中的 Supabase 配置：

```javascript
// 在 index.html 和 admin.html 中找到这两行，替换为你的值
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';
```

> Supabase URL 和 anon key 在 Supabase Dashboard → Settings → API 中获取。

修改后重新推送到 GitHub，Cloudflare Pages 会自动重新部署。

### 第六步（可选）：配置邮件通知

1. 在 [resend.com](https://resend.com) 注册，获取 API key
2. 在 Supabase Dashboard → Settings → Edge Functions 中设置 secrets：
   - `RESEND_API_KEY`: 你的 Resend API key
   - `FROM_EMAIL`: 你的发送邮箱（需要在 Resend 中验证域名）
3. 重新部署 Edge Function：
   ```bash
   supabase functions deploy send-notification
   ```

## 🔑 使用说明

### 访问管理后台

1. 打开 `https://你的域名/admin.html`
2. 输入你在第三步设置的管理密码
3. 进入管理后台

### 管理意见

| 操作 | 说明 |
|------|------|
| 查看详情 | 点击列表中的意见行或「查看」按钮 |
| 更改状态 | 在详情弹窗中选择状态（待处理/已读/已回复/归档） |
| 回复意见 | 在详情弹窗底部输入回复内容并发送 |
| 搜索筛选 | 使用顶部的搜索框和下拉菜单 |
| 导出 CSV | 点击右上角「导出 CSV」按钮 |

## 📁 项目结构

```
suggestion-box/
├── index.html                 # 公共提交页面
├── admin.html                 # 管理后台
├── schema.sql                 # 数据库 Schema
├── README.md                  # 本文档
└── supabase/
    └── functions/
        ├── admin-api/
        │   └── index.ts       # 管理 API（verify/list/get/update/reply/export）
        └── send-notification/
            └── index.ts       # 邮件通知
```

## 💰 费用

完全免费：

| 服务 | 免费额度 | 够用吗 |
|------|----------|--------|
| Cloudflare Pages | 无限带宽 | ✅ |
| Supabase 数据库 | 500MB | ✅（约 10 万条意见） |
| Supabase Edge Functions | 50 万次/月 | ✅ |
| Resend 邮件 | 100 封/天 | ✅ |

## ❓ 常见问题

**Q: 怎么修改管理密码？**
A: 在 Supabase Dashboard 中重新设置 `ADMIN_PASSWORD` secret，然后重新部署 `admin-api`。

**Q: 用户怎么知道自己的意见被回复了？**
A: 如果用户提交时填写了邮箱且未勾选匿名，管理员回复后会自动发送邮件通知。

**Q: 能不能不显示邮箱给管理员？**
A: 匿名提交时不会存储邮箱；非匿名提交时邮箱对管理员可见，用于回复通知。

**Q: 怎么防止恶意提交？**
A: 可以在 Cloudflare Pages 中开启 Turnstile 验证，或添加提交频率限制。