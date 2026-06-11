/**
 * 音频播放管理服务（单例）
 * 使用 HTML5 Audio 原生播放，合成频率数据用于可视化
 */
import { EQ_PRESETS, EQ_FREQUENCIES } from '../styles/themes';

class AudioManager {
  constructor() {
    if (AudioManager.instance) {
      console.log('[Audio] Reusing existing instance');
      return AudioManager.instance;
    }

    this.audio = new Audio();
    this.audio.volume = 0.7;
    this.audio.preload = 'auto';
    // 设置 crossOrigin 以支持跨域音频
    this.audio.crossOrigin = 'anonymous';

    this._listeners = new Map();
    this._currentUrl = null;
    this._isLoading = false;
    this._audioInfo = { sampleRate: 0, bitRate: 0, channels: 0, codec: '' };

    // 均衡器相关
    this._audioContext = null;
    this._sourceNode = null;
    this._eqNodes = [];
    this._currentEQPreset = 'Normal';

    // 绑定音频事件
    this.audio.addEventListener('timeupdate', () => this._emit('timeupdate', this.audio.currentTime * 1000));
    this.audio.addEventListener('durationchange', () => {
      this._emit('durationchange', this.audio.duration * 1000);
      this._updateAudioInfo();
    });
    this.audio.addEventListener('ended', () => this._emit('ended'));
    this.audio.addEventListener('play', () => this._emit('playstate', true));
    this.audio.addEventListener('pause', () => this._emit('playstate', false));
    this.audio.addEventListener('waiting', () => { this._isLoading = true; this._emit('loading', true); });
    this.audio.addEventListener('canplay', () => { this._isLoading = false; this._emit('loading', false); });
    this.audio.addEventListener('error', (e) => {
      const errMsg = this.audio.error
        ? `code=${this.audio.error.code} message=${this.audio.error.message}`
        : 'unknown error';
      console.error('[Audio] Error event:', errMsg);
      this._emit('error', this.audio.error);
    });
    this.audio.addEventListener('loadedmetadata', () => this._updateAudioInfo());
    this.audio.addEventListener('loadstart', () => console.log('[Audio] loadstart'));
    this.audio.addEventListener('progress', () => {}); // just for debug

    console.log('[Audio] Manager initialized');
    AudioManager.instance = this;
  }

  /** 懒初始化 AudioContext 和 EQ 节点链 */
  _initEQChain() {
    if (this._audioContext) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('[Audio] AudioContext not available, EQ disabled');
        return;
      }
      this._audioContext = new AudioCtx();
      this._sourceNode = this._audioContext.createMediaElementSource(this.audio);

      const filters = EQ_FREQUENCIES.map((freq, i) => {
        const filter = this._audioContext.createBiquadFilter();
        filter.type = i === 0 ? 'lowshelf' : i === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = 0;
        return filter;
      });

      // 连接节点链: source -> filter[0] -> filter[1] -> ... -> filter[N-1] -> destination
      this._sourceNode.connect(filters[0]);
      for (let i = 1; i < filters.length; i++) {
        filters[i - 1].connect(filters[i]);
      }
      filters[filters.length - 1].connect(this._audioContext.destination);
      this._eqNodes = filters;

      console.log('[Audio] EQ chain initialized');
    } catch (e) {
      console.warn('[Audio] EQ initialization failed:', e.message);
      this._audioContext = null;
      this._eqNodes = [];
    }
  }

  /** 应用均衡器预设 */
  applyEQ(preset) {
    this._currentEQPreset = preset;
    if (this._eqNodes.length === 0) {
      // 延迟初始化：等 audio 开始播放且 context 可用时再初始化
      return;
    }
    try {
      const gains = EQ_PRESETS[preset] || EQ_PRESETS.Normal;
      this._eqNodes.forEach((filter, i) => {
        if (i < gains.length) {
          filter.gain.value = gains[i];
        }
      });
      console.log('[Audio] EQ applied:', preset, gains);
    } catch (e) {
      console.warn('[Audio] EQ apply failed:', e.message);
    }
  }

  _ensureEQ() {
    if (!this._audioContext) {
      this._initEQChain();
    }
    if (this._eqNodes.length > 0) {
      // Resume context if suspended (autoplay policy)
      if (this._audioContext.state === 'suspended') {
        this._audioContext.resume().catch(() => {});
      }
      // Apply current preset
      this.applyEQ(this._currentEQPreset);
    }
  }

  _updateAudioInfo() {
    this._audioInfo = {
      sampleRate: 44100,
      bitRate: 0,
      channels: 2,
      codec: this._detectCodec(this.audio.src) || '',
    };
  }

  _detectCodec(url) {
    if (!url) return '';
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
    const codecMap = { mp3: 'MP3', flac: 'FLAC', wav: 'WAV', aac: 'AAC', ogg: 'OGG', m4a: 'AAC', ape: 'APE', wma: 'WMA' };
    return codecMap[ext] || '';
  }

  on(event, callback) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const idx = listeners.indexOf(callback);
      if (idx >= 0) listeners.splice(idx, 1);
    }
  }

  _emit(event, ...args) {
    const listeners = this._listeners.get(event);
    if (listeners) listeners.forEach(fn => fn(...args));
  }

  /** 直接通过 fetch 获取可播放的音频 URL（处理重定向） */
  async _resolvePlayableUrl(proxyUrl) {
    try {
      const resp = await fetch(proxyUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://music.163.com/' },
      });
      if (!resp.ok) {
        console.warn('[Audio] Proxy URL failed:', resp.status);
        return proxyUrl; // fallback to original
      }
      const finalUrl = resp.url; // 最终 URL（已跟随重定向）
      console.log('[Audio] Resolved URL:', finalUrl.substring(0, 100));
      return finalUrl;
    } catch (e) {
      console.warn('[Audio] URL resolve failed:', e.message);
      return proxyUrl; // fallback
    }
  }

  /** 判断是否为本地文件路径 */
  _isLocalPath(url) {
    return url && (url.startsWith('file://') || /^[A-Z]:\\/i.test(url) || url.startsWith('/'));
  }

  async loadAndPlay(url) {
    if (!url) {
      console.warn('[Audio] No URL provided');
      return;
    }

    console.log('[Audio] loadAndPlay called with:', url.substring(0, 80) + '...');

    let playableUrl = url;

    // 本地文件路径，跳过 URL 解析，直接使用 file:// 协议
    if (this._isLocalPath(url)) {
      if (!url.startsWith('file://')) {
        playableUrl = `file://${url}`;
      }
      console.log('[Audio] Local file detected:', playableUrl.substring(0, 100));
    } else {
      // 在线 URL，先解析可播放 URL
      playableUrl = await this._resolvePlayableUrl(url);
    }

    if (this._currentUrl === url && this.audio.src && !this.audio.paused) {
      console.log('[Audio] Same URL, already playing');
      return;
    }

    console.log('[Audio] Setting src and playing...');
    this._currentUrl = url;
    this._isLoading = true;
    this._emit('loading', true);
    this.audio.src = playableUrl;
    this.audio.load();

    // 确保 EQ 链已初始化
    this._ensureEQ();

    try {
      await this.audio.play();
      console.log('[Audio] Play started successfully');
      this._isLoading = false;
      this._emit('loading', false);
    } catch (e) {
      console.warn('[Audio] Play failed:', e.name, '-', e.message);
      // 如果是 NotAllowedError（自动播放限制），尝试用户交互后重试
      if (e.name === 'NotAllowedError') {
        console.log('[Audio] Trying to play after user gesture...');
        const playOnClick = () => {
          this.audio.play().then(() => {
            console.log('[Audio] Play succeeded on user gesture');
            this._isLoading = false;
            this._emit('loading', false);
          }).catch(e2 => {
            console.error('[Audio] Play still failed:', e2.message);
          });
          document.removeEventListener('click', playOnClick);
        };
        document.addEventListener('click', playOnClick);
      }
      this._isLoading = false;
      this._emit('loading', false);
    }
  }

  play() {
    if (this.audio.paused && this.audio.src) {
      this.audio.play().catch(e => {
        console.warn('[Audio] Play() failed:', e.message);
        if (e.name === 'NotAllowedError') {
          const playOnClick = () => {
            this.audio.play().catch(() => {});
            document.removeEventListener('click', playOnClick);
          };
          document.addEventListener('click', playOnClick);
        }
      });
    }
  }

  pause() {
    this.audio.pause();
  }

  togglePlay() {
    if (this.audio.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  getNormalizedFrequencyData() {
    if (!this.isPlaying || !this.audio.src) return [];
    const t = this.audio.currentTime;
    const count = 128;
    const result = [];
    for (let i = 0; i < count; i++) {
      const val = 0.25 + 0.75 * (
        Math.sin(t * (1.5 + i * 0.08) + i * 0.4) * 0.35 +
        Math.sin(t * (4.0 + i * 0.15) + i * 0.7) * 0.25 +
        Math.sin(t * (9.0 + i * 0.3) + i * 1.1) * 0.18 +
        Math.sin(t * (20.0 + i * 0.5) + i * 1.7) * 0.12 +
        Math.sin(t * 45.0 + i * 2.3) * 0.10
      );
      result.push(Math.max(0.05, Math.min(1, val)));
    }
    return result;
  }

  seek(timeMs) {
    const timeSec = timeMs / 1000;
    if (isFinite(timeSec)) {
      this.audio.currentTime = timeSec;
    }
  }

  setVolume(v) {
    this.audio.volume = Math.max(0, Math.min(1, v));
  }

  get currentTime() { return this.audio.currentTime * 1000; }
  get duration() { return this.audio.duration * 1000; }
  get isPlaying() { return !this.audio.paused; }
  get volume() { return this.audio.volume; }
  get isLoading() { return this._isLoading; }
  get currentUrl() { return this._currentUrl; }
  get audioInfo() { return this._audioInfo; }

  destroy() {
    this.audio.pause();
    this.audio.src = '';
    this._listeners.clear();
    AudioManager.instance = null;
    console.log('[Audio] Destroyed');
  }
}

export const audioManager = new AudioManager();
export default audioManager;
