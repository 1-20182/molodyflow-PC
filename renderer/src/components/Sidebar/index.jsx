import React from 'react';
import { motion } from 'framer-motion';
import { Home, Search, Library, Settings, Music } from 'lucide-react';
import usePlayerStore from '../../store/playerStore';

const navItems = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'search', label: '搜索', icon: Search },
  { id: 'library', label: '歌单', icon: Library },
  { id: 'settings', label: '设置', icon: Settings },
];

export default function Sidebar() {
  const { currentPage, setPage } = usePlayerStore();

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <Music size={24} />
        <span>MelodyFlow</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <motion.button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.96 }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {isActive && (
                <motion.div
                  className="nav-active-indicator"
                  layoutId="navIndicator"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-badge">
          飞翔的死猪
        </div>
      </div>
    </div>
  );
}
