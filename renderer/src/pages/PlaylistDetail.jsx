import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Music, Play, ListMusic, Clock, Heart, ChevronLeft } from 'lucide-react';
import { GlassPanel } from '../components/GlassPanel';
import usePlayerStore from '../store/playerStore';
import { getToplistSongs } from '../services/searchService';

function songGradient(id) {
  let hash = 0;
  for (let i = 0; i < (id || '').length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 40 + Math.abs(hash >> 8) % 60) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 70%, 50%), hsl(${h2}, 60%, 40%))`;
}

function formatTime(ms) {
  if (!ms || ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function PlaylistDetail() {
  const {
    currentPlaylist, playlistSongs, setPlaylistSongs,
    play, addToQueue, toggleFavorite, isFavorite, setPage,
  } = usePlayerStore();

  useEffect(() => {
    if (currentPlaylist) {
      getToplistSongs(currentPlaylist.id).then(songs => {
        setPlaylistSongs(songs);
      });
    }
  }, [currentPlaylist, setPlaylistSongs]);

  const handlePlayAll = () => {
    playlistSongs.forEach(s => addToQueue(s));
    if (playlistSongs.length > 0) {
      play(playlistSongs[0]);
    }
  };

  const handlePlay = (song, e) => {
    e?.stopPropagation();
    play(song, playlistSongs);
  };

  const handleAddToQueue = (song, e) => {
    e?.stopPropagation();
    addToQueue(song);
  };

  const handleBack = () => {
    setPage('home');
  };

  if (!currentPlaylist) {
    return (
      <motion.div className="page playlist-detail-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <GlassPanel padding="40px" style={{ textAlign: 'center', marginTop: 40 }}>
          <ListMusic size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>未选择歌单</p>
          <motion.button
            onClick={handleBack}
            whileHover={{ scale: 1.02 }}
            style={{
              marginTop: 16, padding: '8px 20px', borderRadius: 20, border: 'none',
              background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 13,
            }}
          >
            返回首页
          </motion.button>
        </GlassPanel>
      </motion.div>
    );
  }

  // 计算总时长
  const totalDuration = useMemo(() => {
    return playlistSongs.reduce((acc, s) => acc + (s.duration || 0), 0);
  }, [playlistSongs]);

  const totalDurationStr = useMemo(() => {
    const totalSec = Math.floor(totalDuration / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    if (h > 0) return `${h} 小时 ${m} 分钟`;
    return `${m} 分钟`;
  }, [totalDuration]);

  return (
    <motion.div className="page playlist-detail-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* 返回按钮 */}
      <motion.button
        onClick={handleBack}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.6)', fontSize: 13, padding: '4px 0',
        }}
      >
        <ChevronLeft size={18} />
        返回首页
      </motion.button>

      {/* 歌单头部 */}
      <GlassPanel padding="24px" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* 歌单封面 */}
          <div
            style={{
              width: 160, height: 160, borderRadius: 16, flexShrink: 0,
              background: currentPlaylist.coverUrl
                ? `url(${currentPlaylist.coverUrl}) center/cover`
                : songGradient(currentPlaylist.id || 'default'),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            {!currentPlaylist.coverUrl && <Music size={40} style={{ opacity: 0.5 }} />}
          </div>
          {/* 歌单信息 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 160 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                歌单
              </div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{currentPlaylist.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Music size={13} /> {playlistSongs.length || currentPlaylist.trackCount || 0} 首
                </span>
                {totalDuration > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={13} /> {totalDurationStr}
                  </span>
                )}
              </div>
            </div>
            {/* 播放全部按钮 */}
            <motion.button
              onClick={handlePlayAll}
              disabled={playlistSongs.length === 0}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
                padding: '10px 24px', borderRadius: 24, border: 'none',
                background: playlistSongs.length > 0
                  ? 'linear-gradient(135deg, #FF6B9D, #C44EFF)'
                  : 'rgba(255,255,255,0.08)',
                color: '#fff', cursor: playlistSongs.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: 14, fontWeight: 500, opacity: playlistSongs.length > 0 ? 1 : 0.4,
              }}
            >
              <Play size={16} fill="white" />
              播放全部
            </motion.button>
          </div>
        </div>
      </GlassPanel>

      {/* 歌曲列表 */}
      <GlassPanel padding="8px">
        {playlistSongs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <LoaderIcon style={{ opacity: 0.3 }} />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 8 }}>加载中...</p>
          </div>
        ) : (
          <>
            {/* 列表表头 */}
            <div style={{
              display: 'flex', alignItems: 'center', padding: '8px 12px',
              fontSize: 11, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)',
              marginBottom: 4,
            }}>
              <span style={{ width: 30, textAlign: 'center' }}>#</span>
              <span style={{ width: 40, marginRight: 10 }}>封面</span>
              <span style={{ flex: 1 }}>歌曲标题</span>
              <span style={{ width: 120 }}>艺术家</span>
              <span style={{ width: 60, textAlign: 'right' }}>时长</span>
              <span style={{ width: 90, textAlign: 'right' }}>操作</span>
            </div>
            {playlistSongs.map((song, i) => (
              <motion.div
                key={`${song.platform}-${song.id}`}
                className="search-result-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.015 }}
                whileHover={{ background: 'rgba(255,255,255,0.05)' }}
                onClick={() => handlePlay(song)}
                style={{ cursor: 'pointer' }}
              >
                <span style={{
                  width: 30, textAlign: 'center', fontSize: 12,
                  color: 'rgba(255,255,255,0.3)', flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <div
                  className="search-result-cover"
                  style={{
                    background: song.coverUrl
                      ? `url(${song.coverUrl}) center/cover`
                      : songGradient(song.id),
                    marginRight: 10, flexShrink: 0,
                  }}
                >
                  {!song.coverUrl && <Music size={14} />}
                </div>
                <div className="search-result-info" style={{ flex: 1 }}>
                  <span className="search-result-title">{song.title}</span>
                </div>
                <span style={{
                  width: 120, fontSize: 12, color: 'rgba(255,255,255,0.4)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {song.artist || '未知'}
                </span>
                <span style={{
                  width: 60, textAlign: 'right', fontSize: 12,
                  color: 'rgba(255,255,255,0.3)', flexShrink: 0,
                }}>
                  {formatTime(song.duration)}
                </span>
                <div style={{
                  width: 90, display: 'flex', alignItems: 'center',
                  justifyContent: 'flex-end', gap: 2, flexShrink: 0,
                }}>
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(song); }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: isFavorite(song.id) ? '#FF6B9D' : 'rgba(255,255,255,0.25)',
                      display: 'flex', alignItems: 'center', padding: '6px',
                    }}
                    title={isFavorite(song.id) ? '取消收藏' : '收藏'}
                  >
                    <Heart size={13} fill={isFavorite(song.id) ? '#FF6B9D' : 'none'} />
                  </motion.button>
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); handleAddToQueue(song, e); }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', padding: '6px',
                    }}
                    title="添加到队列"
                  >
                    <Music size={12} />
                  </motion.button>
                  <motion.button
                    className="search-result-play"
                    onClick={(e) => { e.stopPropagation(); handlePlay(song, e); }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="播放"
                  >
                    <Play size={12} fill="white" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </>
        )}
      </GlassPanel>
    </motion.div>
  );
}

function LoaderIcon({ style }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ ...style, animation: 'spin 1s linear infinite' }}>
      <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round" />
    </svg>
  );
}
