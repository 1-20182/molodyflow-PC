import React, { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import Sidebar from '../Sidebar';
import PlayerBar from '../PlayerBar';
import ErrorBoundary from '../ErrorBoundary';
import HomePage from '../../pages/Home';
import SearchPage from '../../pages/Search';
import LibraryPage from '../../pages/Library';
import NowPlaying from '../../pages/NowPlaying';
import SettingsPage from '../../pages/Settings';
import PlaylistDetail from '../../pages/PlaylistDetail';
import usePlayerStore from '../../store/playerStore';
import { useKeyboard } from '../../services/useKeyboard';

const pages = {
  home: HomePage, search: SearchPage, library: LibraryPage,
  nowplaying: NowPlaying, settings: SettingsPage, playlist: PlaylistDetail,
};

export default function Layout() {
  const { currentPage, setPage, togglePlay, playNext, playPrevious, setVolume, volume } = usePlayerStore();

  // 键盘快捷键
  const shortcuts = useMemo(() => [
    { key: ' ', fn: () => togglePlay() },
    { key: 'ArrowRight', fn: () => playNext() },
    { key: 'ArrowLeft', fn: () => playPrevious() },
    { key: 'ArrowUp', fn: () => setVolume(Math.min(1, volume + 0.1)) },
    { key: 'ArrowDown', fn: () => setVolume(Math.max(0, volume - 0.1)) },
    { key: 'n', ctrl: true, fn: () => playNext() },
    { key: 'p', ctrl: true, fn: () => playPrevious() },
    { key: '1', ctrl: true, fn: () => setPage('home') },
    { key: '2', ctrl: true, fn: () => setPage('search') },
    { key: '3', ctrl: true, fn: () => setPage('library') },
    { key: '4', ctrl: true, fn: () => setPage('settings') },
  ], [togglePlay, playNext, playPrevious, setVolume, volume, setPage]);

  useKeyboard(shortcuts);

  const PageComponent = pages[currentPage] || HomePage;

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <div className="main-scroll">
          <ErrorBoundary key={currentPage}>
            <AnimatePresence mode="wait">
              <PageComponent key={currentPage} />
            </AnimatePresence>
          </ErrorBoundary>
        </div>
        <PlayerBar />
      </div>
    </div>
  );
}
