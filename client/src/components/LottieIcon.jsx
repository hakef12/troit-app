import { Lottie } from 'lottie-react';

export default function LottieIcon({ animationData, size = 32, loop = true, className, style }) {
  return (
    <Lottie
      src={animationData}
      loop={loop}
      autoplay
      style={{ width: size, height: size, ...style }}
      className={className}
    />
  );
}
