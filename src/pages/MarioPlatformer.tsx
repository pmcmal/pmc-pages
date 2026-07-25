"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Gamepad2 } from 'lucide-react';
import { SiteHomeButton } from '@/components/SiteHomeButton';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 500;
const GRAVITY = 0.6;
const JUMP_FORCE = -13;
const MOVE_SPEED = 4;
const GROUND_Y = 460;

interface Platform {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Enemy {
    x: number;
    y: number;
    width: number;
    height: number;
    alive: boolean;
    direction: number;
    patrolMin: number;
    patrolMax: number;
    speed: number;
}

interface Coin {
    x: number;
    y: number;
    radius: number;
    collected: boolean;
}

const PLAYER_START = { x: 30, y: GROUND_Y - 40 };

const PLATFORMS: Platform[] = [
    { x: 0, y: GROUND_Y, width: 280, height: 40 },
    { x: 380, y: GROUND_Y, width: 520, height: 40 },
    { x: 150, y: 350, width: 100, height: 20 },
    { x: 420, y: 320, width: 100, height: 20 },
    { x: 600, y: 250, width: 100, height: 20 },
    { x: 750, y: 380, width: 100, height: 20 },
];

const FLAG = { x: 855, y: 200, width: 10, height: 260 };

const MarioPlatformer = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number | null>(null);

    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isVictory, setIsVictory] = useState(false);

    const playerRef = useRef({
        x: PLAYER_START.x,
        y: PLAYER_START.y,
        width: 32,
        height: 40,
        velocityX: 0,
        velocityY: 0,
        isGrounded: false,
        facingRight: true,
        invulnerableFrames: 0,
    });

    const enemiesRef = useRef<Enemy[]>([]);
    const coinsRef = useRef<Coin[]>([]);
    const keysRef = useRef<{ [key: string]: boolean }>({});

    const initLevel = useCallback(() => {
        enemiesRef.current = [
            { x: 180, y: GROUND_Y - 30, width: 30, height: 30, alive: true, direction: 1, patrolMin: 50, patrolMax: 240, speed: 1.2 },
            { x: 450, y: GROUND_Y - 30, width: 30, height: 30, alive: true, direction: 1, patrolMin: 400, patrolMax: 620, speed: 1.5 },
            { x: 620, y: 220, width: 30, height: 30, alive: true, direction: 1, patrolMin: 600, patrolMax: 670, speed: 1 },
        ];
        coinsRef.current = [
            { x: 190, y: 320, radius: 10, collected: false },
            { x: 460, y: 290, radius: 10, collected: false },
            { x: 640, y: 220, radius: 10, collected: false },
            { x: 790, y: 350, radius: 10, collected: false },
            { x: 500, y: GROUND_Y - 30, radius: 10, collected: false },
            { x: 800, y: GROUND_Y - 30, radius: 10, collected: false },
        ];
    }, []);

    const resetGame = useCallback(() => {
        setScore(0);
        setLives(3);
        setIsGameOver(false);
        setIsVictory(false);
        playerRef.current = {
            x: PLAYER_START.x,
            y: PLAYER_START.y,
            width: 32,
            height: 40,
            velocityX: 0,
            velocityY: 0,
            isGrounded: false,
            facingRight: true,
            invulnerableFrames: 0,
        };
        initLevel();
    }, [initLevel]);

    const respawnPlayer = useCallback(() => {
        const player = playerRef.current;
        player.x = PLAYER_START.x;
        player.y = PLAYER_START.y;
        player.velocityX = 0;
        player.velocityY = 0;
        player.invulnerableFrames = 60;
    }, []);

    const loseLife = useCallback(() => {
        setLives((prev) => {
            const next = prev - 1;
            if (next <= 0) {
                setIsGameOver(true);
            } else {
                respawnPlayer();
            }
            return next;
        });
    }, [respawnPlayer]);

    const updatePlayer = useCallback(() => {
        const player = playerRef.current;
        const keys = keysRef.current;

        if (keys['ArrowLeft']) {
            player.velocityX = -MOVE_SPEED;
            player.facingRight = false;
        } else if (keys['ArrowRight']) {
            player.velocityX = MOVE_SPEED;
            player.facingRight = true;
        } else {
            player.velocityX = 0;
        }

        if ((keys[' '] || keys['ArrowUp']) && player.isGrounded) {
            player.velocityY = JUMP_FORCE;
            player.isGrounded = false;
        }

        player.velocityY += GRAVITY;
        player.x += player.velocityX;
        player.y += player.velocityY;

        if (player.x < 0) player.x = 0;
        if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;

        player.isGrounded = false;
        PLATFORMS.forEach((platform) => {
            const wasAbove = player.y + player.height - player.velocityY <= platform.y;
            if (
                player.x + player.width > platform.x &&
                player.x < platform.x + platform.width &&
                player.y + player.height >= platform.y &&
                player.y + player.height <= platform.y + platform.height + 20 &&
                wasAbove &&
                player.velocityY >= 0
            ) {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.isGrounded = true;
            }
        });

        if (player.invulnerableFrames > 0) player.invulnerableFrames--;

        // Wpadl w przepasc
        if (player.y > CANVAS_HEIGHT) {
            loseLife();
        }
    }, [loseLife]);

    const updateEnemies = useCallback(() => {
        enemiesRef.current.forEach((enemy) => {
            if (!enemy.alive) return;
            enemy.x += enemy.speed * enemy.direction;
            if (enemy.x <= enemy.patrolMin || enemy.x + enemy.width >= enemy.patrolMax) {
                enemy.direction *= -1;
            }
        });
    }, []);

    const checkCollisions = useCallback(() => {
        const player = playerRef.current;

        // Gracz vs wrogowie
        enemiesRef.current.forEach((enemy) => {
            if (!enemy.alive) return;
            const overlap =
                player.x < enemy.x + enemy.width &&
                player.x + player.width > enemy.x &&
                player.y < enemy.y + enemy.height &&
                player.y + player.height > enemy.y;

            if (!overlap) return;

            const isStomping = player.velocityY > 0 && player.y + player.height - player.velocityY <= enemy.y + 10;
            if (isStomping) {
                enemy.alive = false;
                player.velocityY = JUMP_FORCE / 1.6;
                setScore((prev) => prev + 50);
            } else if (player.invulnerableFrames <= 0) {
                loseLife();
            }
        });

        // Gracz vs monety
        coinsRef.current.forEach((coin) => {
            if (coin.collected) return;
            const dx = player.x + player.width / 2 - coin.x;
            const dy = player.y + player.height / 2 - coin.y;
            if (Math.hypot(dx, dy) < coin.radius + player.width / 2) {
                coin.collected = true;
                setScore((prev) => prev + 10);
            }
        });

        // Gracz vs flaga
        if (
            player.x + player.width > FLAG.x &&
            player.x < FLAG.x + FLAG.width &&
            player.y + player.height > FLAG.y
        ) {
            setIsVictory(true);
        }
    }, [loseLife]);

    const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#5c94fc');
        gradient.addColorStop(1, '#a8d8ff');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        [[100, 60], [350, 90], [600, 50], [800, 100]].forEach(([cx, cy]) => {
            ctx.beginPath();
            ctx.ellipse(cx, cy, 30, 16, 0, 0, Math.PI * 2);
            ctx.ellipse(cx + 22, cy + 4, 22, 14, 0, 0, Math.PI * 2);
            ctx.ellipse(cx - 22, cy + 6, 20, 12, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.fillStyle = '#4caf50';
        [[60, GROUND_Y], [700, GROUND_Y]].forEach(([hx, hy]) => {
            ctx.beginPath();
            ctx.arc(hx, hy, 60, Math.PI, 0);
            ctx.fill();
        });
    }, []);

    const drawPlatforms = useCallback((ctx: CanvasRenderingContext2D) => {
        PLATFORMS.forEach((platform) => {
            ctx.fillStyle = '#c97a3d';
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            ctx.fillStyle = '#8b4a1f';
            for (let bx = platform.x; bx < platform.x + platform.width; bx += 20) {
                ctx.strokeStyle = '#8b4a1f';
                ctx.strokeRect(bx, platform.y, 20, platform.height);
            }
        });
    }, []);

    const drawCoins = useCallback((ctx: CanvasRenderingContext2D) => {
        coinsRef.current.forEach((coin) => {
            if (coin.collected) return;
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#b8860b';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }, []);

    const drawEnemies = useCallback((ctx: CanvasRenderingContext2D) => {
        enemiesRef.current.forEach((enemy) => {
            if (!enemy.alive) return;
            ctx.fillStyle = '#8b4513';
            ctx.beginPath();
            ctx.ellipse(
                enemy.x + enemy.width / 2,
                enemy.y + enemy.height / 2,
                enemy.width / 2,
                enemy.height / 2,
                0, 0, Math.PI * 2,
            );
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(enemy.x + 10, enemy.y + 14, 4, 0, Math.PI * 2);
            ctx.arc(enemy.x + enemy.width - 10, enemy.y + 14, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(enemy.x + 10, enemy.y + 14, 2, 0, Math.PI * 2);
            ctx.arc(enemy.x + enemy.width - 10, enemy.y + 14, 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }, []);

    const drawFlag = useCallback((ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = '#888';
        ctx.fillRect(FLAG.x + FLAG.width / 2 - 2, FLAG.y, 4, FLAG.height);
        ctx.fillStyle = '#e33';
        ctx.beginPath();
        ctx.moveTo(FLAG.x + FLAG.width / 2, FLAG.y);
        ctx.lineTo(FLAG.x + FLAG.width / 2 + 30, FLAG.y + 15);
        ctx.lineTo(FLAG.x + FLAG.width / 2, FLAG.y + 30);
        ctx.closePath();
        ctx.fill();
    }, []);

    const drawPlayer = useCallback((ctx: CanvasRenderingContext2D) => {
        const player = playerRef.current;
        if (player.invulnerableFrames > 0 && player.invulnerableFrames % 10 < 5) return;

        // Spodnie
        ctx.fillStyle = '#2255cc';
        ctx.fillRect(player.x, player.y + player.height / 2, player.width, player.height / 2);
        // Koszula + czapka
        ctx.fillStyle = '#e33b3b';
        ctx.fillRect(player.x, player.y, player.width, player.height / 2);
        // Twarz
        ctx.fillStyle = '#ffcc99';
        ctx.fillRect(player.x + (player.facingRight ? 10 : 2), player.y + 8, 18, 12);
        // Wasy
        ctx.fillStyle = '#3a2416';
        ctx.fillRect(player.x + (player.facingRight ? 12 : 4), player.y + 16, 14, 3);
    }, []);

    const gameLoop = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (!isGameOver && !isVictory) {
            updatePlayer();
            updateEnemies();
            checkCollisions();
        }

        drawBackground(ctx);
        drawPlatforms(ctx);
        drawCoins(ctx);
        drawEnemies(ctx);
        drawFlag(ctx);
        drawPlayer(ctx);

        animationFrameId.current = requestAnimationFrame(gameLoop);
    }, [isGameOver, isVictory, updatePlayer, updateEnemies, checkCollisions, drawBackground, drawPlatforms, drawCoins, drawEnemies, drawFlag, drawPlayer]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysRef.current[e.key] = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            keysRef.current[e.key] = false;
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useEffect(() => {
        resetGame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = requestAnimationFrame(gameLoop);
        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, [gameLoop]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-sky-400 to-sky-200">
            <SiteHomeButton />
            <div className="text-center">
                <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-[2px_2px_0_rgba(0,0,0,0.3)] flex items-center justify-center gap-2">
                    <Gamepad2 size={36} />
                    SUPER PMC BROS
                </h1>

                <div className="flex justify-between mb-4 px-4">
                    <div className="text-white text-xl font-bold drop-shadow-[1px_1px_0_rgba(0,0,0,0.4)]">
                        Punkty: {score}
                    </div>
                    <div className="text-white text-xl font-bold drop-shadow-[1px_1px_0_rgba(0,0,0,0.4)]">
                        Życia: {lives}
                    </div>
                </div>

                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="border-4 border-gray-800 rounded"
                />

                <div className="mt-4 text-white font-semibold drop-shadow-[1px_1px_0_rgba(0,0,0,0.4)]">
                    <p className="mb-2">Strzałki ← → do ruchu, Spacja / ↑ do skoku</p>
                    <p className="mb-2">Skacz na wrogów, żeby ich pokonać. Dotrzyj do flagi na końcu poziomu!</p>
                    {isGameOver && <p className="text-2xl text-red-600 font-bold">GAME OVER</p>}
                    {isVictory && <p className="text-2xl text-yellow-300 font-bold">POZIOM UKOŃCZONY! 🏁</p>}
                    {(isGameOver || isVictory) && (
                        <Button onClick={resetGame} className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded">
                            ZAGRAJ PONOWNIE
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MarioPlatformer;
