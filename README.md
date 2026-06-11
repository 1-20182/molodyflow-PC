# MelodyFlow

一款基于 Electron + React 构建的桌面音乐播放器，采用玻璃态 UI 设计风格。

> ⚠️ 本软件仅供个人学习研究使用，音乐版权归各平台所有。

## 核心技术

本软件基于 [Meting-API](https://github.com/koomai/meting-api) 提供音乐数据支持。

## 功能特性

- 音乐搜索（歌曲、专辑、歌手）
- 实时歌词同步显示
- 收藏管理与播放历史
- 网易云歌单链接导入
- 本地音乐扫描
- 播放模式（列表循环、单曲循环、随机播放）
- 系统托盘后台播放
- 图片/视频壁纸背景
- 音频均衡器

## 技术栈

- Electron 30.1.0
- React 18.3.1
- Vite 5.4.0
- Zustand 5.0.14
- Framer Motion 12.40.0
- Meting-API (音乐数据源)

## 项目结构

```
desktop/
├── main/               # Electron 主进程
├── renderer/           # React 渲染进程
│   ├── src/
│   │   ├── components/ # UI 组件
│   │   ├── pages/      # 页面
│   │   ├── services/   # 服务层 (基于 Meting-API)
│   │   ├── store/      # 状态管理
│   │   └── styles/     # 样式
├── package.json
└── release-latest/     # 构建产物
```

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build
```

## 构建

构建产物位于 `release-latest/` 目录：

- `win-unpacked/MelodyFlow.exe` - 绿色版
- `MelodyFlow Setup 0.1.0.exe` - 安装程序
- `MelodyFlow-0.1.0-portable.exe` - 便携版

## 许可证

本项目采用 [GNU General Public License v3.0](LICENSE) 开源协议。

```
Copyright (C) 2024 MelodyFlow
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
```