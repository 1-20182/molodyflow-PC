/**
 * 平台检测工具
 * 识别运行环境：Electron / 浏览器
 */

export function isElectron() {
  return !!(window.electronAPI);
}

export function getPlatform() {
  if (isElectron()) return 'electron';
  return 'browser';
}
