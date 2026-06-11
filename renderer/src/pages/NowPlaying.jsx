import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Heart, ArrowLeft, Loader2, Music,
} from 'lucide-react';
import usePlayerStore from '../store/playerStore';
import AudioVisualizer from '../components/AudioVisualizer';
import AudioInfo from '../components/AudioInfo';

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

export default function NowPlaying() {
  const {
    currentSong, isPlaying, isLoading, progress, duration,
    togglePlay, setPage, lyrics, currentLyricIndex,
    toggleFavorite, isFavorite, playNext, playPrevious,
  } = usePlayerStore();
  const lyricRef = useRef(null);
  const lyricLineRefs = useRef([]);

  useEffect(() => {
    if (currentLyricIndex >= 0 && lyricRef.current) {
      const container = lyricRef.current;
      const targetLine = lyricLineRefs.current[currentLyricIndex];
      if (targetLine) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetLine.getBoundingClientRect();
        const offset = targetRect.top - containerRect.top - containerRect.height * 0.35;
        container.scrollBy({ top: offset, behavior: 'smooth' });
      }
    }
  }, [currentLyricIndex]);

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  if (!currentSong) {
    return (
      <motion.div className="page nowplaying-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="nowplaying-empty">
          <Music size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <p>还没有播放歌曲</p>
          <button className="nowplaying-back" onClick={() => setPage('home')} style={{ marginTop: 16 }}>
            <ArrowLeft size={16} /> 返回首页
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="page nowplaying-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="nowplaying-layout">
        {/* 左侧：封面、进度、控制 */}
        <div className="nowplaying-left">
          {/* 返回按钮 */}
          <button className="nowplaying-back" onClick={() => setPage('home')} style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
            <ArrowLeft size={16} /> 返回
          </button>

          <motion.div
            className="nowplaying-cover-wrapper"
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            style={{
              background: currentSong.coverUrl
                ? `url(${currentSong.coverUrl}) center/cover`
                : songGradient(currentSong.id),
              boxShadow: isPlaying
                ? '0 0 60px rgba(196, 78, 255, 0.3), 0 0 120px rgba(196, 78, 255, 0.1)'
                : '0 0 40px rgba(196, 78, 255, 0.2)',
            }}
          >
            {!currentSong.coverUrl && (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Music size={64} style={{ opacity: 0.5 }} />
              </div>
            )}
          </motion.div>

          <div className="nowplaying-info">
            <h2 className="nowplaying-title">{currentSong.title}</h2>
            <p className="nowplaying-artist">{currentSong.artist}</p>
            {currentSong.album && <p className="nowplaying-album">{currentSong.album}</p>}
          </div>

          <div className="nowplaying-progress">
            <div className="nowplaying-progress-track" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              usePlayerStore.getState().seek(x * duration);
            }}>
              <motion.div className="nowplaying-progress-fill" style={{ width: `${progressPercent}%` }} layout />
            </div>
            <div className="nowplaying-time">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="nowplaying-controls">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={playPrevious}>
              <SkipBack size={24} />
            </motion.button>
            <motion.button
              className="nowplaying-play-btn"
              onClick={togglePlay}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
              ) : isPlaying ? (
                <Pause size={28} />
              ) : (
                <Play size={28} />
              )}
            </motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={playNext}>
              <SkipForward size={24} />
            </motion.button>
          </div>

          <div className="nowplaying-visualizer">
            <AudioVisualizer barCount={32} color="#C44EFF" height={48} />
          </div>

          <motion.button
            onClick={() => toggleFavorite(currentSong)}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
            className="nowplaying-like-btn"
            style={{ color: isFavorite(currentSong.id) ? '#FF6B9D' : 'rgba(255,255,255,0.4)' }}
          >
            <Heart size={20} fill={isFavorite(currentSong.id) ? '#FF6B9D' : 'none'} />
            <span style={{ marginLeft: 8, fontSize: 14 }}>{isFavorite(currentSong.id) ? '已收藏' : '收藏'}</span>
          </motion.button>
        </div>

        {/* 右侧：歌词 */}
        <div className="nowplaying-lyrics" ref={lyricRef}>
          {lyrics.length === 0 ? (
            <div className="nowplaying-lyrics-empty">
              <Music size={32} style={{ opacity: 0.3 }} />
              <p>暂无歌词</p>
              <span style={{ fontSize: 13, opacity: 0.3 }}>歌词加载中或该歌曲暂无歌词</span>
            </div>
          ) : (
            <>
              {lyrics.map((line, i) => (
                <motion.div
                  key={i}
                  ref={(el) => { lyricLineRefs.current[i] = el; }}
                  className={`lyric-line ${i === currentLyricIndex ? 'lyric-active' : ''} ${i < currentLyricIndex ? 'lyric-past' : 'lyric-future'}`}
                  initial={false}
                  animate={{
                    opacity: i === currentLyricIndex ? 1 : i < currentLyricIndex - 1 || i > currentLyricIndex + 1 ? 0.25 : 0.55,
                    scale: i === currentLyricIndex ? 1.08 : 1,
                  }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                >
                  <div className="lyric-text">{line.text}</div>
                  {line.translation && <div className="lyric-translation">{line.translation}</div>}
                </motion.div>
              ))}
            </>
          )}
        </div>
      </div>

      <AudioInfo />
    </motion.div>
  );
}
