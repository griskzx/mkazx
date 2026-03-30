# 🛡️ mkazx Vault

**mkazx Vault** 是一款基于 [Tauri](https://tauri.app/) 和 [React](https://reactjs.org/) 构建的现代化、跨平台、**纯本地运行**的安全密码管理器。

它完全隔绝了云端同步引发的任何潜在隐私泄露风险，并将企业级最高级别的 `AES-256-GCM` 加密算法与美观的毛玻璃暗黑材质（Glassmorphism） UI 设计带到您的个人电脑上。

---

## ✨ 核心特性 / Features

- 🔒 **纯本地、零遥测 (Air-gapped & Offline-first)** 
  没有任何的网络请求、没有任何的云端依赖。所有的凭证数据只存在于您计算机本地的一份高强度加密的只读文件（`vault.dat`）中。
  
- 🔑 **军事级加密算法 (Military-Grade Encryption)** 
  使用强大的 `Argon2` 进行主密码（Master Password）的密钥派生，抵御彩虹表和暴力破解；并在底层用 `AES-256-GCM` 算法封装所有凭证数据。

- ⚡️ **全内存毫秒级检索 (Instant Memory Search)** 
  无需漫长的磁盘 IO 读取时间。只需输入哪怕一个字母，所有的账号、网址均会在极速的响应下被实时过滤和检索。

- 🎨 **现代化深色模式 (Glassmorphism Dark UI)**
  精心设计的原生毛玻璃视觉隐喻，拥有流畅的动画交互、深色护眼模式、全自定义界面弹出层以及自适应窄屏。

- 🎲 **内嵌复杂密码生成器 (Password Generator)**
  自带随机强密码生成引擎，支持细粒度的自定义长度以及包含各种类型字符（大写、小写、数字、特殊符号），可在“点击新建密码”时无缝填充。

---

## 🛠 技术栈 / Tech Stack

- **前端架构 (Frontend)**
  - `React` (Vite)
  - `TypeScript`
  - 零样板纯粹的 `Vanilla CSS`
  - `lucide-react` 系列化矢量图标库
  - **基于模块化的组件驱动**，将复杂的渲染逻辑解耦为多个无状态视图模型。

- **后端架构 (Backend - Rust)**
  - `Tauri` (IPC 桥接通信)
  - `aes-gcm` & `argon2` (核心加解密)
  - `postcard` & `serde_json` (极致性能的高效序列化)

---

## 🚀 快速启动 / Getting Started

在本地开发及运行本应用，请确保您已经安装了 [Node.js](https://nodejs.org/) (推荐使用 `pnpm`) 以及 [Rust 环境](https://www.rust-lang.org/tools/install)。

### 1. 安装项目依赖
```bash
pnpm install
```

### 2. 本地开发与调试
启动含热重载的桌面测试应用客户端：
```bash
pnpm tauri dev
```

### 3. 构建发布应用
当您打算自己打包一个 Windows/Mac/Linux 客户端：
```bash
pnpm tauri build
```
编译产物将会位于 `src-tauri/target/release/bundle/` 中。

---

## 💡 使用说明

1. 第一次打开软件时，在安全的初始化界面设定**不少于 8 位**的独立主密码。此密码即所有加密的原始金钥，请务必将其记在脑子里或备份好，**如果不慎遗失主密码将永远无法找回您的任何账号！**
2. 登录界面的右上角支持直接生成一个强密码。
3. 您可以自由创建、编辑和对过期的密码进行删除；可以对过长的备注通过点击进行详细查看。如果缩小窗口，应用会自动采用自适应排版。
4. 退出前请务必点击左下方的 **“锁定并退出”** 销毁运行时内存。

---

## 📄 许可证 (License)

本项目仅用于用户个人的信息保护和管理。保留所有最终解释权。
