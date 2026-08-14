# 2603班主任工作台 v2.1

面向 **2603班 / 易老师** 的班级管理平台。前端继续使用 GitHub Pages 免费部署，数据端使用 Supabase。视觉风格保持原版，功能层已经从“演示按钮”升级为可实际操作。

## 现在已经能用的功能

- 工作台：今日待办、班级动态、常规工作、特色工作
- 今日考勤：38人名单导入后，可逐人登记正常 / 迟到 / 请假 / 缺勤
- 花名册：新增、编辑、删除、搜索、CSV 导入导出
- 学生档案：考勤统计、家长信息、关联成长/管理记录
- 座次表：随机排座、点击两个座位交换、保存
- 值日表：可编辑并保存
- 班委：可从学生名单中指定
- 家长联系方式：逐学生录入、编辑、导出 CSV
- 课程表：当前留空，9月1日前后可直接录入
- 工作记录：课堂纪律、作业、巡查、班会、家校沟通、学生成长、班级活动
- 数据中心：完整 JSON 备份、恢复备份、导入学生、导出花名册、隐私模式、云端同步
- 登录：Supabase 邮箱 + 密码
- 云端：每 30 秒自动拉取最新数据，切回网页也会同步
- 手机：响应式布局 + PWA，可“添加到主屏幕”

## 重要：GitHub 与 Supabase 的关系

Supabase **不会因为连接了你的 GitHub 账号就自动读取网页源码**。

正确结构是：

```text
GitHub Pages（网页）
        ↓ HTTPS API
Supabase（登录 + PostgreSQL 数据库）
```

你只需要把本文件夹里的网页文件上传 GitHub；Supabase 负责数据库。

---

## 0 → 1 部署步骤

### 1. GitHub Pages

把本文件夹根目录内容上传到你的 GitHub 仓库：

```text
index.html
styles.css
app.js
config.js
manifest.webmanifest
sw.js
assets/
templates/
```

`supabase/` 文件夹可以一起上传，因为其中只有数据库结构，不含真实学生数据。

然后在仓库：

**设置 → 页面 → 从分支部署 → main → /(root)**

### 2. Supabase 创建数据库结构

登录：

https://supabase.com/dashboard/sign-in

项目列表：

https://supabase.com/dashboard/projects

进入你的项目后，地址栏会是：

```text
https://supabase.com/dashboard/project/PROJECT_REF
```

把 `PROJECT_REF` 换成你的项目编号后，可直达：

- SQL 编辑器：`https://supabase.com/dashboard/project/PROJECT_REF/sql`
- 用户管理：`https://supabase.com/dashboard/project/PROJECT_REF/auth/users`
- API 密钥：`https://supabase.com/dashboard/project/PROJECT_REF/settings/api-keys`

打开 `supabase/01_schema.sql`，复制全部 SQL 到 SQL 编辑器执行一次。

### 3. 创建易老师的登录账号

打开：

```text
https://supabase.com/dashboard/project/PROJECT_REF/auth/users
```

在用户管理中创建一个邮箱 + 密码账号。正式使用时建议只由管理员创建账号，不公开自助注册。

### 4. 获取 Project URL 和 Publishable key

打开：

```text
https://supabase.com/dashboard/project/PROJECT_REF/settings/api-keys
```

只需要两项：

- Project URL，例如 `https://xxxx.supabase.co`
- **Publishable key**，例如 `sb_publishable_...`

绝对不要把 Secret key / service_role key 放进 GitHub 或网页。

### 5. 连接工作台

有两种方法。

**方法 A（手机最方便）**：先打开已经部署的网站 → 点击左下角易老师旁的 `•••` → **数据管理** → 填 Project URL 和 Publishable key → **测试并保存到本机**。确认能登录后，点 **下载 config.js**，再把下载的 `config.js` 替换 GitHub 仓库中的同名文件。这样其他设备也自动连接同一个数据库。

**方法 B**：直接编辑 `config.js`：

```js
SUPABASE_URL: 'https://xxxx.supabase.co',
SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_xxxxx',
```

上传 GitHub 后等待 Pages 更新。

### 6. 第一次登录

刷新工作台，会看到登录页。使用第 3 步创建的邮箱和密码登录。

第一次登录后网页会自动创建 `2603班` 的班级记录，并把这个班级归属于当前登录账号。

### 7. 导入真实学生名单

**真实名单不要放进公开 GitHub 仓库。**

使用随本次交付单独提供的 `2603班学生名单-私有.csv`：

工作台 → `•••` → **数据管理** → **导入学生** → 选择 CSV → 确认。

导入后数据直接写到 Supabase，其他已登录设备会同步看到。

---

## 当前学期状态

当前处于学前教育阶段；下周进行初中知识复习衔接；正式高中课程自 **9月1日** 起衔接。课程表页面因此默认保持空白，学校正式排课后再录入，不使用虚构课程。

## 隐私与安全

1. 真实学生名单不写入公开 GitHub 源码。
2. 浏览器只使用 Publishable key；数据库开启了 RLS。
3. Secret key / service_role key 永远不要放进网页。
4. 投屏前建议开启“隐私模式”。
5. 建议定期使用“完整备份”下载 JSON 到自己的设备。

## 数据库表

- `classes` 班级
- `students` 学生
- `attendance` 考勤
- `tasks` 待办
- `activity_logs` 操作动态
- `committee` 班委
- `parents` 家长信息
- `timetable` 课程表
- `duty_assignments` 值日
- `work_records` 班级工作 / 成长记录
- `seating` 座次

## 出问题时先看这里

### 登录失败

确认邮箱密码是 Supabase Authentication 中创建的账号，并确认 `config.js` 使用的是 Publishable key。

### 显示“同步失败 / relation does not exist”

说明还没有运行 `supabase/01_schema.sql`。

### 403 / permission denied

通常是 RLS 或登录状态问题。先退出重新登录；如果刚建数据库，重新运行一遍 `01_schema.sql`。

### GitHub Pages 404

确认 `index.html` 在仓库最外层，并且 Pages 选择 main + `/(root)`。
