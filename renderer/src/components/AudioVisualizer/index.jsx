import React, { useRef, useEffect } from 'react';
import audioManager from '../../services/audioService';
import usePlayerStore from '../../store/playerStore';

/**
 * 音频可视化组件 - 美观版
 * 使用 Web Audio API AnalyserNode 实时渲染频率条
 * 带渐变、辉光、倒影效果
 */
export default function AudioVisualizer({ barCount = 48, color = '#C44EFF', height = 60 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const isPlaying = usePlayerStore(s => s.isPlaying);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const primaryColor = color;
    // 解析主色生成辅助色
    const glowColor = primaryColor + '60';
    const midColor = primaryColor + '88';

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const freqData = audioManager.getNormalizedFrequencyData();
      const hasData = freqData && freqData.length > 0 && isPlaying;

      if (!hasData) {
        // 暂停/无数据时，显示微弱的静态占位
        const gap = 2;
        const barW = (w - gap * (barCount - 1)) / barCount;
        for (let i = 0; i < barCount; i++) {
          const barH = 1.5;
          const x = i * (barW + gap);
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.fillRect(x, h - barH, barW, barH);
        }
        return;
      }

      // 将数据映射到 barCount 个柱子
      const bars = [];
      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor((i / barCount) * freqData.length);
        bars.push(freqData[Math.min(idx, freqData.length - 1)] || 0);
      }

      const gap = 2;
      const barW = (w - gap * (barCount - 1)) / barCount;

      bars.forEach((val, i) => {
        const barH = Math.max(2, val * val * h * 1.2);
        const x = i * (barW + gap);
        const y = h - barH;

        // === 倒影（下方镜像） ===
        const reflectionH = Math.min(barH * 0.3, 20);
        const gradientRef = ctx.createLinearGradient(x, h, x, h + reflectionH);
        gradientRef.addColorStop(0, primaryColor + '30');
        gradientRef.addColorStop(1, primaryColor + '00');
        ctx.fillStyle = gradientRef;
        ctx.fillRect(x, h, barW, reflectionH);

        // === 主体渐变 ===
        const gradient = ctx.createLinearGradient(x, h, x, y);
        gradient.addColorStop(0, midColor);
        gradient.addColorStop(0.5, primaryColor + 'aa');
        gradient.addColorStop(1, primaryColor);
        ctx.fillStyle = gradient;

        // === 圆角矩形 ===
        const radius = Math.min(barW / 2, 4);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barW - radius, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
        ctx.lineTo(x + barW, h);
        ctx.lineTo(x, h);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();

        // === 顶部辉光 ===
        if (barH > 8) {
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + barW - radius, y);
          ctx.quadraticCurveTo(x + barW, y + 2, x + barW, y + 4);
          ctx.lineTo(x + barW, y + 6);
          ctx.lineTo(x, y + 6);
          ctx.lineTo(x, y + 4);
          ctx.quadraticCurveTo(x, y + 2, x + radius, y);
          ctx.closePath();
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fill();
        }

        // === 辉光光晕 ===
        if (val > 0.3) {
          ctx.beginPath();
          ctx.arc(x + barW / 2, y, 3 + val * 4, 0, Math.PI * 2);
          ctx.fillStyle = glowColor;
          ctx.fill();
        }
      });
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [barCount, color, height, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height,
        display: 'block',
        borderRadius: 8,
      }}
    />
  );
}
