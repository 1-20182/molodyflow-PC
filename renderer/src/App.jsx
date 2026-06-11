import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { themes } from './styles/themes';
import usePlayerStore from './store/playerStore';
import './styles/index.css';

// 初始化深色主题
function initTheme() {
  const vars = themes.dark;
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });
}

function getWallpaperConfig() {
  try {
    return JSON.parse(localStorage.getItem('melody_wallpaper') || '{"type":"none","url":""}');
  } catch {
    return { type: 'none', url: '' };
  }
}

// 将本地路径转换为 file:// URL
function normalizeFileUrl(filePath) {
  if (!filePath) return '';
  // 如果已经是 URL（http://, https://, data:, file://），直接返回
  if (/^(https?|data|file):/i.test(filePath)) return filePath;
  // 转换 Windows 路径为 file:// URL
  // 例如 E:\folder\file.jpg -> file:///E:/folder/file.jpg
  return 'file:///' + filePath.replace(/\\/g, '/');
}

function WallpaperBackground() {
  const [config, setConfig] = useState(getWallpaperConfig);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const handler = () => { setConfig(getWallpaperConfig()); setLoaded(false); };
    window.addEventListener('wallpaperchange', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('wallpaperchange', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  useEffect(() => {
    if (config.type === 'none' || !config.url) return;
    setLoaded(false);
  }, [config.url, config.type]);

  if (config.type === 'none' || !config.url) return null;

  return (
    <div className="wallpaper-system">
      <div className="wallpaper-container">
        {config.type === 'video' ? (
          <video
            className={`wallpaper-video ${loaded ? 'loaded' : ''}`}
            src={normalizeFileUrl(config.url)}
            autoPlay loop muted playsInline
            onCanPlay={() => setLoaded(true)}
            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          />
        ) : (
          <img
            className={`wallpaper-image ${loaded ? 'loaded' : ''}`}
            src={normalizeFileUrl(config.url)}
            alt=""
            draggable={false}
            onLoad={() => setLoaded(true)}
            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          />
        )}
      </div>
      {/* 多层遮罩：边缘渐变 + 径向高光 + 底部阴影 */}
      <div className="wallpaper-mask-top" />
      <div className="wallpaper-mask-radial" />
      <div className="wallpaper-mask-bottom" />
      <div className="wallpaper-noise" />
    </div>
  );
}

function TitleBar() {
  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  return (
    <div className="titlebar" onDoubleClick={handleMaximize}>
      <div className="titlebar-drag">
        <div className="titlebar-dots">
          <span className="dot dot-red" onClick={handleClose} />
          <span className="dot dot-yellow" onClick={handleMinimize} />
          <span className="dot dot-green" onClick={handleMaximize} />
        </div>
      </div>
      <span className="titlebar-title">MelodyFlow</span>
      <div className="titlebar-spacer" />
    </div>
  );
}

function App() {
  // 初始化深色主题
  useEffect(() => {
    initTheme();
  }, []);

  const playNext = usePlayerStore((s) => s.playNext);
  const playPrevious = usePlayerStore((s) => s.playPrevious);

  // 监听系统托盘操作
  useEffect(() => {
    if (window.electronAPI?.onTrayAction) {
      window.electronAPI.onTrayAction((action) => {
        if (action === 'next') playNext();
        else if (action === 'previous') playPrevious();
      });
    }
  }, [playNext, playPrevious]);

  return (
    <ErrorBoundary>
      <WallpaperBackground />
      <div className="app-container">
        <TitleBar />
        <Layout />
      </div>
    </ErrorBoundary>
  );
}

export default App;
