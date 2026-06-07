# MDoCards

基于 Markdown 卡片与节点连线的可视化文档编辑器（灵感来自 Blender 节点图 + Typora 实时预览）。

## 功能

- **卡片（Card）**：圆角矩形窗体，可拖拽标题栏移动、边缘调整大小
- **Markdown 实时渲染**：标题、列表、引用、代码块、公式、加粗/斜体/删除线/下划线（HTML `<u>`）
- **节点端口**：
  - 每张卡片默认有 **prev**（暗黄）和 **next**（亮绿）端口
  - 列表每一项默认只有 **next** 端口
  - 其他段落默认无端口，**右键**可开启 prev/next
- **连线**：从绿色 **next** 拖到黄色 **prev** 建立结构边
- **画布**：滚轮缩放、中键或空格+拖拽平移
- **持久化**：自动保存到 localStorage

## 开发

### 桌面应用（Electron）

```bash
npm install
npm run dev
```

会启动 Vite 开发服务器并自动打开 MDoCards 桌面窗口。

### 仅浏览器调试

```bash
npm run dev:web
```

打开 http://localhost:5173/

## 构建

### 桌面安装包

图标由 `public/favicon.svg` 自动生成（`npm run icons` → `build/icon.ico`）。

```bash
npm run dist
```

Windows 安装包输出在 `release/` 目录：

```bash
npm run dist:win
```

产物示例：
- `release/MDoCards-0.1.0-win-x64.exe` — Windows NSIS 安装程序
- `release/win-unpacked/MDoCards.exe` — Windows 免安装绿色版
- `release/MDoCards-0.1.0-mac-<arch>.dmg` — macOS 安装镜像（需在 macOS 上打包）

macOS DMG：

```bash
npm run dist:mac
```

> 说明：DMG 必须在 **macOS** 上打包（Windows 无法交叉编译）。产物输出到 `release/*.dmg`。
>
> **Mac 打包注意：**
> - 不要把项目放在 **iCloud 云盘目录**（`Mobile Documents/com~apple~CloudDocs/...`），否则 `node_modules/.bin` 可能丢失可执行权限。请放到本地路径，例如 `~/Projects/md-card-editor`。
> - 若 Electron 下载慢，可先执行：`export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`
>
> 没有 Mac 时，可推送代码后在 GitHub Actions 手动运行 **Release macOS DMG** 工作流，从 Artifacts 下载 DMG。

### macOS 提示「已损坏，无法打开」？

GitHub Actions 构建的安装包**未经 Apple 公证**，从网络下载后 macOS 会拦截，这并不代表程序真的损坏。

**解决方法（任选其一）：**

1. **右键** `MDoCards.app` → **打开** → 弹窗中再点 **打开**
2. 终端执行（安装到应用程序后）：
   ```bash
   xattr -cr /Applications/MDoCards.app
   ```
3. **系统设置** → **隐私与安全性** → 找到被拦截提示 → **仍要打开**

若要完全消除警告，需要 Apple 开发者账号（$99/年）做代码签名与公证。

### 网页静态资源

```bash
npm run build
npm run preview
```

## 操作说明

| 操作 | 说明 |
|------|------|
| 双击段落 | 编辑该段 Markdown |
| 右键段落/标题栏 | 设置节点端口 |
| 拖拽标题栏 | 移动卡片 |
| 拖拽卡片边缘 | 调整大小 |
| 从 next 圆点拖出 | 连接到另一端口 prev |
| Esc | 取消连线 |
| + 新建卡片 | 工具栏按钮 |

## 技术栈

- React 19 + TypeScript + Vite + Electron
- Zustand（状态 + localStorage）
- react-markdown + remark/rehype 插件
- markdown-it（段落级解析）
