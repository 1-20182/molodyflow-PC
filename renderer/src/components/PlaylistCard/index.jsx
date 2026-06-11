import React from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

export default function PlaylistCard({ playlist, index = 0 }) {
  return (
    <motion.div
      className="playlist-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -4 }}
    >
      <div className="playlist-card-cover">
        <img src={playlist.coverUrl || 'https://via.placeholder.com/200'} alt={playlist.name} />
        <motion.div className="playlist-card-overlay" whileHover={{ opacity: 1 }}>
          <motion.div className="playlist-card-play" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Play size={20} fill="white" />
          </motion.div>
        </motion.div>
      </div>
      <div className="playlist-card-info">
        <span className="playlist-card-name">{playlist.name}</span>
        <span className="playlist-card-desc">
          {playlist.trackCount || playlist.size || 0} 首
          {playlist.playCount ? ` · ${(playlist.playCount / 10000).toFixed(0)}万播放` : ''}
        </span>
      </div>
    </motion.div>
  );
}
