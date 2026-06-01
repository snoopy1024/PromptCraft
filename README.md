<h1 align="center">PromptCraft</h1>

<p align="center">一个运行在本地的 DeepSeek Playground，保护你的 Key 和 Prompt 不被泄露。</p>

<p align="center"><strong>项目持续更新中...</strong></p>

---

### 为什么做这个产品？

我的业务里主要使用 DeepSeek 的模型，在开发过程中会有很多模型测试工作，因此需要一个好用的 Playground 来测试新模型的效果。

其他 DeepSeek 模型托管平台（Openrouter、硅基流动、阿里云）提供的 Playground 很不好用：

- 不支持自定义 Key
- 模型参数没有适配（例如：V4 模型只支持 High、Max）
- 模型部署疑似掺水（我只用 DeepSeek 官网渠道）

因此开发了一个运行在本地的 Playground 来调试 DeepSeek 官网渠道的模型效果，同时可以保证 Key、Prompt 不会被泄露。

当前只设计了 Chatbot 形态，对该产品未来的期望是：一个运行在本地的 Prompt 开发平台，辅助我高效设计 Prompt 来服务业务。

---

PromptCraft 是一个轻量的全栈 Web 应用。前端使用 React 与 Vite，后端使用 Express 作为本地 API 代理；API Key 保存在本机 `.env` 文件中，对话记录保存在本机 `server/data` 目录中，不需要数据库。

## 功能特性

- DeepSeek V4-Flash / V4-Pro 模型切换
- 思考模式开关与推理强度选择
- 温度、Top P、最大输出 Token 等参数调节
- 流式输出、思考过程展示、停止生成、重试回答
- Markdown、代码高亮、表格、数学公式渲染
- 对话式 / 三段式双视图，可在同一份对话数据上切换查看
- 对话本地保存、重命名、删除与继续编辑
- Token 数、速度、耗时与费用估算展示
- 本地设置页保存和检测 DeepSeek API Key

## 三段式视图

除了传统的对话式列表，PromptCraft 还提供三段式视图，用来并排对照同一次请求中的输入 Prompt、模型思考过程和最终输出。

- 顶部右侧可以在“对话式”和“三段式”之间切换。
- 对话式中的每条用户输入下方都有三段式入口，可以直接从指定输入进入三段式。
- 三段式会把窗口横向分成输入、思考、输出三栏，三栏内容独立滚动，标题栏和底部统计栏固定。
- 输入栏可以编辑当前 Prompt，并支持用上下按钮在历史输入之间切换；向下切到最后会进入新输入。
- 三栏底部常驻显示对应的模型、Token、速度、费用和耗时等信息，统计数据与对话式保持一致。

三段式不是另一套数据结构，而是同一份对话记录的另一种呈现方式。你可以在对话式里连续调试，也可以切到三段式里逐条对照输入、推理和输出结果。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 19, Vite, TypeScript, Tailwind CSS |
| 状态管理 | Zustand |
| Markdown | react-markdown, remark-gfm, remark-math, rehype-katex, rehype-highlight |
| 后端 | Node.js, Express, OpenAI SDK |
| 数据存储 | 本地 JSON 文件 |

## 环境要求

- Node.js 20 或更高版本
- npm 9 或更高版本
- DeepSeek API Key

可以用下面的命令检查本机版本：

```bash
node --version
npm --version
```

## 快速开始

克隆项目并安装依赖：

```bash
git clone <your-repo-url>
cd PromptCraft
npm install
```

创建本地环境变量文件：

```bash
cp .env.example .env
```

Windows PowerShell 可以使用：

```powershell
Copy-Item .env.example .env
```

打开 `.env`，填入你的 DeepSeek API Key：

```bash
DEEPSEEK_API_KEY=sk-your-api-key
PORT=3001
CORS_ORIGIN=
```

也可以先不手动填写，启动后在应用左下角的“设置”里粘贴并保存 API Key。

启动开发环境：

```bash
npm run dev
```

访问：

```text
http://localhost:3000
```

开发模式下，Vite 前端运行在 `3000` 端口，本地 API 服务运行在 `3001` 端口。

## 生产运行

先构建前端：

```bash
npm run build
```

再启动本地生产服务：

```bash
npm start
```

访问：

```text
http://localhost:3001
```

`npm start` 会使用 Express 同时提供 API 与打包后的前端静态文件，适合在本机或受信任的内网环境运行。

## 常用脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 同时启动前端开发服务器和后端 API 服务 |
| `npm run dev:client` | 只启动 Vite 前端开发服务器 |
| `npm run dev:server` | 只启动 Express API 服务，并监听后端代码变化 |
| `npm run typecheck` | 执行 TypeScript 类型检查 |
| `npm run build` | 类型检查并构建生产版本 |
| `npm start` | 启动生产服务，托管 `dist` 与 API |

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `DEEPSEEK_API_KEY` | 是 | 无 | DeepSeek API Key。也可以通过应用设置页写入 |
| `PORT` | 否 | `3001` | 后端服务端口 |
| `CORS_ORIGIN` | 否 | 空 | 额外允许的跨域来源，多个来源用英文逗号分隔 |

默认情况下，本地回环地址会被允许跨域访问，例如 `localhost`、`127.0.0.1` 和 `[::1]`。如果需要让其他前端来源访问本地 API，可以设置 `CORS_ORIGIN`：

```bash
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

## 项目结构

```text
PromptCraft/
├── server/                 # Express 本地 API 服务
│   ├── index.ts            # 服务入口、CORS、静态文件托管
│   └── routes/             # chat、settings、conversations 路由
├── src/                    # React 前端
│   ├── components/         # 页面组件与弹窗
│   ├── hooks/              # 对话请求与流式读取逻辑
│   ├── store/              # Zustand 状态管理
│   ├── styles/             # 全局样式
│   └── utils/              # Token、费用、速度等统计工具
├── .env.example            # 环境变量模板
├── package.json            # 脚本与依赖
└── vite.config.ts          # Vite 配置与开发代理
```

运行后会生成这些本地文件或目录：

```text
.env                         # 本地 API Key，不应提交到仓库
server/data/                 # 本地对话记录，不应提交到仓库
dist/                        # 生产构建产物，不应提交到仓库
```

## 数据与安全说明

- API Key 只保存在本机 `.env` 文件中，并由本地后端转发请求。
- 对话记录以 JSON 文件形式保存在 `server/data`，默认不会提交到 Git。
- 项目默认面向本地使用，没有内置账号体系、权限控制或审计能力。
- 不建议直接把该服务暴露到公网。若要部署到公网，请先补充登录认证、HTTPS、密钥托管、请求限流和更严格的 CORS 策略。

## 常见问题

### 启动后提示未配置 API Key

检查 `.env` 是否存在，并确认 `DEEPSEEK_API_KEY` 已填写。你也可以在应用设置页保存 API Key，保存后会自动写入 `.env`。

### 端口被占用

开发模式默认使用 `3000` 和 `3001`。如果 `3001` 被占用，可以在 `.env` 中修改：

```bash
PORT=3002
```

如果修改了后端端口，同时需要调整 `vite.config.ts` 里的代理目标。

### Windows 上无法使用 `cp`

使用 PowerShell 的 `Copy-Item`：

```powershell
Copy-Item .env.example .env
```

### 构建成功但页面无法访问

确认已经先执行：

```bash
npm run build
```

然后再执行：

```bash
npm start
```

生产模式访问的是 `http://localhost:3001`，不是开发模式的 `3000` 端口。

## 贡献

欢迎提交 Issue 和 Pull Request。建议在提交前先运行：

```bash
npm run typecheck
npm run build
```

请不要提交 `.env`、`server/data`、`dist` 或任何包含真实 API Key 的文件。

## 许可证

本项目使用 MIT License，详见 [LICENSE](./LICENSE)。
