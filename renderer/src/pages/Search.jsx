import React, { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, Music, Play, Heart, Loader2, Clock, Trash2, ArrowRight, Disc3, Mic2, ChevronLeft } from 'lucide-react';
import { GlassPanel } from '../components/GlassPanel';
import usePlayerStore from '../store/playerStore';
import { multiSearch } from '../services/searchService';

const HISTORY_KEY = 'melody_search_history';
const MAX_HISTORY = 20;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function saveHistory(keyword) {
  if (!keyword || !keyword.trim()) return;
  const history = loadHistory();
  const trimmed = keyword.trim();
  const filtered = history.filter(h => h !== trimmed);
  const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

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
  return `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, '0')}`;
}

const CATEGORIES = [
  { key: 'song', label: '歌曲', icon: Music },
  { key: 'album', label: '专辑', icon: Disc3 },
  { key: 'artist', label: '歌手', icon: Mic2 },
];

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState(loadHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [category, setCategory] = useState('song');
  // 子视图：null | { type: 'album', value: string } | { type: 'artist', value: string }
  const [detailView, setDetailView] = useState(null);
  const timerRef = useRef(null);
  const inputRef = useRef(null);
  const { play, addToQueue, toggleFavorite, isFavorite } = usePlayerStore();

  // 从全部结果中提取唯一专辑和歌手
  const uniqueAlbums = useMemo(() => {
    const map = new Map();
    results.forEach(s => {
      if (s.album && !map.has(s.album)) {
        map.set(s.album, { name: s.album, coverUrl: s.coverUrl, songCount: 0 });
      }
      if (s.album) {
        const entry = map.get(s.album);
        if (entry) entry.songCount++;
      }
    });
    return Array.from(map.values());
  }, [results]);

  const uniqueArtists = useMemo(() => {
    const map = new Map();
    results.forEach(s => {
      const artist = s.artist || '未知';
      if (!map.has(artist)) {
        map.set(artist, { name: artist, coverUrl: s.coverUrl, songCount: 0 });
      }
      const entry = map.get(artist);
      if (entry) entry.songCount++;
    });
    return Array.from(map.values());
  }, [results]);

  // 根据当前分类和子视图获取展示列表
  const displayItems = useMemo(() => {
    if (detailView) {
      if (detailView.type === 'album') {
        return results.filter(s => s.album === detailView.value);
      }
      if (detailView.type === 'artist') {
        return results.filter(s => (s.artist || '未知') === detailView.value);
      }
    }
    if (category === 'album') return uniqueAlbums;
    if (category === 'artist') return uniqueArtists;
    return results;
  }, [category, results, uniqueAlbums, uniqueArtists, detailView]);

  // 匹配搜索建议（从历史中过滤）
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return searchHistory.filter(h => h.toLowerCase().includes(q) && h !== q).slice(0, 8);
  }, [query, searchHistory]);

  const doSearch = useCallback(async (keyword) => {
    if (!keyword || !keyword.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    setSearched(true);
    setShowHistory(false);
    setShowSuggestions(false);
    setDetailView(null);
    try {
      const data = await multiSearch(keyword);
      setResults(data);
      if (data.length > 0) {
        saveHistory(keyword);
        setSearchHistory(loadHistory());
      }
    } catch (err) {
      console.error('搜索失败:', err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // 立即搜索（防抖）
  const triggerSearch = (val) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 400);
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    setShowHistory(false);
    setShowSuggestions(val.trim().length > 0);
    if (!val.trim()) {
      setShowHistory(true);
      setShowSuggestions(false);
    }
    triggerSearch(val);
  };

  // 处理中文输入法 composition 事件
  const isComposing = useRef(false);
  const handleCompositionStart = () => { isComposing.current = true; };
  const handleCompositionEnd = (e) => {
    isComposing.current = false;
    const val = e.target.value;
    setQuery(val);
    triggerSearch(val);
  };

  const handleSearch = (keyword) => {
    if (!keyword || !keyword.trim()) return;
    setQuery(keyword);
    setShowHistory(false);
    setShowSuggestions(false);
    saveHistory(keyword);
    setSearchHistory(loadHistory());
    doSearch(keyword);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isComposing.current) {
      handleSearch(query);
    }
  };

  const handleClearHistory = () => {
    clearHistory();
    setSearchHistory([]);
  };

  const handlePlay = (song, e) => {
    e?.stopPropagation();
    play(song, results);
  };

  const handleAddToQueue = (song, e) => {
    e?.stopPropagation();
    addToQueue(song);
  };

  const handleFocus = () => {
    if (!query) setShowHistory(true);
    else if (query.trim()) setShowSuggestions(true);
  };

  const handleBlur = () => {
    // 延迟隐藏，让点击事件先触发
    setTimeout(() => {
      setShowHistory(false);
      setShowSuggestions(false);
    }, 200);
  };

  const onSearchClick = () => {
    if (query.trim()) handleSearch(query);
  };

  const handleCategoryChange = (key) => {
    setCategory(key);
    setDetailView(null);
  };

  const handleViewAlbum = (albumName) => {
    setDetailView({ type: 'album', value: albumName });
  };

  const handleViewArtist = (artistName) => {
    setDetailView({ type: 'artist', value: artistName });
  };

  const handleBack = () => {
    setDetailView(null);
  };

  // 渲染单个歌曲行
  const renderSongItem = (song, i, showCategory = false) => (
    <motion.div
      key={`${song.platform}-${song.id}`}
      className="search-result-item"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.02 }}
      whileHover={{ background: 'rgba(255,255,255,0.05)' }}
      onClick={() => handlePlay(song)}
      style={{ cursor: 'pointer' }}
    >
      <div
        className="search-result-cover"
        style={{
          background: song.coverUrl
            ? `url(${song.coverUrl}) center/cover`
            : songGradient(song.id),
        }}
      >
        {!song.coverUrl && <Music size={16} />}
      </div>
      <div className="search-result-info">
        <span className="search-result-title">{song.title}</span>
        <span className="search-result-artist">{song.artist || '未知'}{song.album ? ` · ${song.album}` : ''}</span>
      </div>
      <span className="search-result-duration">{formatTime(song.duration)}</span>
      {showCategory && (
        <span style={{
          fontSize: 10, padding: '2px 6px', borderRadius: 4,
          background: 'rgba(196,78,255,0.15)', color: '#C44EFF',
          marginRight: 4, whiteSpace: 'nowrap',
        }}>
          {category === 'album' ? '专辑' : '歌手'}
        </span>
      )}
      <motion.button
        onClick={(e) => { e.stopPropagation(); toggleFavorite(song); }}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: isFavorite(song.id) ? '#FF6B9D' : 'rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', padding: '4px',
        }}
      >
        <Heart size={14} fill={isFavorite(song.id) ? '#FF6B9D' : 'none'} />
      </motion.button>
      <motion.button
        onClick={(e) => { e.stopPropagation(); handleAddToQueue(song, e); }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center',
          padding: '4px', marginRight: 2,
        }}
        title="添加到队列"
      >
        <Music size={13} />
      </motion.button>
      <motion.button
        className="search-result-play"
        onClick={(e) => { e.stopPropagation(); handlePlay(song, e); }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Play size={14} fill="white" />
      </motion.button>
    </motion.div>
  );

  // 渲染专辑/歌手卡片网格
  const renderGroupGrid = (items, type) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
      <AnimatePresence>
        {items.map((item, i) => (
          <motion.div
            key={`${type}-${item.name}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            whileHover={{ y: -4 }}
            style={{ cursor: 'pointer' }}
            onClick={() => type === 'album' ? handleViewAlbum(item.name) : handleViewArtist(item.name)}
          >
            <GlassPanel padding="16px" style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 80, height: 80, borderRadius: type === 'album' ? 12 : '50%',
                  margin: '0 auto 10px',
                  background: item.coverUrl
                    ? `url(${item.coverUrl}) center/cover`
                    : songGradient(item.name),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {!item.coverUrl && (type === 'album' ? <Disc3 size={28} style={{ opacity: 0.5 }} /> : <Mic2 size={28} style={{ opacity: 0.5 }} />)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                {item.songCount} 首
              </div>
            </GlassPanel>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <motion.div className="page search-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="page-header">
        <h1>搜索音乐</h1>
        <p className="page-subtitle">从网易云音乐搜索歌曲、专辑、歌手</p>
      </div>
      <div className="search-bar-container" style={{ position: 'relative' }}>
        <SearchIcon size={18} className="search-icon" />
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="输入歌曲名、歌手..."
          value={query}
          onChange={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          autoFocus
        />
        {query.trim() && (
          <motion.button
            className="search-go-btn"
            onClick={onSearchClick}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              border: 'none', background: 'linear-gradient(135deg, #FF6B9D, #C44EFF)',
              color: '#fff', borderRadius: 8, cursor: 'pointer',
              padding: '6px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            搜索 <ArrowRight size={14} />
          </motion.button>
        )}
        {/* 搜索历史下拉 */}
        {showHistory && searchHistory.length > 0 && !query && (
          <GlassPanel padding="8px" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} /> 搜索历史
              </span>
              <motion.button
                onClick={handleClearHistory}
                whileHover={{ scale: 1.05 }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}
              >
                <Trash2 size={11} /> 清空
              </motion.button>
            </div>
            {searchHistory.map((h, i) => (
              <motion.div
                key={i}
                onClick={() => handleSearch(h)}
                style={{
                  padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                  color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 8, minHeight: 36,
                }}
                whileHover={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <Clock size={13} style={{ opacity: 0.3 }} />
                {h}
              </motion.div>
            ))}
          </GlassPanel>
        )}
        {/* 搜索建议下拉 */}
        {showSuggestions && suggestions.length > 0 && (
          <GlassPanel padding="8px" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 4 }}>
            <div style={{ padding: '4px 8px', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <SearchIcon size={12} /> 搜索建议
              </span>
            </div>
            {suggestions.map((h, i) => (
              <motion.div
                key={i}
                onClick={() => handleSearch(h)}
                style={{
                  padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                  color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 8, minHeight: 36,
                }}
                whileHover={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <SearchIcon size={13} style={{ opacity: 0.3 }} />
                {h}
              </motion.div>
            ))}
          </GlassPanel>
        )}
      </div>

      {/* 分类标签 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 16 }}>
        {CATEGORIES.map(cat => (
          <motion.button
            key={cat.key}
            onClick={() => handleCategoryChange(cat.key)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 20, border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: category === cat.key ? 600 : 400,
              background: category === cat.key
                ? 'linear-gradient(135deg, #FF6B9D, #C44EFF)'
                : 'rgba(255,255,255,0.06)',
              color: category === cat.key ? '#fff' : 'rgba(255,255,255,0.6)',
              transition: 'all 0.2s',
            }}
          >
            <cat.icon size={14} />
            {cat.label}
          </motion.button>
        ))}
      </div>

      {/* 子视图返回按钮 */}
      {detailView && (
        <motion.button
          onClick={handleBack}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)', fontSize: 13, padding: '4px 0',
          }}
        >
          <ChevronLeft size={16} />
          返回 {detailView.type === 'album' ? '专辑列表' : '歌手列表'}
        </motion.button>
      )}

      {/* 内容区域 */}
      <AnimatePresence mode="wait">
        {searching && (
          <motion.div key="loading" className="search-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
            <p>搜索中...</p>
          </motion.div>
        )}
        {!searching && searched && results.length === 0 && query && (
          <motion.div key="empty" className="search-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <SearchIcon size={32} /><p>未找到 "{query}" 的相关结果</p>
          </motion.div>
        )}
        {!searching && results.length > 0 && category === 'song' && !detailView && (
          <motion.div key="results-songs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="search-results">
            <GlassPanel padding="8px">
              {displayItems.map((song, i) => renderSongItem(song, i))}
            </GlassPanel>
          </motion.div>
        )}
        {!searching && results.length > 0 && category === 'album' && !detailView && (
          <motion.div key="results-albums" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              共 {uniqueAlbums.length} 个专辑
            </div>
            {uniqueAlbums.length > 0 ? (
              renderGroupGrid(uniqueAlbums, 'album')
            ) : (
              <GlassPanel padding="20px" style={{ textAlign: 'center' }}>
                <Disc3 size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>未找到专辑信息</p>
              </GlassPanel>
            )}
          </motion.div>
        )}
        {!searching && results.length > 0 && category === 'artist' && !detailView && (
          <motion.div key="results-artists" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              共 {uniqueArtists.length} 位歌手
            </div>
            {uniqueArtists.length > 0 ? (
              renderGroupGrid(uniqueArtists, 'artist')
            ) : (
              <GlassPanel padding="20px" style={{ textAlign: 'center' }}>
                <Mic2 size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>未找到歌手信息</p>
              </GlassPanel>
            )}
          </motion.div>
        )}
        {/* 子视图：专辑/歌手的歌曲列表 */}
        {!searching && detailView && displayItems.length > 0 && (
          <motion.div key="detail-songs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
              padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 12,
            }}>
              <div
                style={{
                  width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                  background: displayItems[0]?.coverUrl
                    ? `url(${displayItems[0].coverUrl}) center/cover`
                    : songGradient(detailView.value),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {!displayItems[0]?.coverUrl && (detailView.type === 'album' ? <Disc3 size={20} style={{ opacity: 0.5 }} /> : <Mic2 size={20} style={{ opacity: 0.5 }} />)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{detailView.value}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  {detailView.type === 'album' ? '专辑' : '歌手'} · {displayItems.length} 首歌曲
                </div>
              </div>
              <motion.button
                onClick={() => {
                  displayItems.forEach(s => addToQueue(s));
                  play(displayItems[0]);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 20, border: 'none',
                  background: 'linear-gradient(135deg, #FF6B9D, #C44EFF)',
                  color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                }}
              >
                <Play size={14} fill="white" /> 播放全部
              </motion.button>
            </div>
            <GlassPanel padding="8px">
              {displayItems.map((song, i) => renderSongItem(song, i, true))}
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
      {!query && !showHistory && !searched && (
        <motion.div className="search-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <SearchIcon size={48} /><p>输入歌曲名称或歌手，开始你的音乐之旅</p>
        </motion.div>
      )}
    </motion.div>
  );
}
