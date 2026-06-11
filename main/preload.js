const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  pickFile: (fileType) => ipcRenderer.invoke('dialog:pickFile', fileType),
  minimizeToTray: () => ipcRenderer.invoke('window:minimizeToTray'),
  getPlayState: () => ipcRenderer.invoke('player:getPlayState'),
  onTrayAction: (callback) => {
    ipcRenderer.on('tray:action', (event, action) => callback(action));
  },
  // 本地音乐
  pickDirectory: () => ipcRenderer.invoke('dialog:pickDirectory'),
  scanMusicDirectory: (dirPath) => ipcRenderer.invoke('local:scanDirectory', dirPath),
});
