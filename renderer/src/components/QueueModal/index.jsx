import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Music, Play } from 'lucide-react';
import usePlayerStore from '../../store/playerStore';

function formatTime(ms) {
  if (!ms || ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

// 动画配置
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8, 
    y: 50,
    rotateX: -15,
  },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    rotateX: 0,
    transition: { 
      type: 'spring',
      damping: 25,
      stiffness: 300,
      duration: 0.4,
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.8, 
    y: 50,
    rotateX: 15,
    transition: { duration: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i) => ({ 
    opacity: 1, 
    x: 0,
    transition: { 
      delay: i * 0.05,
      type: 'spring',
      damping: 20,
      stiffness: 200,
    },
  }),
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
};

const badgeVariants = {
  hidden: { scale: 0 },
  visible: { 
    scale: 1, 
    transition: { 
      type: 'spring', 
      stiffness: 500, 
      damping: 15,
    },
  },
  exit: { scale: 0 },
};

export default function QueueModal() {
  const { queue, queueIndex, currentSong, playIndex, removeFromQueue, clearQueue, isPlaying } = usePlayerStore();
  const [isOpen, setIsOpen] = React.useState(false);

  const handlePlay = (index) => {
    playIndex(index);
  };

  const handleRemove = (index, e) => {
    e.stopPropagation();
    removeFromQueue(index);
  };

  const handleClear = () => {
    clearQueue();
  };

  // 点击外部区域关闭
  const handleOverlayClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.15, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        className="queue-button"
        title="播放队列"
        animate={{ rotate: isOpen ? 360 : 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        <Music size={16} />
        <AnimatePresence>
          {queue.length > 0 && (
            <motion.span
              className="queue-badge"
              variants={badgeVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {queue.length}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="queue-modal-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleOverlayClick}
          >
            <motion.div
              className="queue-modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              style={{ perspective: 1000 }}
            >
              <div className="queue-modal-header">
                <motion.h3
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  播放队列
                </motion.h3>
                <div className="queue-modal-actions">
                  <AnimatePresence>
                    {queue.length > 0 && (
                      <motion.button
                        onClick={handleClear}
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 107, 157, 0.3)' }}
                        whileTap={{ scale: 0.95 }}
                        className="queue-clear-btn"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: 0.15 }}
                      >
                        <Trash2 size={14} />
                        清空
                      </motion.button>
                    )}
                  </AnimatePresence>
                  <motion.button
                    onClick={() => setIsOpen(false)}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="queue-close-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <X size={18} />
                  </motion.button>
                </div>
              </div>

              <div className="queue-modal-content">
                {queue.length === 0 ? (
                  <motion.div 
                    className="queue-empty"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Music size={48} style={{ opacity: 0.3 }} />
                    </motion.div>
                    <p>播放队列为空</p>
                    <p className="queue-empty-hint">播放歌曲后会自动加入队列</p>
                  </motion.div>
                ) : (
                  <div className="queue-list">
                    <AnimatePresence>
                      {queue.map((song, index) => {
                        const isCurrent = currentSong?.id === song.id;
                        const songIsPlaying = isCurrent && isPlaying;
                        return (
                          <motion.div
                            key={song.id}
                            className={`queue-item ${isCurrent ? 'queue-item-current' : ''}`}
                            onClick={() => handlePlay(index)}
                            variants={itemVariants}
                            custom={index}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            whileHover={{ 
                              x: 8, 
                              scale: 1.02,
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            }}
                            whileTap={{ scale: 0.98 }}
                            layout
                          >
                            <div className="queue-item-index">
                              {isCurrent ? (
                                <motion.div
                                  className="queue-playing-indicator"
                                  animate={{ 
                                    scale: [1, 1.3, 1],
                                    opacity: [1, 0.7, 1],
                                  }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                />
                              ) : (
                                <motion.span
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: index * 0.05 + 0.1 }}
                                >
                                  {index + 1}
                                </motion.span>
                              )}
                            </div>
                            <motion.div
                              className="queue-item-cover"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: index * 0.05 + 0.1 }}
                              whileHover={{ scale: 1.1 }}
                              style={{
                                background: song.coverUrl
                                  ? `url(${song.coverUrl}) center/cover`
                                  : 'linear-gradient(135deg, #FF6B9D, #C44EFF)',
                              }}
                            />
                            <div className="queue-item-info">
                              <motion.span 
                                className="queue-item-title"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 + 0.15 }}
                              >
                                {song.title}
                              </motion.span>
                              <motion.span 
                                className="queue-item-artist"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 + 0.2 }}
                              >
                                {song.artist}
                              </motion.span>
                            </div>
                            <motion.div 
                              className="queue-item-duration"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: index * 0.05 + 0.25 }}
                            >
                              {formatTime(song.duration)}
                            </motion.div>
                            <motion.button
                              onClick={(e) => handleRemove(index, e)}
                              whileHover={{ scale: 1.2, color: '#FF6B9D' }}
                              whileTap={{ scale: 0.8 }}
                              className="queue-item-remove"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: index * 0.05 + 0.3 }}
                            >
                              <Trash2 size={12} />
                            </motion.button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              <motion.div 
                className="queue-modal-footer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <span>共 {queue.length} 首歌曲</span>
                {currentSong && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    style={{ marginLeft: 8, color: '#C44EFF' }}
                  >
                    · 正在播放第 {queueIndex + 1} 首
                  </motion.span>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}