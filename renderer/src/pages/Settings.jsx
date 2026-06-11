import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Palette, Image, Film, Trash2, Upload, Sliders, Coffee } from 'lucide-react';
import { GlassPanel } from '../components/GlassPanel';
import qrcodeImg from '../assets/qrcode.png';
import { EQ_PRESETS } from '../styles/themes';
import audioManager from '../services/audioService';

function getWallpaper() {
  try {
    return JSON.parse(localStorage.getItem('melody_wallpaper') || '{"type":"none","url":""}');
  } catch {
    return { type: 'none', url: '' };
  }
}

function setWallpaper(type, url) {
  const config = { type, url };
  localStorage.setItem('melody_wallpaper', JSON.stringify(config));
  window.dispatchEvent(new CustomEvent('wallpaperchange'));
}

export default function Settings() {
  const [wallpaperApplied, setWallpaperApplied] = useState(false);

  // 均衡器状态
  const [currentEQ, setCurrentEQ] = useState(() => localStorage.getItem('melody_eq') || 'Normal');

  // 壁纸状态
  const [wallpaperType, setWallpaperType] = useState('none');
  const [wallpaperUrl, setWallpaperUrl] = useState('');
  const [wallpaperPreviewUrl, setWallpaperPreviewUrl] = useState('');

  useEffect(() => {
    const cfg = getWallpaper();
    setWallpaperType(cfg.type || 'none');
    setWallpaperUrl(cfg.url || '');
    setWallpaperPreviewUrl(cfg.type !== 'none' && cfg.url ? cfg.url : '');
  }, []);

  const handleWallpaperTypeChange = (type) => {
    setWallpaperType(type);
    if (type === 'none') {
      setWallpaperUrl('');
      setWallpaperPreviewUrl('');
      setWallpaper('none', '');
    }
  };

  const handleWallpaperUrlChange = (url) => {
    setWallpaperUrl(url);
    setWallpaperPreviewUrl(url);
  };

  const handleApplyWallpaper = () => {
    if (wallpaperType === 'none' || !wallpaperUrl.trim()) return;
    setWallpaper(wallpaperType, wallpaperUrl.trim());
    setWallpaperApplied(true);
    setTimeout(() => setWallpaperApplied(false), 2000);
  };

  const handleRemoveWallpaper = () => {
    setWallpaperType('none');
    setWallpaperUrl('');
    setWallpaperPreviewUrl('');
    setWallpaper('none', '');
    setWallpaperApplied(false);
  };

  const handlePickFile = async () => {
    if (window.electronAPI?.pickFile) {
      const result = await window.electronAPI.pickFile(wallpaperType === 'video' ? 'video' : 'image');
      if (result) {
        setWallpaperUrl(result);
        setWallpaperPreviewUrl(result);
      }
    } else {
      // 浏览器环境 fallback
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = wallpaperType === 'video' ? 'video/*' : 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const url = URL.createObjectURL(file);
          setWallpaperUrl(url);
          setWallpaperPreviewUrl(url);
        }
      };
      input.click();
    }
  };

  const handleEQChange = (e) => {
    const preset = e.target.value;
    setCurrentEQ(preset);
    localStorage.setItem('melody_eq', preset);
    audioManager.applyEQ(preset);
  };

  return (
    <motion.div className="page settings-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="page-header">
        <h1>设置</h1>
        <p className="page-subtitle">配置应用偏好 · 管理邀请码 · 自定义壁纸</p>
      </div>

      {/* 壁纸设置 */}
      <GlassPanel padding="24px" className="settings-section">
        <div className="settings-header">
          <Image size={18} />
          <h2>动态壁纸</h2>
        </div>
        <p className="settings-desc">
          支持图片和视频格式的壁纸，设置后将作为应用背景显示
        </p>

        {/* 壁纸预览 */}
        <div className="wallpaper-preview">
          {wallpaperPreviewUrl ? (
            wallpaperType === 'video' ? (
              <video src={wallpaperPreviewUrl} autoPlay loop muted playsInline />
            ) : (
              <img src={wallpaperPreviewUrl} alt="壁纸预览" />
            )
          ) : (
            <div className="wallpaper-preview-empty">
              <Image size={24} />
              <span>暂无壁纸</span>
            </div>
          )}
        </div>

        {/* 壁纸类型选择 */}
        <div className="wallpaper-type-tabs">
          {[
            { key: 'none', label: '无', icon: Trash2 },
            { key: 'image', label: '图片', icon: Image },
            { key: 'video', label: '视频', icon: Film },
          ].map(t => (
            <button key={t.key}
              onClick={() => handleWallpaperTypeChange(t.key)}
              className="wallpaper-type-tab"
              style={{
                background: wallpaperType === t.key ? 'rgba(196,78,255,0.15)' : 'rgba(255,255,255,0.03)',
                color: wallpaperType === t.key ? '#C44EFF' : 'rgba(255,255,255,0.4)',
                fontWeight: wallpaperType === t.key ? 600 : 400,
              }}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {wallpaperType !== 'none' && (
          <>
            <div className="settings-field">
              <label>壁纸 {wallpaperType === 'video' ? '视频' : '图片'} URL 或 本地路径</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={wallpaperUrl}
                  onChange={(e) => handleWallpaperUrlChange(e.target.value)}
                  placeholder={wallpaperType === 'video' ? 'https://example.com/wallpaper.mp4' : 'https://example.com/wallpaper.jpg'}
                  className="settings-input"
                  style={{ flex: 1, maxWidth: 'none' }}
                />
                <motion.button
                  onClick={handlePickFile}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="wallpaper-file-btn"
                >
                  <Upload size={14} /> 选择文件
                </motion.button>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                支持 jpg / png / mp4 格式，建议使用 16:9 比例的图片以获得最佳显示效果
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <motion.button
                onClick={handleApplyWallpaper}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="settings-save-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                disabled={!wallpaperUrl.trim()}
              >
                应用壁纸
              </motion.button>
              {wallpaperApplied && (
                <motion.span
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ fontSize: 12, color: '#6BCB77', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  ✓ 已应用
                </motion.span>
              )}
              <motion.button
                onClick={handleRemoveWallpaper}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '8px 16px', border: '1px solid rgba(255,107,157,0.3)', borderRadius: 8,
                  background: 'rgba(255,107,157,0.1)', color: '#FF6B9D', cursor: 'pointer', fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Trash2 size={14} /> 移除壁纸
              </motion.button>
            </div>
          </>
        )}
      </GlassPanel>

      {/* 音频设置 */}
      <GlassPanel padding="24px" className="settings-section">
        <div className="settings-header">
          <Volume2 size={18} />
          <h2>音频设置</h2>
        </div>
        <div className="settings-field">
          <label>默认音质</label>
          <select className="settings-select" defaultValue="320000">
            <option value="128000">标准音质 (128kbps)</option>
            <option value="320000">高音质 (320kbps)</option>
            <option value="999000">无损音质</option>
          </select>
        </div>
      </GlassPanel>

      {/* 均衡器 */}
      <GlassPanel padding="24px" className="settings-section">
        <div className="settings-header">
          <Sliders size={18} />
          <h2>均衡器</h2>
        </div>
        <p className="settings-desc">
          选择均衡器预设以调整音效风格，需要重新播放歌曲后生效
        </p>
        <div className="settings-field">
          <label>预设选择</label>
          <select className="settings-select" value={currentEQ} onChange={handleEQChange}>
            {Object.keys(EQ_PRESETS).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </GlassPanel>

      {/* 赞赏 */}
      <GlassPanel padding="24px" className="settings-section">
        <div className="settings-header">
          <Coffee size={18} />
          <h2>请作者喝杯咖啡</h2>
        </div>
        <p className="settings-desc">
          如果您觉得这个工具对您有帮助，可以请作者喝杯咖啡支持一下~
        </p>
        <div className="donate-section">
          <div className="donate-qrcode">
            <img 
              src={qrcodeImg} 
              alt="赞赏码" 
              className="qrcode-img"
            />
          </div>
          <div className="donate-info">
            <p className="donate-label">微信赞赏</p>
            <p className="donate-hint">扫码支持，感谢您的鼓励</p>
          </div>
        </div>
      </GlassPanel>

      {/* 关于 */}
      <GlassPanel padding="24px" className="settings-section">
        <div className="settings-header">
          <Palette size={18} />
          <h2>关于</h2>
        </div>
        <div className="about-info">
          <p>MelodyFlow v0.1.0</p>
          <p className="settings-desc">网易云音乐播放器 · 玻璃态UI</p>
          <p className="settings-desc" style={{ marginTop: 8 }}>
            技术支持：飞翔的死猪
          </p>
          <p className="settings-desc">
            桌面端 · Electron + React + Vite
          </p>
        </div>
      </GlassPanel>
    </motion.div>
  );
}
