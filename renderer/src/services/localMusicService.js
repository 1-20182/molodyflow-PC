/**
 * 本地音乐服务
 * 通过 Electron IPC 选择文件夹、扫描音频文件、读取 ID3 标签
 */

/**
 * 打开系统文件夹选择对话框
 * @returns {Promise<string|null>} 选中的文件夹路径，取消则返回 null
 */
export async function selectDirectory() {
  if (!window.electronAPI?.pickDirectory) {
    console.warn('[LocalMusic] electronAPI.pickDirectory 不可用');
    return null;
  }
  try {
    const dirPath = await window.electronAPI.pickDirectory();
    return dirPath;
  } catch (err) {
    console.error('[LocalMusic] 选择文件夹失败:', err);
    return null;
  }
}

/**
 * 扫描指定目录中的音乐文件
 * @param {string} dirPath 文件夹路径
 * @returns {Promise<Array>} 歌曲对象数组
 */
export async function scanDirectory(dirPath) {
  if (!dirPath) return [];
  if (!window.electronAPI?.scanMusicDirectory) {
    console.warn('[LocalMusic] electronAPI.scanMusicDirectory 不可用');
    return [];
  }
  try {
    const songs = await window.electronAPI.scanMusicDirectory(dirPath);
    return songs || [];
  } catch (err) {
    console.error('[LocalMusic] 扫描目录失败:', err);
    return [];
  }
}

export default { selectDirectory, scanDirectory };
