import { useDraggablePosition } from '../hooks/useDraggablePosition.js';

const STORAGE_KEY = 'troit-sticker-pos';

export default function DraggableSticker({ src, size = 64 }) {
  const { ref, pos, handlers } = useDraggablePosition(STORAGE_KEY, size, {
    x: window.innerWidth - size - 24,
    y: window.innerHeight - size - 100,
  });

  return (
    <img
      ref={ref}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="floating-sticker"
      style={{ left: pos.x, top: pos.y, width: size }}
      {...handlers}
    />
  );
}
