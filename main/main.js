const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

console.log('Electron app starting...');
console.log(`Is development mode: ${isDev}`);

let mainWindow = null;
let tray = null;

function createWindow() {
  console.log('Creating main window...');
  
  const iconPath = path.join(__dirname, '../renderer/src/assets/app-icon.jpg');
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : null;
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: icon,
    frame: false,
    transparent: false,
    backgroundColor: '#1A1A2E',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
    titleBarStyle: 'hidden',
    show: false,
  });

  mainWindow.on('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow.show();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Page load failed: ${errorCode} - ${errorDescription}`);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`);
  });

  if (isDev) {
    console.log('Loading from dev server: http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const filePath = path.join(__dirname, '../renderer/dist/index.html');
    console.log(`Loading from file: ${filePath}`);
    mainWindow.loadFile(filePath);
  }

  // 点击关闭按钮时隐藏到托盘而非退出
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      console.log('Window hidden to tray');
    }
  });

  mainWindow.on('closed', () => {
    console.log('Window closed');
    mainWindow = null;
  });

  console.log('Main window created');
}

function createTray() {
  const iconPath = path.join(__dirname, '../renderer/src/assets/app-icon.jpg');
  
  let icon;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
    console.log(`[Tray] Using icon from: ${iconPath}`);
  } else {
    console.log('[Tray] Icon file not found, creating fallback icon');
    const size = 32;
    const canvas = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <defs>
          <linearGradient id="trayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FF6B9D"/>
            <stop offset="100%" stop-color="#C44EFF"/>
          </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" rx="6" fill="url(#trayGrad)"/>
        <path d="M10 12l8 5-8 5V12z" fill="white"/>
      </svg>
    `;
    icon = nativeImage.createFromDataURL(
      `data:image/svg+xml;base64,${Buffer.from(canvas).toString('base64')}`
    );
  }
  
  icon = icon.resize({ width: 16, height: 16 });
  
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏',
      click: () => {
        if (mainWindow?.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow?.show();
          mainWindow?.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: '上一曲',
      click: () => {
        mainWindow?.webContents.send('tray:action', 'previous');
      },
    },
    {
      label: '下一曲',
      click: () => {
        mainWindow?.webContents.send('tray:action', 'next');
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('MelodyFlow');
  tray.setContextMenu(contextMenu);

  // 双击托盘图标显示窗口
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  console.log('Tray created');
}

app.whenReady().then(() => {
  console.log('App ready, creating window...');
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  // 如果有托盘，不退出应用
  if (tray) {
    // 在非 macOS 上，当窗口关闭时如果托盘存在，不退出
    // macOS 通常保持应用运行直到 Cmd+Q
  } else {
    if (process.platform !== 'darwin') app.quit();
  }
});

app.on('activate', () => {
  console.log('App activated');
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('window:minimize', () => {
  console.log('Minimize window');
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  console.log('Maximize window');
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  console.log('Close window');
  mainWindow?.close();
});

ipcMain.handle('window:minimizeToTray', () => {
  console.log('Minimize to tray');
  mainWindow?.hide();
});

ipcMain.handle('player:getPlayState', () => {
  return {
    isPlaying: false,
    title: '',
    artist: '',
  };
});

// 文件选择对话框 - 用于壁纸
ipcMain.handle('dialog:pickFile', async (event, fileType) => {
  console.log(`File picker dialog opened for type: ${fileType}`);
  
  const filters = fileType === 'video'
    ? [{ name: '视频文件', extensions: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv'] }]
    : [{ name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'] }];

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters,
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  console.log(`File selected: ${result.filePaths[0]}`);
  return result.filePaths[0];
});

// ===== 本地音乐功能 =====

// 目录选择对话框
ipcMain.handle('dialog:pickDirectory', async () => {
  console.log('Directory picker dialog opened');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  console.log(`Directory selected: ${result.filePaths[0]}`);
  return result.filePaths[0];
});

// 支持的音频扩展名
const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a']);

// 解析 ID3v2 标签（简版）
function parseID3Tags(buffer) {
  const info = { title: '', artist: '', album: '', coverData: null, coverMime: '' };

  // 检查 ID3v2 头
  const id = buffer.slice(0, 3).toString();
  if (id !== 'ID3') return info; // 没有 ID3v2 标签

  const majorVer = buffer[3];
  // 读取标签大小（syncsafe integer）
  let tagSize = 0;
  for (let i = 6; i <= 9; i++) {
    tagSize = (tagSize << 7) | (buffer[i] & 0x7F);
  }

  let offset = 10; // ID3v2 header 10 bytes
  const end = Math.min(offset + tagSize, buffer.length);

  // ID3v2.4 可能有 extended header
  if ((buffer[5] & 0x40) && majorVer >= 3) {
    // 跳过 extended header
    const extSize = buffer.readUInt32BE(offset);
    offset += 4 + extSize;
  }

  while (offset + 10 <= end) {
    const frameId = buffer.slice(offset, offset + 4).toString().trim();
    if (!frameId || frameId.charCodeAt(0) === 0) break;

    let frameSize;
    if (majorVer >= 4) {
      // ID3v2.4: syncsafe integer
      frameSize = 0;
      for (let i = 0; i < 4; i++) {
        frameSize = (frameSize << 7) | (buffer[offset + 4 + i] & 0x7F);
      }
    } else {
      // ID3v2.3 及以下: regular 32-bit integer
      frameSize = buffer.readUInt32BE(offset + 4);
    }

    offset += 10; // frame header
    if (offset + frameSize > end) break;

    const frameData = buffer.slice(offset, offset + frameSize);

    try {
      if (frameId === 'TIT2') {
        info.title = decodeID3Text(frameData);
      } else if (frameId === 'TPE1') {
        info.artist = decodeID3Text(frameData);
      } else if (frameId === 'TALB') {
        info.album = decodeID3Text(frameData);
      } else if (frameId === 'APIC') {
        // APIC: 附图片
        let picOffset = 1; // 跳过 encoding byte
        // 跳过 MIME type (null-terminated)
        while (picOffset < frameData.length && frameData[picOffset] !== 0) picOffset++;
        const mimeType = frameData.slice(1, picOffset).toString();
        picOffset++; // skip null
        // 跳过 picture type byte
        picOffset++;
        // 跳过 description (null-terminated, encoding dependent)
        const descEncoding = frameData[0];
        if (descEncoding === 0x03 || descEncoding === 0x04) {
          // UTF-16: 至少 2 bytes null terminator
          while (picOffset + 1 < frameData.length && !(frameData[picOffset] === 0 && frameData[picOffset + 1] === 0)) picOffset++;
          picOffset += 2;
        } else {
          // Latin-1 or UTF-16 with BOM: null terminated
          while (picOffset < frameData.length && frameData[picOffset] !== 0) picOffset++;
          picOffset++;
        }
        info.coverData = frameData.slice(picOffset);
        info.coverMime = mimeType;
      }
    } catch (e) {
      // ignore frame parse errors
    }

    offset += frameSize;
  }

  return info;
}

// 解码 ID3 文本帧（支持 latin-1 / UTF-16 / UTF-8）
function decodeID3Text(data) {
  if (!data || data.length < 2) return '';
  const encoding = data[0];
  const text = data.slice(1);
  try {
    if (encoding === 0x01 || encoding === 0x02) {
      // UTF-16 with BOM
      return new TextDecoder('utf-16le').decode(text).replace(/\0/g, '').trim();
    } else if (encoding === 0x03) {
      // UTF-8
      return new TextDecoder('utf-8').decode(text).replace(/\0/g, '').trim();
    } else {
      // ISO-8859-1 (Latin-1)
      return new TextDecoder('latin1').decode(text).replace(/\0/g, '').trim();
    }
  } catch {
    return text.toString('utf8').replace(/\0/g, '').trim();
  }
}

// 读取目录中的音乐文件
ipcMain.handle('local:scanDirectory', async (event, dirPath) => {
  console.log(`Scanning directory for music: ${dirPath}`);

  const songs = [];

  try {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!AUDIO_EXTENSIONS.has(ext)) continue;

      const filePath = path.join(dirPath, file);
      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch {
        continue;
      }
      if (!stat.isFile()) continue;

      const fileSize = stat.size;
      const fileName = path.basename(file, ext);

      // 提取文件名中的 歌手 - 歌名 格式
      let title = fileName;
      let artist = '';
      const dashMatch = fileName.match(/^(.*?)\s*[-–—]\s*(.+)$/);
      if (dashMatch) {
        artist = dashMatch[1].trim();
        title = dashMatch[2].trim();
      }

      // 读取文件头以解析 ID3 标签（仅读取前 1MB）
      let id3Info = { title: '', artist: '', album: '', coverData: null, coverMime: '' };
      try {
        const readSize = Math.min(fileSize, 1024 * 1024);
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(readSize);
        fs.readSync(fd, buffer, 0, readSize, 0);
        fs.closeSync(fd);

        if (buffer.slice(0, 3).toString() === 'ID3') {
          id3Info = parseID3Tags(buffer);
        }
      } catch (e) {
        // ignore tag parsing errors
      }

      // 优先使用 ID3 标签中的信息
      const songTitle = id3Info.title || title;
      const songArtist = id3Info.artist || artist;
      const songAlbum = id3Info.album || '';

      // 估算时长（从文件大小估算，不准确但可用）
      const estimatedDuration = estimateDuration(fileSize, ext);

      const song = {
        id: `local_${Buffer.from(filePath).toString('base64').replace(/[+/=]/g, '_').substring(0, 32)}`,
        title: songTitle,
        artist: songArtist,
        album: songAlbum,
        coverUrl: '', // 后面单独处理
        duration: estimatedDuration,
        path: filePath,
        platform: 'local',
        fileName: fileName,
      };

      songs.push({ ...song, _hasCover: !!id3Info.coverData, _coverMime: id3Info.coverMime, _coverData: id3Info.coverData });
    }

    console.log(`Found ${songs.length} music files in ${dirPath}`);

    // 将封面数据转换为 data URL
    for (const song of songs) {
      if (song._hasCover && song._coverData) {
        try {
          const base64 = song._coverData.toString('base64');
          song.coverUrl = `data:${song._coverMime};base64,${base64}`;
        } catch (e) {
          // ignore cover conversion errors
        }
      }
      // 清理临时字段
      delete song._hasCover;
      delete song._coverMime;
      delete song._coverData;
    }

    return songs;
  } catch (err) {
    console.error(`Error scanning directory: ${err.message}`);
    return [];
  }
});

// 估算音频时长（以毫秒为单位）
function estimateDuration(fileSize, ext) {
  // 基于比特率的粗略估算
  const bitrateMap = {
    '.mp3': 192,  // kbps
    '.flac': 800, // kbps (FLAC 较高)
    '.wav': 1411, // kbps (CD quality)
    '.aac': 192,
    '.ogg': 192,
    '.m4a': 192,
  };
  const bitrate = bitrateMap[ext] || 192;
  const durationSec = (fileSize * 8) / (bitrate * 1000);
  return Math.round(durationSec * 1000);
}
