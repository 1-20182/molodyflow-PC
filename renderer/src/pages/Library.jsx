import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Heart, Music, Play, Folder, FolderOpen, Loader2, Upload, CheckCircle, XCircle, Clock,
  Link, Plus, ListMusic, Trash2, ExternalLink, Copy,
} from 'lucide-react';
import { GlassPanel } from '../components/GlassPanel';
import usePlayerStore from '../store/playerStore';
import { multiSearch, getToplistSongs } from '../services/searchService';

function songGradient(id) {
  let hash = 0;
  for (let i = 0; i < (id || '').length; i++) { hash = ((hash << 5) - hash) + id.charCodeAt(i); hash |= 0; }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 40 + Math.abs(hash >> 8) % 60) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 70%, 50%), hsl(${h2}, 60%, 40%))`;
}

// ===== 歌单管理 =====
const PLAYLISTS_KEY = 'melody_playlists';

function loadPlaylists() {
  try { return JSON.parse(localStorage.getItem(PLAYLISTS_KEY) || '[]'); } catch { return []; }
}

function savePlaylists(playlists) {
  localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

function extractPlaylistId(url) {
  if (!url) return null;
  // https://music.163.com/playlist/123456
  let m = url.match(/playlist[/=](\d+)/);
  if (m) return m[1];
  // https://music.163.com/#/playlist?id=123456
  m = url.match(/[?&]id=(\d+)/);
  if (m) return m[1];
  // 纯数字 ID
  if (/^\d+$/.test(url.trim())) return url.trim();
  return null;
}

function formatPlaylistUrl(id) {
  return `https://music.163.com/playlist/${id}`;
}

export default function Library() {
  const [tab, setTab] = useState('favorites');
  const { playHistory, play } = usePlayerStore();

  const tabs = [
    { key: 'favorites', label: '收藏', icon: Heart },
    { key: 'playlists', label: '歌单', icon: ListMusic },
    { key: 'history', label: `历史 (${playHistory.length})`, icon: Clock },
    { key: 'local', label: '本地', icon: Folder },
    { key: 'import', label: '导入', icon: Upload },
  ];

  return (
    <motion.div className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="page-header">
        <h1>我的音乐</h1>
        <p className="page-subtitle">收藏 · 歌单 · 历史</p>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <motion.button key={t.key} onClick={() => setTab(t.key)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
                border: active ? '1px solid rgba(196,78,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
                background: active ? 'rgba(196,78,255,0.12)' : 'rgba(255,255,255,0.03)',
                color: active ? '#C44EFF' : 'rgba(255,255,255,0.5)', cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 600 : 400, transition: 'all 0.2s',
              }}
            >
              <Icon size={14} /> {t.label}
            </motion.button>
          );
        })}
      </div>

      {tab === 'favorites' && <FavoritesList />}
      {tab === 'playlists' && <PlaylistManager />}
      {tab === 'history' && <PlayHistoryList />}
      {tab === 'local' && <LocalMusicTab />}
      {tab === 'import' && <ImportPanel />}
    </motion.div>
  );
}

/** 收藏列表 */
function FavoritesList() {
  const { favorites, play, toggleFavorite } = usePlayerStore();
  if (favorites.length === 0) return emptyHint('还没有收藏的歌曲', Heart);
  return (
    <GlassPanel padding="8px">
      {favorites.map((song, i) => (
        <motion.div key={`fav-${song.id}`} className="search-result-item"
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
          whileHover={{ background: 'rgba(255,255,255,0.05)' }}
          onClick={() => play(song, favorites)}
          style={{ cursor: 'pointer' }}
        >
          <div className="search-result-cover" style={{ background: song.coverUrl ? `url(${song.coverUrl}) center/cover` : songGradient(song.id) }}>
            {!song.coverUrl && <Music size={16} />}
          </div>
          <div className="search-result-info">
            <span className="search-result-title">{song.title}</span>
            <span className="search-result-artist">{song.artist || '未知'}</span>
          </div>
          <motion.button onClick={(e) => { e.stopPropagation(); toggleFavorite(song); }} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B9D', display: 'flex', padding: '4px' }}>
            <Heart size={14} fill="#FF6B9D" />
          </motion.button>
          <motion.button className="search-result-play" onClick={(e) => { e.stopPropagation(); play(song, favorites); }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Play size={14} fill="white" />
          </motion.button>
        </motion.div>
      ))}
    </GlassPanel>
  );
}

/** 歌单管理器 */
function PlaylistManager() {
  const [playlists, setPlaylists] = useState(loadPlaylists());

  const refresh = () => setPlaylists(loadPlaylists());

  const deletePlaylist = (id) => {
    const updated = playlists.filter(p => p.id !== id);
    savePlaylists(updated);
    refresh();
  };

  const addToFavorites = (song) => {
    const favs = JSON.parse(localStorage.getItem('melody_favorites') || '[]');
    if (!favs.some(f => f.id === song.id)) {
      favs.unshift({ id: song.id, title: song.title, artist: song.artist, coverUrl: song.coverUrl, duration: song.duration, platform: song.platform });
      localStorage.setItem('melody_favorites', JSON.stringify(favs));
    }
  };

  const playAll = async (songs) => {
    if (songs.length === 0) return;
    const { play, addToQueue } = usePlayerStore.getState();
    songs.forEach(s => addToQueue(s));
    play(songs[0]);
  };

  if (playlists.length === 0) return emptyHint('还没有导入歌单，去"导入"标签页导入吧', ListMusic);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {playlists.map(pl => (
        <GlassPanel key={pl.id} padding="16px" className="import-panel">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <ListMusic size={16} style={{ color: '#C44EFF' }} />
                <span style={{ fontSize: 15, fontWeight: 600 }}>{pl.name}</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{pl.songs.length} 首</span>
                {pl.sourceUrl && (
                  <a href={pl.sourceUrl} target="_blank" rel="noopener noreferrer"
                    style={{ color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
                    · <ExternalLink size={10} /> 网易云
                  </a>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <motion.button onClick={() => playAll(pl.songs)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                style={{ background: 'rgba(196,78,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#C44EFF', fontSize: 11 }}>
                播放全部
              </motion.button>
              <motion.button onClick={() => deletePlaylist(pl.id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                style={{ background: 'rgba(255,107,157,0.1)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#FF6B9D', fontSize: 11 }}>
                <Trash2 size={12} />
              </motion.button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 200, overflowY: 'auto' }}>
            {pl.songs.map((song, i) => (
              <div key={`${song.id}-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 6,
                fontSize: 12, color: 'rgba(255,255,255,0.6)',
              }}>
                <span style={{ width: 20, textAlign: 'right', color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>{i + 1}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist}</span>
                <motion.button onClick={() => addToFavorites(song)} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 2 }}>
                  <Heart size={11} />
                </motion.button>
                <motion.button onClick={() => usePlayerStore.getState().play(song, pl.songs)} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 2 }}>
                  <Play size={11} />
                </motion.button>
              </div>
            ))}
          </div>
        </GlassPanel>
      ))}
    </div>
  );
}

/** 播放历史 */
function PlayHistoryList() {
  const { playHistory, play } = usePlayerStore();
  if (playHistory.length === 0) return emptyHint('还没有播放记录，去首页选择歌曲播放吧！', Clock);
  return (
    <GlassPanel padding="8px">
      {playHistory.map((song, i) => (
        <motion.div key={`h-${song.id}-${i}`} className="search-result-item"
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
          whileHover={{ background: 'rgba(255,255,255,0.05)' }}
          onClick={() => play(song, playHistory)}
          style={{ cursor: 'pointer' }}
        >
          <div className="search-result-cover" style={{ background: song.coverUrl ? `url(${song.coverUrl}) center/cover` : songGradient(song.id) }}>
            {!song.coverUrl && <Music size={16} />}
          </div>
          <div className="search-result-info">
            <span className="search-result-title">{song.title}</span>
            <span className="search-result-artist">{song.artist}</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginRight: 8, whiteSpace: 'nowrap' }}>
            {song.playedAt ? new Date(song.playedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
          </div>
          <motion.button className="search-result-play" onClick={(e) => { e.stopPropagation(); play(song, playHistory); }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Play size={14} fill="white" />
          </motion.button>
        </motion.div>
      ))}
    </GlassPanel>
  );
}

/** 本地音乐 */
function LocalMusicTab() {
  const { localSongs, localScanning, localDirectory, scanLocalMusic, play } = usePlayerStore();

  const handleSelectFolder = async () => { await scanLocalMusic(null); };
  const handleRescan = () => { localDirectory ? scanLocalMusic(localDirectory) : handleSelectFolder(); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <GlassPanel padding="16px" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <motion.button onClick={handleSelectFolder} disabled={localScanning}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="settings-save-btn"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {localScanning ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FolderOpen size={14} />}
          {localScanning ? '扫描中...' : '选择文件夹'}
        </motion.button>
        {localDirectory && (
          <>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📁 {localDirectory}</span>
            <motion.button onClick={handleRescan} disabled={localScanning}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              重新扫描
            </motion.button>
          </>
        )}
      </GlassPanel>
      {localSongs.length > 0 ? (
        <GlassPanel padding="8px">
          {localSongs.map((song, i) => (
            <motion.div key={song.id} className="search-result-item" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} whileHover={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => play(song, localSongs)} style={{ cursor: 'pointer' }}>
              <div className="search-result-cover" style={{ background: song.coverUrl ? `url(${song.coverUrl}) center/cover` : songGradient(song.id) }}>
                {!song.coverUrl && <Music size={16} />}
              </div>
              <div className="search-result-info">
                <span className="search-result-title">{song.title}</span>
                <span className="search-result-artist">{[song.artist, song.album].filter(Boolean).join(' · ') || '未知艺术家'}</span>
              </div>
              <motion.button className="search-result-play" onClick={(e) => { e.stopPropagation(); play(song, localSongs); }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Play size={14} fill="white" />
              </motion.button>
            </motion.div>
          ))}
        </GlassPanel>
      ) : localScanning ? (
        <GlassPanel padding="40px" style={{ textAlign: 'center' }}>
          <Loader2 size={32} style={{ opacity: 0.3, marginBottom: 12, animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>正在扫描音乐文件...</p>
        </GlassPanel>
      ) : (
        <GlassPanel padding="40px" style={{ textAlign: 'center' }}>
          <Folder size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>点击上方"选择文件夹"按钮，选择包含音乐文件的文件夹</p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 8 }}>支持 MP3 / FLAC / WAV / AAC / OGG / M4A 格式</p>
        </GlassPanel>
      )}
    </div>
  );
}

/** 导入面板 - 默认网易云链接导入 */
function ImportPanel() {
  const [mode, setMode] = useState('url'); // 'url' | 'text'
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState([]);
  const [playlistName, setPlaylistName] = useState('');
  const [createdPlaylistId, setCreatedPlaylistId] = useState(null);
  const { toggleFavorite, play } = usePlayerStore();

  const handleUrlImport = async () => {
    const id = extractPlaylistId(url);
    if (!id) {
      setResults([{ input: url, status: 'error', message: '无法识别网易云歌单链接' }]);
      return;
    }
    setImporting(true);
    setResults([{ input: `正在获取歌单...`, status: 'searching', message: '' }]);

    try {
      const songs = await getToplistSongs(id);
      if (!songs || songs.length === 0) {
        setResults([{ input: url, status: 'error', message: '该链接没有找到歌曲' }]);
        setImporting(false);
        return;
      }

      // 自动创建歌单名称
      const name = playlistName.trim() || `导入歌单 (${id})`;
      const playlists = loadPlaylists();
      const newPlaylist = {
        id: `pl_${Date.now()}`,
        name,
        source: 'netease',
        sourceUrl: formatPlaylistUrl(id),
        songs,
        createdAt: Date.now(),
      };
      playlists.unshift(newPlaylist);
      savePlaylists(playlists);
      setCreatedPlaylistId(newPlaylist.id);

      setResults(songs.slice(0, 30).map(s => ({
        input: `${s.title} - ${s.artist}`,
        status: 'ok',
        title: s.title,
        artist: s.artist,
        message: '已导入',
      })));
      if (songs.length > 30) {
        setResults(prev => [...prev, { input: `...以及 ${songs.length - 30} 首`, status: 'ok', message: '' }]);
      }
    } catch (err) {
      setResults([{ input: url, status: 'error', message: err.message }]);
    }
    setImporting(false);
  };

  const handleTextImport = async () => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setImporting(true);
    setResults([]);

    const name = playlistName.trim() || `导入歌单 (${new Date().toLocaleDateString()})`;
    const importedSongs = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      setResults(prev => [...prev, { input: line, status: 'searching', message: '搜索中...' }]);
      try {
        const songs = await multiSearch(line);
        if (songs.length === 0) {
          setResults(prev => { const a = [...prev]; a[a.length - 1] = { input: line, status: 'fail', message: '未找到' }; return a; });
          continue;
        }
        const song = songs[0];
        importedSongs.push(song);
        setResults(prev => { const a = [...prev]; a[a.length - 1] = { input: line, status: 'ok', title: song.title, artist: song.artist, message: `已导入: ${song.title}` }; return a; });
      } catch (err) {
        setResults(prev => { const a = [...prev]; a[a.length - 1] = { input: line, status: 'error', message: err.message }; return a; });
      }
    }

    if (importedSongs.length > 0) {
      const playlists = loadPlaylists();
      const newPlaylist = {
        id: `pl_${Date.now()}`,
        name,
        source: 'manual',
        sourceUrl: '',
        songs: importedSongs,
        createdAt: Date.now(),
      };
      playlists.unshift(newPlaylist);
      savePlaylists(playlists);
      setCreatedPlaylistId(newPlaylist.id);
    }
    setImporting(false);
  };

  const okCount = results.filter(r => r.status === 'ok').length;
  const failCount = results.filter(r => r.status === 'fail' || r.status === 'error').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 模式切换 */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { key: 'url', label: '网易云链接', icon: Link },
          { key: 'text', label: '手动输入', icon: Music },
        ].map(t => {
          const Icon = t.icon;
          const active = mode === t.key;
          return (
            <motion.button key={t.key} onClick={() => setMode(t.key)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 16px', borderRadius: 10,
                border: active ? '1px solid rgba(196,78,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
                background: active ? 'rgba(196,78,255,0.12)' : 'rgba(255,255,255,0.03)',
                color: active ? '#C44EFF' : 'rgba(255,255,255,0.5)', cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 600 : 400, transition: 'all 0.2s',
              }}
            >
              <Icon size={16} /> {t.label}
            </motion.button>
          );
        })}
      </div>

      <GlassPanel padding="20px">
        {/* 歌单名称 */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>歌单名称（选填）</label>
          <input type="text" value={playlistName} onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="留空则自动命名" className="settings-input"
            style={{ maxWidth: 'none', fontSize: 13 }}
          />
        </div>

        {mode === 'url' ? (
          <>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>网易云歌单链接</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://music.163.com/playlist/123456 或歌单ID"
                disabled={importing} className="settings-input"
                style={{ flex: 1, maxWidth: 'none', fontSize: 13 }}
              />
              <motion.button onClick={handleUrlImport} disabled={importing || !url.trim()}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="settings-save-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {importing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
                导入
              </motion.button>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>
              支持网易云音乐歌单链接或纯数字ID，导入后将自动创建一个新歌单
            </p>
          </>
        ) : (
          <>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>每行输入一首歌名</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)}
              placeholder={`周杰伦 - 晴天\n七里香\n陈奕迅 - 好久不见`}
              disabled={importing}
              style={{
                width: '100%', minHeight: 120, padding: 12, resize: 'vertical',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13,
                outline: 'none', lineHeight: 1.8,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <motion.button onClick={handleTextImport} disabled={importing || !text.trim()}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="settings-save-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {importing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
                {importing ? '导入中...' : `导入 (${text.split('\n').filter(Boolean).length} 首)`}
              </motion.button>
              {results.length > 0 && (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>成功 {okCount} · 失败 {failCount}</span>
              )}
            </div>
          </>
        )}

        {/* 导入结果 */}
        {results.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 200, overflowY: 'auto' }}>
            {results.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6,
                fontSize: 12, color: r.status === 'ok' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)',
                background: r.status === 'ok' ? 'rgba(107,203,119,0.04)' : r.status === 'searching' ? 'rgba(255,255,255,0.02)' : 'rgba(255,107,157,0.04)',
              }}>
                {r.status === 'ok' ? <CheckCircle size={12} style={{ color: '#6BCB77' }} /> :
                 r.status === 'searching' ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> :
                 <XCircle size={12} style={{ color: '#FF6B9D' }} />}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.title ? `${r.title} - ${r.artist}` : r.input}
                </span>
                <span style={{ flexShrink: 0, color: 'rgba(255,255,255,0.2)' }}>{r.message}</span>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>

      {createdPlaylistId && (
        <GlassPanel padding="16px" style={{ background: 'rgba(107,203,119,0.06)', border: '1px solid rgba(107,203,119,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <CheckCircle size={18} style={{ color: '#6BCB77' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#6BCB77' }}>导入完成</span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
            已自动创建新歌单，可在「歌单」标签页查看
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button onClick={() => setCreatedPlaylistId(null)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(107,203,119,0.15)', border: 'none', cursor: 'pointer', color: '#6BCB77', fontSize: 12 }}>
              知道了
            </motion.button>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}

function emptyHint(text, Icon) {
  return (
    <GlassPanel padding="40px" style={{ textAlign: 'center' }}>
      <Icon size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{text}</p>
    </GlassPanel>
  );
}
