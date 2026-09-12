import { useEffect, useRef, useState } from 'react';
import mascotImg from '../assets/mascot-sticker.png';

const WIDTH = 760;
const HEIGHT = 320;
const GROUND_Y = HEIGHT - 36;
const GRAVITY = 1.05;
const JUMP_VELOCITY = -16;
const PLAYER_SIZE = 60;
const PLAYER_X = 60;
const OBSTACLE_EMOJIS = ['🥤', '📦', '🍾'];
const HIGH_SCORE_KEY = 'troit-runner-highscore';

export default function TroitRunnerGame() {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [phase, setPhase] = useState('idle'); // idle | playing | gameover
  const [imgReady, setImgReady] = useState(false);
  const stateRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.src = mascotImg;
    img.onload = () => setImgReady(true);
    imgRef.current = img;
  }, []);

  function resetState() {
    stateRef.current = {
      playerY: GROUND_Y - PLAYER_SIZE,
      velocityY: 0,
      onGround: true,
      obstacles: [],
      speed: 5,
      distance: 0,
      spawnTimer: 0,
      nextSpawnIn: 60,
    };
  }

  function jump() {
    const s = stateRef.current;
    if (s && s.onGround) {
      s.velocityY = JUMP_VELOCITY;
      s.onGround = false;
    }
  }

  function startGame() {
    resetState();
    setPhase('playing');
  }

  function handleAction() {
    if (phase === 'idle' || phase === 'gameover') {
      startGame();
    } else if (phase === 'playing') {
      jump();
    }
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleAction();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let rafId;

    function tick() {
      const s = stateRef.current;

      // Física del salto
      s.velocityY += GRAVITY;
      s.playerY += s.velocityY;
      if (s.playerY >= GROUND_Y - PLAYER_SIZE) {
        s.playerY = GROUND_Y - PLAYER_SIZE;
        s.velocityY = 0;
        s.onGround = true;
      }

      // Obstáculos
      s.spawnTimer++;
      if (s.spawnTimer >= s.nextSpawnIn) {
        s.spawnTimer = 0;
        s.nextSpawnIn = 55 + Math.floor(Math.random() * 50);
        const size = 38 + Math.floor(Math.random() * 15);
        s.obstacles.push({
          x: WIDTH,
          size,
          emoji: OBSTACLE_EMOJIS[Math.floor(Math.random() * OBSTACLE_EMOJIS.length)],
        });
      }
      s.obstacles.forEach((o) => {
        o.x -= s.speed;
      });
      s.obstacles = s.obstacles.filter((o) => o.x + o.size > 0);

      s.distance += s.speed;
      s.speed = 5 + Math.floor(s.distance / 800) * 0.5;

      // Colisión (hitbox un poco más chica que el sprite, para que sea justo)
      const playerBox = {
        x: PLAYER_X + 6,
        y: s.playerY + 6,
        w: PLAYER_SIZE - 12,
        h: PLAYER_SIZE - 12,
      };
      const hit = s.obstacles.some((o) => {
        const ob = { x: o.x + 4, y: GROUND_Y - o.size + 4, w: o.size - 8, h: o.size - 8 };
        return (
          playerBox.x < ob.x + ob.w &&
          playerBox.x + playerBox.w > ob.x &&
          playerBox.y < ob.y + ob.h &&
          playerBox.y + playerBox.h > ob.y
        );
      });

      if (hit) {
        const score = Math.floor(s.distance / 10);
        const best = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
        if (score > best) localStorage.setItem(HIGH_SCORE_KEY, String(score));
        setPhase('gameover');
        return;
      }

      // Dibujar
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.strokeStyle = '#c81f28';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(WIDTH, GROUND_Y);
      ctx.stroke();

      if (imgRef.current) {
        ctx.drawImage(imgRef.current, PLAYER_X, s.playerY, PLAYER_SIZE, PLAYER_SIZE);
      }

      ctx.textBaseline = 'alphabetic';
      s.obstacles.forEach((o) => {
        ctx.font = `${o.size}px sans-serif`;
        ctx.fillText(o.emoji, o.x, GROUND_Y + 2);
      });

      ctx.fillStyle = '#111';
      ctx.font = 'bold 20px sans-serif';
      const score = Math.floor(s.distance / 10);
      ctx.fillText(`Puntaje: ${score}`, WIDTH - 190, 30);

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phase]);

  const bestScore = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
  const lastScore = stateRef.current ? Math.floor(stateRef.current.distance / 10) : 0;

  return (
    <div className="runner-game">
      <div className="runner-canvas-wrap" onClick={handleAction}>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="runner-canvas" />
        {phase !== 'playing' && (
          <div className="runner-overlay">
            {phase === 'idle' && imgReady && <p>Tocá o presioná espacio para jugar</p>}
            {phase === 'gameover' && (
              <>
                <p>¡Chocaste! Puntaje: {lastScore}</p>
                <p className="muted small">Mejor puntaje: {bestScore}</p>
                <p>Tocá para volver a intentar</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
