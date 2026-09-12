import { Lottie } from 'lottie-react';
import { useDraggablePosition } from '../hooks/useDraggablePosition.js';

const STORAGE_KEY = 'troit-lottie-sticker-pos';

export default function DraggableLottie({ animationData, size = 90 }) {
  const { ref, pos, handlers } = useDraggablePosition(STORAGE_KEY, size, {
    x: 24,
    y: window.innerHeight - size - 100,
  });

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="floating-sticker floating-lottie"
      style={{ left: pos.x, top: pos.y, width: size, height: size }}
      {...handlers}
    >
      <Lottie src={animationData} loop autoplay style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
