import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// 配置 API 代理映射（Vite 开发服务器代理，用于绕过 CORS）
import { setProxy } from '@melodyflow/shared-core';
setProxy({
  'https://music.163.com/api': '/netease-api',
  'https://c.y.qq.com': '/qqmusic-c',
  'https://u.y.qq.com': '/qqmusic-u',
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
