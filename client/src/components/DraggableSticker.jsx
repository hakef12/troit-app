import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'troit-sticker-pos';

function clamp(x, y, size) {
  const margin = 8;
  const maxX = Math.max(window.innerWidth - size - margin, margin);
  const maxY = Math.max(window.innerHeight - size - margin, margin);
  return { x: Math.min(Math.max(x, margin), maxX), y: Math.min(Math.max(y, margin), maxY) };
}

export default function DraggableSticker({ src, size = 64 }) {
  const ref = useRef(null);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  const [pos, setPos] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
        return clamp(saved.x, saved.y, size);
      }
    } catch {
      // ignore corrupted storage
    }
    return clamp(window.innerWidth - size - 24, window.innerHeight - size - 100, size);
  });

  useEffect(() => {
    function onResize() {
      setPos((p) => clamp(p.x, p.y, size));
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [size]);

  function handlePointerDown(e) {
    draggingRef.current = true;
    movedRef.current = false;
    const rect = ref.current.getBoundingClientRect();
    offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    ref.current.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!draggingRef.current) return;
    movedRef.current = true;
    setPos(clamp(e.clientX - offsetRef.current.x, e.clientY - offsetRef.current.y, size));
  }

  function handlePointerUp(e) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      ref.current.releasePointerCapture(e.pointerId);
    } catch {
      // pointer capture may already be released
    }
    setPos((p) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      return p;
    });
  }

  return (
    <img
      ref={ref}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="floating-sticker"
      style={{ left: pos.x, top: pos.y, width: size }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
