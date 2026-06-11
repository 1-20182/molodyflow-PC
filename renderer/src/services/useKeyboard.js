/**
 * 全局键盘快捷键
 */
import { useEffect } from 'react';

export function useKeyboard(shortcuts) {
  useEffect(() => {
    const handler = (e) => {
      // 如果输入框聚焦，不触发快捷键
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      for (const { key, ctrl, shift, alt, fn } of shortcuts) {
        if (e.key === key &&
            (ctrl === undefined || e.ctrlKey === ctrl) &&
            (shift === undefined || e.shiftKey === shift) &&
            (alt === undefined || e.altKey === alt)) {
          e.preventDefault();
          fn(e);
          return;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
