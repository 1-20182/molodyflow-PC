import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Heart, Maximize2, Loader2, Repeat, Shuffle,
} from 'lucide-react';
import usePlayerStore from '../../store/playerStore';
import QueueModal from '../QueueModal';

function formatTime(ms) {
  if (!ms || ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function PlayerBar() {
  const {
    currentSong, isPlaying, isLoading, progress, duration, volume,
    setPlaying, seek, setVolume, setPage, togglePlay, updateLyricIndex,
    toggleFavorite, isFavorite, playNext, playPrevious,
    playMode, setPlayMode, queue, queueIndex, currentPage, toggleNowPlaying,
  } = usePlayerStore();
  const [showVolume, setShowVolume] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const progressRef = useRef(null);
  const progressInterval = useRef(null);

  // 定期更新歌词索引
  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        updateLyricIndex();
      }, 500);
    } else {
      clearInterval(progressInterval.current);
    }
    return () => clearInterval(progressInterval.current);
  }, [isPlaying, updateLyricIndex]);

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  const handleProgressClick = useCallback((e) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;
    const x = (e.clientX - rect.left) / rect.width;
    seek(x * duration);
  }, [duration, seek]);

  const handleVolumeChange = useCallback((e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
  }, [setVolume]);

  if (!currentSong) {
    return (
      <div className="player-bar-empty">
        <div className="player-bar-empty-text">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
          <span>选择一首歌曲开始播放</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="player-bar"
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
    >
      {/* 左侧：歌曲信息 - 点击封面进入详情页 */}
      <div className="player-bar-song">
        <div
          className="player-bar-cover"
          onClick={() => setPage('nowplaying')}
          style={{
            background: currentSong.coverUrl
              ? `url(${currentSong.coverUrl}) center/cover`
              : 'linear-gradient(135deg, #FF6B9D, #C44EFF)',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            flexShrink: 0,
            border: '2px solid rgba(255,255,255,0.12)',
            cursor: 'pointer',
          }}
        />
        <div className="player-bar-info">
          <span className="player-bar-title">{currentSong.title}</span>
          <span className="player-bar-artist">{currentSong.artist}</span>
        </div>
        <motion.button
          className="player-bar-like"
          onClick={() => toggleFavorite(currentSong)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          style={{ color: isFavorite(currentSong.id) ? '#FF6B9D' : 'rgba(255,255,255,0.3)' }}
        >
          <Heart size={14} fill={isFavorite(currentSong.id) ? '#FF6B9D' : 'none'} />
        </motion.button>
      </div>

      {/* 中间：播放控制 */}
      <div className="player-bar-controls">
        <div className="player-bar-buttons">
          <motion.button onClick={playPrevious} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <SkipBack size={16} />
          </motion.button>
          <motion.button
            className="play-btn"
            onClick={togglePlay}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            ) : isPlaying ? (
              <Pause size={20} />
            ) : (
              <Play size={20} />
            )}
          </motion.button>
          <motion.button onClick={playNext} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <SkipForward size={16} />
          </motion.button>
        </div>
        <div className="player-bar-progress">
          <span className="time">{formatTime(progress)}</span>
          <div
            className="progress-track"
            ref={progressRef}
            onClick={handleProgressClick}
            style={{ cursor: 'pointer' }}
          >
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="time">{formatTime(duration)}</span>
        </div>
      </div>

      {/* 右侧：音量、播放模式、队列 */}
      <div className="player-bar-extras">
        {/* 播放模式 */}
        <motion.button
          onClick={() => setPlayMode(playMode === 'queue' ? 'repeat' : playMode === 'repeat' ? 'shuffle' : 'queue')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{ color: playMode !== 'queue' ? '#C44EFF' : 'rgba(255,255,255,0.5)' }}
          title={playMode === 'queue' ? '列表循环' : playMode === 'repeat' ? '单曲循环' : '随机播放'}
        >
          {playMode === 'shuffle' ? <Shuffle size={16} /> : <Repeat size={16} />}
        </motion.button>
        {/* 音量 */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <motion.button
            onClick={() => setShowVolume(!showVolume)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </motion.button>
          {showVolume && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.8)',
              padding: '8px 12px',
              borderRadius: '8px',
              marginBottom: '8px',
            }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                style={{ width: '80px', cursor: 'pointer' }}
              />
            </div>
          )}
        </div>
        <QueueModal />
        <motion.button
          onClick={toggleNowPlaying}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{ color: currentPage === 'nowplaying' ? '#C44EFF' : 'rgba(255,255,255,0.5)' }}
          title={currentPage === 'nowplaying' ? '返回上一页' : '展开歌曲详情'}
        >
          <Maximize2 size={14} />
        </motion.button>
      </div>
    </motion.div>
  );
}
