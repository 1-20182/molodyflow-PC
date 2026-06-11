/**
 * 搜索服务
 * 以 Meting 第三方 API 为主线路
 */
const METING_API = 'https://api.qijieya.cn/meting';

function extractIdFromUrl(url) {
  if (!url) return '';
  const m = url.match(/[?&]id=(\d+)/);
  return m ? m[1] : '';
}

/** Meting: 通用搜索（歌曲/专辑/歌手） */
async function metingSearch(keyword, limit = 30) {
  try {
    const res = await fetch(
      `${METING_API}/?type=search&id=${encodeURIComponent(keyword)}&limit=${limit}`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const songs = Array.isArray(data) ? data : [];
    return songs.map(s => ({
      id: String(s.id || extractIdFromUrl(s.url) || ''),
      title: s.name || s.title || '',
      artist: s.author || s.artist || '未知',
      album: s.album || '',
      coverUrl: s.pic || '',
      duration: (s.duration || 0) * 1000,
      platform: 'netease',
    }));
  } catch (e) {
    console.warn('Meting search failed:', e.message);
    return [];
  }
}

/** Meting: 获取播放地址 */
async function metingGetSongUrl(songId) {
  try {
    const res = await fetch(
      `${METING_API}/?type=song&id=${songId}`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const info = Array.isArray(data) ? data[0] : data;
    return info?.url || null;
  } catch (e) {
    console.warn('Meting song URL failed:', e.message);
    return null;
  }
}

/** Meting: 获取歌词 */
async function metingGetLyrics(songId) {
  try {
    const res = await fetch(
      `${METING_API}/?server=netease&type=lrc&id=${songId}`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/plain' } }
    );
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim()) return { lrc: text, tlyric: '' };
    }
  } catch (e) {
    console.warn('Meting lyrics failed:', e.message);
  }
  return { lrc: '', tlyric: '' };
}

/** Meting: 获取歌曲详情 */
async function metingGetSongDetail(songId) {
  try {
    const res = await fetch(
      `${METING_API}/?type=song&id=${songId}`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const info = Array.isArray(data) ? data[0] : data;
    if (!info) return null;
    return {
      id: String(songId),
      title: info.name || info.title || '',
      artist: info.artist || info.author || '未知',
      album: info.album || '',
      coverUrl: info.pic || '',
      duration: (info.duration || 0) * 1000,
      platform: 'netease',
    };
  } catch (e) {
    console.warn('Meting detail failed:', e.message);
    return null;
  }
}

/** Meting: 获取歌单歌曲 */
async function metingGetPlaylistSongs(playlistId) {
  try {
    const res = await fetch(
      `${METING_API}/?type=playlist&id=${playlistId}`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const songs = Array.isArray(data) ? data : [];
    return songs.map(s => ({
      id: String(s.id || extractIdFromUrl(s.url) || ''),
      title: s.name || s.title || '',
      artist: s.author || s.artist || '未知',
      album: s.album || '',
      coverUrl: s.pic || '',
      duration: (s.duration || 0) * 1000,
      platform: 'netease',
    }));
  } catch (e) {
    console.warn('Meting playlist failed:', e.message);
    return [];
  }
}

// ====== 公开 API ======

/** 搜索歌曲 */
export async function multiSearch(keyword) {
  if (!keyword || !keyword.trim()) return [];
  try { return await metingSearch(keyword); }
  catch (err) { console.warn('搜索失败:', err.message); return []; }
}

/** 获取播放地址 */
export async function getSongPlayUrl(song) {
  if (!song) return null;
  try { return await metingGetSongUrl(song.id); }
  catch (err) { console.warn('获取播放地址失败:', err.message); return null; }
}

/** 获取歌曲详情 */
export async function getSongDetail(song) {
  if (!song) return null;
  try { return await metingGetSongDetail(song.id); }
  catch (err) { console.warn('获取详情失败:', err.message); return null; }
}

/** 获取歌词 */
export async function getSongLyrics(song) {
  if (!song) return { lrc: '', tlyric: '' };
  try { return await metingGetLyrics(song.id); }
  catch (err) { console.warn('获取歌词失败:', err.message); return { lrc: '', tlyric: '' }; }
}

/**
 * 通过 Netease 官方 API 获取实时排行榜
 * 返回最新的每日歌单数据（含封面、播放量、歌曲数）
 */
async function fetchToplistsFromNetease() {
  try {
    const res = await fetch('https://music.163.com/api/toplist/detail', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://music.163.com/',
        'Cookie': 'os=pc; osver=Microsoft-Windows-10-Professional-10586-64bit; appver=2.9.5; channel=netease;',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json?.list || !Array.isArray(json.list)) throw new Error('Invalid response');
    // 过滤出真正的排行榜（排除 ArtistToplist、RewardToplist 等特殊榜单）
    return json.list
      .filter(t => t.id && t.name && t.coverImgUrl && t.playCount > 0)
      .map(t => ({
        id: String(t.id),
        name: t.name,
        coverUrl: t.coverImgUrl || '',
        description: t.description || '',
        trackCount: t.trackCount || 0,
        playCount: t.playCount || 0,
        updateFrequency: t.updateFrequency || '',
      }));
  } catch (e) {
    console.warn('Netease toplist API failed:', e.message);
    return null;
  }
}

export async function getToplists() {
  const real = await fetchToplistsFromNetease();
  if (real && real.length >= 6) return real.slice(0, 12);
  // 降级：返回已知排行榜
  return [
    { id: '3778678', name: '热歌榜', coverUrl: '', trackCount: 100, playCount: 80000000 },
    { id: '3779629', name: '新歌榜', coverUrl: '', trackCount: 100, playCount: 50000000 },
    { id: '19723756', name: '飙升榜', coverUrl: '', trackCount: 100, playCount: 60000000 },
    { id: '2884035', name: '原创榜', coverUrl: '', trackCount: 100, playCount: 30000000 },
    { id: '60198', name: '说唱榜', coverUrl: '', trackCount: 50, playCount: 20000000 },
    { id: '180106', name: 'DJ榜', coverUrl: '', trackCount: 50, playCount: 15000000 },
  ];
}

export async function getToplistSongs(id) {
  try { return await metingGetPlaylistSongs(id); }
  catch (err) { console.warn('获取歌单歌曲失败:', err.message); return []; }
}
