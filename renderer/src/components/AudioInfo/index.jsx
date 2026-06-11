import React, { useState, useEffect } from 'react';
import audioManager from '../../services/audioService';

const ICONS = {
  'MP3': '🎵',
  'FLAC': '💿',
  'WAV': '🔊',
  'AAC': '🎶',
  'OGG': '🔉',
};

/**
 * 实时音频解码信息组件
 * 显示采样率、编码格式、声道数等
 */
export default function AudioInfo() {
  const raw = audioManager.audioInfo || {};
  const [info, setInfo] = useState({ ...raw });

  useEffect(() => {
    const interval = setInterval(() => {
      const newRaw = audioManager.audioInfo || {};
      if (newRaw.sampleRate !== info.sampleRate || newRaw.codec !== info.codec) {
        setInfo({ ...newRaw });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [info]);

  // 没有有效数据时不显示
  if (!info.codec && !info.sampleRate) return null;

  const icon = ICONS[info.codec] || '🎧';
  const sampleRate = info.sampleRate ? `${(info.sampleRate / 1000).toFixed(1)}kHz` : '';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 11, color: 'rgba(255,255,255,0.3)',
    }}>
      <span>{icon}</span>
      {info.codec && <span>{info.codec}</span>}
      {sampleRate && <span>{sampleRate}</span>}
      {info.channels > 0 && <span>{info.channels === 1 ? '单声道' : info.channels === 2 ? '立体声' : `${info.channels}声道`}</span>}
    </div>
  );
}
