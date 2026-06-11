import { create } from 'zustand';
import audioManager from '../services/audioService';
import { getSongPlayUrl, getSongLyrics, getSongDetail } from '../services/searchService';
import { LyricsParser } from '@melodyflow/shared-core';

const LAST_SONG_KEY = 'melody_last_song';
const VOLUME_KEY = 'melody_volume';
const HISTORY_KEY = 'melody_history';
const MAX_HISTORY = 100;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function loadLastSong() {
  try { return JSON.parse(localStorage.getItem(LAST_SONG_KEY)); } catch { return null; }
}

function saveLastSong(song, progress) {
  if (!song) return;
  const data = { id: song.id, title: song.title, artist: song.artist, coverUrl: song.coverUrl, duration: song.duration, platform: song.platform, progress: progress || 0, savedAt: Date.now() };
  localStorage.setItem(LAST_SONG_KEY, JSON.stringify(data));
}

function loadVolume() {
  try { return parseFloat(localStorage.getItem(VOLUME_KEY)) || 0.7; } catch { return 0.7; }
}

const lastSong = loadLastSong();

const usePlayerStore = create((set, get) => {
  let unsubTimeupdate = null;
  let unsubEnded = null;
  let unsubPlaystate = null;
  let unsubDurationchange = null;

  function subscribeAudio() {
    unsubTimeupdate?.();
    unsubEnded?.();
    unsubPlaystate?.();
    unsubDurationchange?.();

    unsubTimeupdate = audioManager.on('timeupdate', (timeMs) => {
      set({ progress: timeMs });
      if (Math.floor(timeMs / 5000) !== Math.floor((timeMs - 1000) / 5000)) {
        const { currentSong } = get();
        if (currentSong) saveLastSong(currentSong, timeMs);
      }
    });

    unsubDurationchange = audioManager.on('durationchange', (durationMs) => {
      set({ duration: durationMs });
    });

    unsubEnded = audioManager.on('ended', () => {
      const { playNext } = get();
      console.log('[Player] Song ended, playing next');
      playNext();
    });

    unsubPlaystate = audioManager.on('playstate', (playing) => {
      set({ isPlaying: playing });
    });
  }

  subscribeAudio();

  return {
    currentSong: lastSong || null,
    isPlaying: false,
    isLoading: false,
    progress: lastSong?.progress || 0,
    duration: lastSong?.duration || 0,
    volume: loadVolume(),
    error: null,

    // 播放队列
    queue: [],
    queueIndex: -1,
    playMode: 'queue', // 'queue' | 'repeat' | 'shuffle'

    // 页面导航
    currentPage: 'home',
    previousPage: 'home',

    // 播放历史
    playHistory: loadHistory(),

    // 迷你模式
    miniMode: false,

    favorites: JSON.parse(localStorage.getItem('melody_favorites') || '[]'),
    searchResults: [],
    toplists: [],
    toplistSongs: [],
    currentPlaylist: null, // { id, name, trackCount, coverUrl }
    playlistSongs: [],

    lyrics: [],
    currentLyricIndex: -1,

    // 本地音乐
    localSongs: [],
    localScanning: false,
    localDirectory: null,

    // ===== 页面导航 =====
    setPage: (page) => {
      const current = get().currentPage;
      if (page !== current) {
        set({ previousPage: current, currentPage: page });
      }
    },
    toggleNowPlaying: () => {
      const { currentPage, previousPage } = get();
      if (currentPage === 'nowplaying') {
        set({ currentPage: previousPage });
      } else {
        set({ previousPage: currentPage, currentPage: 'nowplaying' });
      }
    },

    // ===== 播放历史 =====
    addToHistory: (song) => {
      if (!song) return;
      set((state) => {
        const filtered = state.playHistory.filter(s => s.id !== song.id);
        const entry = { id: song.id, title: song.title, artist: song.artist, coverUrl: song.coverUrl, duration: song.duration, platform: song.platform, playedAt: Date.now() };
        const newHistory = [entry, ...filtered].slice(0, MAX_HISTORY);
        saveHistory(newHistory);
        return { playHistory: newHistory };
      });
    },

    // ===== 迷你模式 =====
    setMiniMode: (mode) => set({ miniMode: mode }),
    toggleMiniMode: () => set((state) => ({ miniMode: !state.miniMode })),

    // ===== 播放核心 =====
    play: async (song, contextQueue) => {
      if (!song) return;
      console.log('[Player] Play:', song.title);

      // 如果传入了上下文队列，替换当前队列以实现自动下一首
      if (contextQueue && contextQueue.length > 0) {
        const idx = contextQueue.findIndex(s => s.id === song.id);
        set({ queue: contextQueue, queueIndex: idx >= 0 ? idx : 0 });
      }

      set({ isLoading: true, error: null, progress: 0,
        currentSong: song, isPlaying: true, duration: song.duration || 0,
        isLoading: true, lyrics: [], currentLyricIndex: -1 });
      saveLastSong(song, 0);
      get().addToHistory(song);

      // 本地歌曲：直接使用 file:// 路径播放
      if (song.platform === 'local' && song.path) {
        set({ isLoading: false });
        audioManager.loadAndPlay(song.path);
        return;
      }

      const [url, detail] = await Promise.all([
        getSongPlayUrl(song).catch(() => null),
        getSongDetail(song).catch(() => null),
      ]);

      if (!url) {
        set({ error: '无法获取播放地址，请尝试其他歌曲', isLoading: false, isPlaying: false });
        return;
      }

      const enriched = detail || song;
      set({ currentSong: enriched, isLoading: false });
      audioManager.loadAndPlay(url);

      getSongLyrics(enriched).then(({ lrc, tlyric }) => {
        const parsed = LyricsParser.parseWithTranslation(lrc, tlyric);
        set({ lyrics: parsed });
      }).catch(() => {});
    },

    playIndex: (index) => {
      const { queue } = get();
      if (index >= 0 && index < queue.length) {
        set({ queueIndex: index });
        get().play(queue[index]);
      }
    },

    setPlaying: (playing) => {
      if (playing) { audioManager.play(); } else { audioManager.pause(); }
      set({ isPlaying: playing });
    },

    togglePlay: () => { audioManager.togglePlay(); },

    seek: (timeMs) => {
      audioManager.seek(timeMs);
      set({ progress: timeMs });
      const { currentSong } = get();
      if (currentSong) saveLastSong(currentSong, timeMs);
    },

    setVolume: (volume) => {
      audioManager.setVolume(volume);
      set({ volume });
      localStorage.setItem(VOLUME_KEY, String(volume));
    },

    // ===== 队列管理 =====
    addToQueue: (song) => {
      if (!song) return;
      set((state) => ({ queue: [...state.queue, song] }));
    },

    addToQueueNext: (song) => {
      if (!song) return;
      set((state) => {
        const idx = state.queueIndex >= 0 ? state.queueIndex + 1 : state.queue.length;
        const newQueue = [...state.queue];
        newQueue.splice(idx, 0, song);
        return { queue: newQueue };
      });
    },

    removeFromQueue: (index) => {
      set((state) => {
        const newQueue = state.queue.filter((_, i) => i !== index);
        let newIndex = state.queueIndex;
        if (index < state.queueIndex) newIndex--;
        else if (index === state.queueIndex) newIndex = -1;
        return { queue: newQueue, queueIndex: newIndex };
      });
    },

    clearQueue: () => set({ queue: [], queueIndex: -1 }),

    setPlayMode: (mode) => set({ playMode: mode }),

    playNext: () => {
      const { queue, queueIndex, playMode, currentSong } = get();
      if (playMode === 'repeat' && currentSong) {
        get().play(currentSong);
        return;
      }
      if (playMode === 'shuffle' && queue.length > 0) {
        const nextIndex = Math.floor(Math.random() * queue.length);
        set({ queueIndex: nextIndex });
        get().play(queue[nextIndex]);
        return;
      }
      if (queue.length > 0 && queueIndex < queue.length - 1) {
        const nextIndex = queueIndex + 1;
        set({ queueIndex: nextIndex });
        get().play(queue[nextIndex]);
      } else if (playMode === 'repeat' && queue.length > 0) {
        set({ queueIndex: 0 });
        get().play(queue[0]);
      } else {
        set({ isPlaying: false });
      }
    },

    playPrevious: () => {
      const { queue, queueIndex, progress } = get();
      // 如果播放超过3秒，重新开始当前歌曲
      if (progress > 3000) {
        audioManager.seek(0);
        set({ progress: 0 });
        return;
      }
      if (queue.length > 0 && queueIndex > 0) {
        const prevIndex = queueIndex - 1;
        set({ queueIndex: prevIndex });
        get().play(queue[prevIndex]);
      }
    },

    // ===== 歌词同步 =====
    setCurrentLyricIndex: (index) => set({ currentLyricIndex: index }),

    updateLyricIndex: () => {
      const { lyrics, progress } = get();
      if (!lyrics || lyrics.length === 0) return;
      let idx = -1;
      for (let i = lyrics.length - 1; i >= 0; i--) {
        if (progress >= lyrics[i].time) { idx = i; break; }
      }
      const current = get().currentLyricIndex;
      if (idx !== current) set({ currentLyricIndex: idx });
    },

    // ===== 收藏管理 =====
    toggleFavorite: (song) => {
      if (!song) return;
      const { favorites } = get();
      const exists = favorites.some(f => f.id === song.id);
      const newFavs = exists
        ? favorites.filter(f => f.id !== song.id)
        : [{ id: song.id, title: song.title, artist: song.artist, coverUrl: song.coverUrl, duration: song.duration, platform: song.platform }, ...favorites];
      localStorage.setItem('melody_favorites', JSON.stringify(newFavs));
      set({ favorites: newFavs });
    },

    isFavorite: (songId) => get().favorites.some(f => f.id === songId),

    // ===== UI 数据 =====
    setSearchResults: (results) => set({ searchResults: results }),
    setToplists: (toplists) => set({ toplists }),
    setToplistSongs: (songs) => set({ toplistSongs: songs }),
    setCurrentPlaylist: (playlist) => set({ currentPlaylist: playlist }),
    setPlaylistSongs: (songs) => set({ playlistSongs: songs }),

    // ===== 本地音乐 =====
    setLocalSongs: (songs) => set({ localSongs: songs }),
    setLocalScanning: (scanning) => set({ localScanning: scanning }),
    setLocalDirectory: (dir) => set({ localDirectory: dir }),

    scanLocalMusic: async (dirPath) => {
      const { setLocalSongs, setLocalScanning, setLocalDirectory } = get();
      if (!dirPath) {
        // 通过 Electron 选择文件夹
        const { selectDirectory } = await import('../services/localMusicService');
        dirPath = await selectDirectory();
      }
      if (!dirPath) return;
      setLocalDirectory(dirPath);
      setLocalScanning(true);
      try {
        const { scanDirectory } = await import('../services/localMusicService');
        const songs = await scanDirectory(dirPath);
        setLocalSongs(songs);
      } catch (err) {
        console.error('[Player] 扫描本地音乐失败:', err);
      } finally {
        setLocalScanning(false);
      }
    },

    playLocalSong: (song) => {
      const { localSongs } = get();
      if (!song) return;
      // 将本地歌曲加入队列并播放
      const queue = localSongs;
      const idx = queue.findIndex(s => s.id === song.id);
      if (idx >= 0) {
        set({ queue, queueIndex: idx });
      } else {
        set({ queue: [song], queueIndex: 0 });
      }
      get().play(song);
    },

    // ===== 清理 =====
    destroy: () => {
      unsubTimeupdate?.();
      unsubEnded?.();
      unsubPlaystate?.();
      unsubDurationchange?.();
    },
  };
});

export default usePlayerStore;
