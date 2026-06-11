import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Netease: /netease-api/toplist/detail → https://music.163.com/api/toplist/detail
      '/netease-api': {
        target: 'https://music.163.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/netease-api/, '/api'),
        headers: {
          'Referer': 'https://music.163.com/',
          'Cookie': 'os=pc; osver=Microsoft-Windows-10-Professional-10586-64bit; appver=2.9.5; channel=netease;',
        },
      },
      // QQ Music c.y.qq.com
      '/qqmusic-c': {
        target: 'https://c.y.qq.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/qqmusic-c/, ''),
        headers: { 'Referer': 'https://y.qq.com/' },
      },
      // QQ Music u.y.qq.com
      '/qqmusic-u': {
        target: 'https://u.y.qq.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/qqmusic-u/, ''),
        headers: { 'Referer': 'https://y.qq.com/' },
      },
      // Meting API（封面代理）
      '/meting-proxy': {
        target: 'https://api.qijieya.cn',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/meting-proxy/, ''),
        headers: {
          'Referer': 'https://api.qijieya.cn/',
        },
      },
      // TXQQ 聚合平台
      '/txqq-proxy': {
        target: 'https://music.txqq.pro',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/txqq-proxy/, ''),
        headers: {
          'Referer': 'https://music.txqq.pro/',
          'Origin': 'https://music.txqq.pro',
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@melodyflow/shared-core': path.resolve(__dirname, '../../shared-core/src'),
    },
  },
});
