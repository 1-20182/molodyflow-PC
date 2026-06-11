import React, { useMemo } from 'react';

/**
 * Apple 风格玻璃态面板
 * 支持多层模糊、动态色调、明暗自适应
 */
export function GlassPanel({
  children,
  className = '',
  style = {},
  onClick,
  padding = '24px',
  intensity = 'medium', // 'light' | 'medium' | 'heavy'
  hover = false,       // 是否启用 hover 增强效果
}) {
  const bgStyle = useMemo(() => {
    const presets = {
      light: {
        background: 'rgba(255, 255, 255, 0.05)',
        border: 'rgba(255, 255, 255, 0.08)',
        blur: '10px',
        shadow: '0 0 0 0.5px rgba(255,255,255,0.05)',
      },
      medium: {
        background: 'rgba(255, 255, 255, 0.08)',
        border: 'rgba(255, 255, 255, 0.12)',
        blur: '24px',
        shadow: '0 0 0 0.5px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.12)',
      },
      heavy: {
        background: 'rgba(255, 255, 255, 0.12)',
        border: 'rgba(255, 255, 255, 0.18)',
        blur: '40px',
        shadow: '0 0 0 0.5px rgba(255,255,255,0.08), 0 16px 48px rgba(0,0,0,0.18)',
      },
    };
    const p = presets[intensity] || presets.medium;
    return p;
  }, [intensity]);

  return (
    <div
      className={`glass-panel ${hover ? 'glass-hover' : ''} ${className}`}
      onClick={onClick}
      style={{
        position: 'relative',
        background: bgStyle.background,
        backdropFilter: `blur(${bgStyle.blur}) saturate(1.4)`,
        WebkitBackdropFilter: `blur(${bgStyle.blur}) saturate(1.4)`,
        border: `1px solid ${bgStyle.border}`,
        borderRadius: '20px',
        padding,
        boxShadow: bgStyle.shadow,
        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
