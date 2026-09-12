import { useEffect, useRef, useState } from 'react';

function clamp(x, y, size) {
  const margin = 8;
  const maxX = Math.max(window.innerWidth - size - margin, margin);
  const maxY = Math.max(window.innerHeight - size - margin, margin);
  return { x: Math.min(Math.max(x, margin), maxX), y: Math.min(Math.max(y, margin), maxY) };
}

export function useDraggablePosition(storageKey, size, defaultPos) {
  const ref = useRef(null);
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  const [pos, setPos] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
        return clamp(saved.x, saved.y, size);
      }
    } catch {
      // ignore corrupted storage
    }
    return clamp(defaultPos.x, defaultPos.y, size);
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
    const rect = ref.current.getBoundingClientRect();
    offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    ref.current.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!draggingRef.current) return;
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
      localStorage.setItem(storageKey, JSON.stringify(p));
      return p;
    });
  }

  return {
    ref,
    pos,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  };
}
