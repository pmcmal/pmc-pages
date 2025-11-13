"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Player
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 30;
const PLAYER_SPEED = 5;
const PLAYER_SHOOT_COOLDOWN = 15;

// Bullets
const BULLET_WIDTH = 4;
const BULLET_HEIGHT = 10;
const PLAYER_BULLET_SPEED = 7;
const ENEMY_BULLET_SPEED = 3;

// Invaders
const INVADER_ROWS = 5;
const INVADER_COLS = 11;
const INVADER_WIDTH = 30;
const INVADER_HEIGHT = 20;
const INVADER_PADDING = 10;
const INVADER_START_X = 100;
const INVADER_START_Y = 50;
const INVADER_DESCEND_AMOUNT = 20;
const INVADER_SPEED_INCREMENT = 0.1;
const ENEMY_SHOOT_INTERVAL = 1000; // ms

interface Bullet {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
}

interface Invader {
    x: number;
    y: number;
    width: number;
    height: number;
    alive: boolean;
    type: 'strong' | 'normal';
    points: number;
}

interface Player {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    canShoot: boolean;
    shootCooldown: number;
}

interface GameState {
    score: number;
    lives: number;
    isGameOver: boolean;
    isVictory: boolean;
    isPaused: boolean;
}

const SpaceInvadersGame = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const lastEnemyShotRef = useRef<number>(0);
    const keysRef = useRef<{ [key: string]: boolean }>({});

    const [gameState, setGameState] = useState<GameState>({
        score: 0,
        lives: 3,
        isGameOver: false,
        isVictory: false,
        isPaused: false,
    });
    const [player, setPlayer] = useState<Player>({
        x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
        y: CANVAS_HEIGHT - 60,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        speed: PLAYER_SPEED,
        canShoot: true,
        shootCooldown: 0,
    });
    const [bullets, setBullets] = useState<Bullet[]>([]);
    const [enemyBullets, setEnemyBullets] = useState<Bullet[]>([]);
    const [invaders, setInvaders] = useState<Invader[]>([]);
    const [invaderDirection, setInvaderDirection] = useState<1 | -1>(1);
    const [invaderSpeed, setInvaderSpeed] = useState<number>(0.5);

    const initInvaders = useCallback(() => {
        const newInvaders: Invader[] = [];
        for (let row = 0; row < INVADER_ROWS; row++) {
            for (let col = 0; col < INVADER_COLS; col++) {
                newInvaders.push({
                    x: INVADER_START_X + col * (INVADER_WIDTH + INVADER_PADDING),
                    y: INVADER_START_Y + row * (INVADER_HEIGHT + INVADER_PADDING),
                    width: INVADER_WIDTH,
                    height: INVADER_HEIGHT,
                    alive: true,
                    type: row < 2 ? 'strong' : 'normal',
                    points: row < 2 ? 20 : 10,
                });
            }
        }
        setInvaders(newInvaders);
    }, []);

    const resetGame = useCallback(() => {
        setGameState({
            score: 0,
            lives: 3,
            isGameOver: false,
            isVictory: false,
            isPaused: false,
        });
        setPlayer({
            x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
            y: CANVAS_HEIGHT - 60,
            width: PLAYER_WIDTH,
            height: PLAYER_HEIGHT,
            speed: PLAYER_SPEED,
            canShoot: true,
            shootCooldown: 0,
        });
        setBullets([]);
        setEnemyBullets([]);
        setInvaderDirection(1);
        setInvaderSpeed(0.5);
        lastEnemyShotRef.current = 0;
        initInvaders();
    }, [initInvaders]);

    const drawPlayer = useCallback((ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(player.x + player.width / 2, player.y);
        ctx.lineTo(player.x, player.y + player.height);
        ctx.lineTo(player.x + player.width, player.y + player.height);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(player.x + player.width / 2 - 2, player.y - 5, 4, 8);
    }, [player]);

    const drawInvader = useCallback((ctx: CanvasRenderingContext2D, invader: Invader) => {
        if (!invader.alive) return;
        ctx.fillStyle = invader.type === 'strong' ? '#ff00ff' : '#00ffff';
        ctx.fillRect(invader.x, invader.y, invader.width, invader.height);
        ctx.fillStyle = '#000';
        ctx.fillRect(invader.x + 5, invader.y + 5, 4, 4);
        ctx.fillRect(invader.x + invader.width - 9, invader.y + 5, 4, 4);
        ctx.strokeStyle = invader.type === 'strong' ? '#ff00ff' : '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(invader.x + 8, invader.y);
        ctx.lineTo(invader.x + 8, invader.y - 5);
        ctx.moveTo(invader.x + invader.width - 8, invader.y);
        ctx.lineTo(invader.x + invader.width - 8, invader.y - 5);
        ctx.stroke();
    }, []);

    const drawBullets = useCallback((ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = '#ffff00';
        bullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        ctx.fillStyle = '#ff0000';
        enemyBullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
    }, [bullets, enemyBullets]);

    const updateGame = useCallback(() => {
        if (gameState.isGameOver || gameState.isVictory || gameState.isPaused) return;

        // Player movement
        setPlayer(prevPlayer => {
            const newPlayer = { ...prevPlayer };
            if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) {
                newPlayer.x = Math.max(0, newPlayer.x - newPlayer.speed);
            }
            if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) {
                newPlayer.x = Math.min(CANVAS_WIDTH - newPlayer.width, newPlayer.x + newPlayer.speed);
            }

            // Player shooting
            if ((keysRef.current[' '] || keysRef.current['Space']) && newPlayer.canShoot && newPlayer.shootCooldown <= 0) {
                setBullets(prevBullets => [
                    ...prevBullets,
                    {
                        x: newPlayer.x + newPlayer.width / 2 - BULLET_WIDTH / 2,
                        y: newPlayer.y - BULLET_HEIGHT,
                        width: BULLET_WIDTH,
                        height: BULLET_HEIGHT,
                        speed: PLAYER_BULLET_SPEED,
                    },
                ]);
                newPlayer.shootCooldown = PLAYER_SHOOT_COOLDOWN;
            }
            if (newPlayer.shootCooldown > 0) {
                newPlayer.shootCooldown--;
            }
            return newPlayer;
        });

        // Invader movement
        setInvaders(prevInvaders => {
            let shouldDescend = false;
            const newInvaders = prevInvaders.map(invader => ({ ...invader }));

            newInvaders.forEach(invader => {
                if (!invader.alive) return;
                if (invader.x <= 0 || invader.x + invader.width >= CANVAS_WIDTH) {
                    shouldDescend = true;
                }
            });

            if (shouldDescend) {
                setInvaderDirection(prev => prev * -1 as 1 | -1);
                setInvaderSpeed(prev => prev + INVADER_SPEED_INCREMENT);
                newInvaders.forEach(invader => {
                    invader.y += INVADER_DESCEND_AMOUNT;
                });
            }

            newInvaders.forEach(invader => {
                if (!invader.alive) return;
                invader.x += invaderSpeed * invaderDirection;
            });
            return newInvaders;
        });

        // Enemy shooting
        if (Date.now() - lastEnemyShotRef.current > ENEMY_SHOOT_INTERVAL) {
            const aliveInvaders = invaders.filter(i => i.alive);
            if (aliveInvaders.length > 0) {
                const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
                setEnemyBullets(prevEnemyBullets => [
                    ...prevEnemyBullets,
                    {
                        x: shooter.x + shooter.width / 2 - BULLET_WIDTH / 2,
                        y: shooter.y + shooter.height,
                        width: BULLET_WIDTH,
                        height: BULLET_HEIGHT,
                        speed: ENEMY_BULLET_SPEED,
                    },
                ]);
                lastEnemyShotRef.current = Date.now();
            }
        }

        // Update bullets
        setBullets(prevBullets => prevBullets.map(b => ({ ...b, y: b.y - b.speed })).filter(b => b.y > 0));
        setEnemyBullets(prevEnemyBullets => prevEnemyBullets.map(b => ({ ...b, y: b.y + b.speed })).filter(b => b.y < CANVAS_HEIGHT));

        // Check collisions
        let newScore = gameState.score;
        let newLives = gameState.lives;
        let newInvaders = invaders.map(inv => ({ ...inv }));
        let newBullets = [...bullets];
        let newEnemyBullets = [...enemyBullets];

        // Player bullets vs invaders
        for (let i = newBullets.length - 1; i >= 0; i--) {
            for (let j = newInvaders.length - 1; j >= 0; j--) {
                const bullet = newBullets[i];
                const invader = newInvaders[j];
                if (!invader.alive) continue;

                if (bullet.x < invader.x + invader.width &&
                    bullet.x + bullet.width > invader.x &&
                    bullet.y < invader.y + invader.height &&
                    bullet.y + bullet.height > invader.y) {

                    invader.alive = false;
                    newBullets.splice(i, 1);
                    newScore += invader.points;
                    break;
                }
            }
        }

        // Enemy bullets vs player
        for (let i = newEnemyBullets.length - 1; i >= 0; i--) {
            const bullet = newEnemyBullets[i];
            if (bullet.x < player.x + player.width &&
                bullet.x + bullet.width > player.x &&
                bullet.y < player.y + player.height &&
                bullet.y + bullet.height > player.y) {

                newEnemyBullets.splice(i, 1);
                newLives--;
                break;
            }
        }

        // Invaders reach player
        newInvaders.forEach(invader => {
            if (!invader.alive) return;
            if (invader.y + invader.height >= player.y) {
                newLives = 0; // All lives lost if invaders reach player
            }
        });

        setGameState(prev => ({ ...prev, score: newScore, lives: newLives }));
        setInvaders(newInvaders);
        setBullets(newBullets);
        setEnemyBullets(newEnemyBullets);

        // Check game over / victory conditions
        if (newLives <= 0) {
            setGameState(prev => ({ ...prev, isGameOver: true }));
        } else {
            const aliveInvaders = newInvaders.filter(i => i.alive);
            if (aliveInvaders.length === 0) {
                setGameState(prev => ({ ...prev, isVictory: true }));
            }
        }

    }, [gameState.isGameOver, gameState.isVictory, gameState.isPaused, player, invaders, invaderDirection, invaderSpeed, bullets, enemyBullets]);

    // Main game loop effect
    useEffect(() => {
        const gameLoop = () => {
            updateGame();
            animationFrameIdRef.current = requestAnimationFrame(gameLoop);
        };

        if (!gameState.isGameOver && !gameState.isVictory && !gameState.isPaused) {
            animationFrameIdRef.current = requestAnimationFrame(gameLoop);
        } else if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
        }

        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
        };
    }, [gameState.isGameOver, gameState.isVictory, gameState.isPaused, updateGame]);

    // Drawing effect
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        drawPlayer(ctx);
        invaders.forEach(invader => drawInvader(ctx, invader));
        drawBullets(ctx);
    }, [player, invaders, bullets, enemyBullets, drawPlayer, drawInvader, drawBullets]);

    // Keyboard event listeners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysRef.current[e.key] = true;
            if (e.key === ' ' || e.key === 'Space') {
                e.preventDefault(); // Prevent scrolling
            }
            if (e.key === 'p' || e.key === 'P') {
                setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
            }
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

    // Initialize game on mount
    useEffect(() => {
        resetGame();
    }, [resetGame]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#000428] to-[#004e92] p-4">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-green-400 mb-4 glow-text">
                    <Rocket className="inline-block mr-2" size={36} />
                    SPACE INVADERS
                </h1>

                <div className="flex justify-between mb-4 px-4 max-w-[800px] mx-auto">
                    <div className="text-green-400 text-xl glow-text">
                        Punkty: <span id="score">{gameState.score}</span>
                    </div>
                    <div className="text-green-400 text-xl glow-text">
                        Życia: <span id="lives">{gameState.lives}</span>
                    </div>
                </div>

                <div className="relative">
                    <canvas id="gameCanvas" ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-black"></canvas>

                    {(gameState.isGameOver || gameState.isVictory || gameState.isPaused) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                            <div className="text-center">
                                {gameState.isGameOver && (
                                    <p id="gameOver" className="text-4xl text-red-400 glow-text blink mb-4">GAME OVER</p>
                                )}
                                {gameState.isVictory && (
                                    <p id="victory" className="text-4xl text-yellow-400 glow-text blink mb-4">ZWYCIĘSTWO!</p>
                                )}
                                {gameState.isPaused && !gameState.isGameOver && !gameState.isVictory && (
                                    <p className="text-4xl text-blue-400 glow-text blink mb-4">PAUZA</p>
                                )}
                                <Button
                                    id="restartBtn"
                                    onClick={resetGame}
                                    className="mt-4 px-6 py-2 bg-green-500 text-black font-bold rounded hover:bg-green-400 transition"
                                >
                                    RESTART
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-4 text-green-400">
                    <p className="mb-2">Użyj strzałek ← → lub A/D do poruszania</p>
                    <p className="mb-2">Spacja - strzelanie</p>
                    <p>P - pauza</p>
                </div>
            </div>
        </div>
    );
};

export default SpaceInvadersGame;