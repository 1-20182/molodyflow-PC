import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Music, Play, Headphones, ListMusic } from 'lucide-react';
import { GlassPanel } from '../components/GlassPanel';
import usePlayerStore from '../store/playerStore';
import { getToplists, getToplistSongs } from '../services/searchService';

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

function formatPlayCount(count) {
  if (!count) return '0';
  if (count >= 100000000) return (count / 100000000).toFixed(1) + '亿';
  if (count >= 10000) return (count / 10000).toFixed(1) + '万';
  return count.toLocaleString();
}

export default function Home() {
  const { play, addToQueue, toplists, setToplists, setCurrentPlaylist, setPage } = usePlayerStore();

  useEffect(() => {
    if (toplists.length > 0) return;
    getToplists().then(setToplists);
  }, [toplists.length, setToplists]);

  const handlePlayAll = async (pl) => {
    try {
      const songs = await getToplistSongs(pl.id);
      if (songs.length === 0) return;
      songs.forEach(s => addToQueue(s));
      play(songs[0]);
    } catch (err) {
      console.error('获取歌单歌曲失败:', err);
    }
  };

  const handlePlaylistClick = (pl) => {
    setCurrentPlaylist(pl);
    setPage('playlist');
  };

  return (
    <motion.div className="page home-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <div className="page-header">
        <h1>发现音乐</h1>
        <p className="page-subtitle">实时热门排行榜 · 每日更新</p>
      </div>

      <div className="playlist-grid">
        {toplists.map((pl, i) => (
          <motion.div
            key={pl.id}
            className="playlist-card-wrapper"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -6 }}
            whileTap={{ scale: 0.97 }}
          >
            <GlassPanel padding="0" className="playlist-card" onClick={() => handlePlaylistClick(pl)}>
              <div
                className="playlist-card-cover"
                style={{
                  background: pl.coverUrl
                    ? `url(${pl.coverUrl}) center/cover`
                    : songGradient(pl.id),
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: '20px 20px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {!pl.coverUrl && <Music size={32} style={{ opacity: 0.5 }} />}
                <motion.button
                  className="playlist-card-play"
                  onClick={(e) => { e.stopPropagation(); handlePlayAll(pl); }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Play size={18} fill="white" />
                </motion.button>
                {/* 播放量角标 */}
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                  borderRadius: 10, padding: '2px 8px',
                  display: 'flex', alignItems: 'center', gap: 3,
                  fontSize: 11, color: '#fff', fontWeight: 500,
                }}>
                  <Headphones size={10} />
                  {formatPlayCount(pl.playCount)}
                </div>
              </div>
              <div className="playlist-card-info" style={{ padding: '10px 12px 12px' }}>
                <span className="playlist-card-name" style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', lineHeight: 1.3, marginBottom: 4,
                }}>
                  {pl.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
                  <ListMusic size={10} />
                  <span>{pl.trackCount} 首</span>
                  {pl.updateFrequency && (
                    <>
                      <span style={{ opacity: 0.3 }}>·</span>
                      <span>{pl.updateFrequency}</span>
                    </>
                  )}
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
