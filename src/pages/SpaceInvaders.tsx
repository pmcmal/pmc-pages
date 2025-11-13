"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const SpaceInvaders = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number | null>(null);

    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isVictory, setIsVictory] = useState(false);

    // Player state
    const playerRef = useRef({
        x: CANVAS_WIDTH / 2 - 20,
        y: CANVAS_HEIGHT - 60,
        width: 40,
        height: 30,
        speed: 5,
        canShoot: true,
        shootCooldown: 0
    });

    // Bullets state
    const bulletsRef = useRef<any[]>([]);
    const enemyBulletsRef = useRef<any[]>([]);

    // Invaders state
    const invadersRef = useRef<any[]>([]);
    const invaderRows = 5;
    const invaderCols = 11;
    const invaderWidth = 30;
    const invaderHeight = 20;
    const invaderPadding = 10;
    const invaderDirectionRef = useRef(1);
    const invaderSpeedRef = useRef(0.5);
    const lastEnemyShotRef = useRef(0);

    // Controls
    const keysRef = useRef<{ [key: string]: boolean }>({});

    const initInvaders = useCallback(() => {
        invadersRef.current = [];
        for (let row = 0; row < invaderRows; row++) {
            for (let col = 0; col < invaderCols; col++) {
                invadersRef.current.push({
                    x: 100 + col * (invaderWidth + invaderPadding),
                    y: 50 + row * (invaderHeight + invaderPadding),
                    width: invaderWidth,
                    height: invaderHeight,
                    alive: true,
                    type: row < 2 ? 'strong' : 'normal',
                    points: row < 2 ? 20 : 10
                });
            }
        }
    }, []);

    const drawPlayer = useCallback((ctx: CanvasRenderingContext2D) => {
        const player = playerRef.current;
        ctx.fillStyle = '#00ff00';
        // Korpus statku
        ctx.beginPath();
        ctx.moveTo(player.x + player.width / 2, player.y);
        ctx.lineTo(player.x, player.y + player.height);
        ctx.lineTo(player.x + player.width, player.y + player.height);
        ctx.closePath();
        ctx.fill();
        
        // Działo
        ctx.fillRect(player.x + player.width / 2 - 2, player.y - 5, 4, 8);
    }, []);

    const drawInvader = useCallback((ctx: CanvasRenderingContext2D, invader: any) => {
        if (!invader.alive) return;
        
        ctx.fillStyle = invader.type === 'strong' ? '#ff00ff' : '#00ffff';
        
        // Prosty kształt najeźdźcy
        ctx.fillRect(invader.x, invader.y, invader.width, invader.height);
        
        // Oczy
        ctx.fillStyle = '#000';
        ctx.fillRect(invader.x + 5, invader.y + 5, 4, 4);
        ctx.fillRect(invader.x + invader.width - 9, invader.y + 5, 4, 4);
        
        // Anteny
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
        bulletsRef.current.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        ctx.fillStyle = '#ff0000';
        enemyBulletsRef.current.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
    }, []);

    const movePlayer = useCallback(() => {
        const player = playerRef.current;
        const keys = keysRef.current;

        if (keys['ArrowLeft'] && player.x > 0) {
            player.x -= player.speed;
        }
        if (keys['ArrowRight'] && player.x < CANVAS_WIDTH - player.width) {
            player.x += player.speed;
        }
        
        // Strzelanie
        if (keys[' '] && player.canShoot && player.shootCooldown <= 0) {
            bulletsRef.current.push({
                x: player.x + player.width / 2 - 2,
                y: player.y - 10,
                width: 4,
                height: 10,
                speed: 7
            });
            player.shootCooldown = 15;
        }
        
        if (player.shootCooldown > 0) {
            player.shootCooldown--;
        }
    }, []);

    const moveInvaders = useCallback(() => {
        let shouldDescend = false;
        
        invadersRef.current.forEach(invader => {
            if (!invader.alive) return;
            if (invader.x <= 0 || invader.x + invader.width >= CANVAS_WIDTH) {
                shouldDescend = true;
            }
        });
        
        if (shouldDescend) {
            invaderDirectionRef.current *= -1;
            invadersRef.current.forEach(invader => {
                invader.y += 20;
            });
            invaderSpeedRef.current += 0.1;
        }
        
        invadersRef.current.forEach(invader => {
            if (!invader.alive) return;
            invader.x += invaderSpeedRef.current * invaderDirectionRef.current;
        });
    }, []);

    const enemyShoot = useCallback(() => {
        if (Date.now() - lastEnemyShotRef.current < 1000) return;
        
        const aliveInvaders = invadersRef.current.filter(i => i.alive);
        if (aliveInvaders.length === 0) return;
        
        const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
        enemyBulletsRef.current.push({
            x: shooter.x + shooter.width / 2 - 2,
            y: shooter.y + shooter.height,
            width: 4,
            height: 10,
            speed: 3
        });
        
        lastEnemyShotRef.current = Date.now();
    }, []);

    const updateBullets = useCallback(() => {
        // Player bullets
        for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
            bulletsRef.current[i].y -= bulletsRef.current[i].speed;
            if (bulletsRef.current[i].y < 0) {
                bulletsRef.current.splice(i, 1);
            }
        }
        
        // Enemy bullets
        for (let i = enemyBulletsRef.current.length - 1; i >= 0; i--) {
            enemyBulletsRef.current[i].y += enemyBulletsRef.current[i].speed;
            if (enemyBulletsRef.current[i].y > CANVAS_HEIGHT) {
                enemyBulletsRef.current.splice(i, 1);
            }
        }
    }, []);

    const checkCollisions = useCallback(() => {
        const player = playerRef.current;

        // Player bullets vs invaders
        for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
            const bullet = bulletsRef.current[i];
            for (let j = invadersRef.current.length - 1; j >= 0; j--) {
                const invader = invadersRef.current[j];
                if (!invader.alive) continue;
                
                if (bullet.x < invader.x + invader.width &&
                    bullet.x + bullet.width > invader.x &&
                    bullet.y < invader.y + invader.height &&
                    bullet.y + bullet.height > invader.y) {
                    
                    invader.alive = false;
                    bulletsRef.current.splice(i, 1);
                    setScore(prev => prev + invader.points);
                    break; // Bullet hit one invader, so it's gone
                }
            }
        }
        
        // Enemy bullets vs player
        for (let i = enemyBulletsRef.current.length - 1; i >= 0; i--) {
            const bullet = enemyBulletsRef.current[i];
            if (bullet.x < player.x + player.width &&
                bullet.x + bullet.width > player.x &&
                bullet.y < player.y + player.height &&
                bullet.y + bullet.height > player.y) {
                
                enemyBulletsRef.current.splice(i, 1);
                setLives(prev => prev - 1);
                
                if (lives - 1 <= 0) {
                    setIsGameOver(true);
                }
            }
        }
        
        // Invaders vs player
        invadersRef.current.forEach(invader => {
            if (!invader.alive) return;
            if (invader.y + invader.height >= player.y) {
                setIsGameOver(true);
            }
        });
    }, [lives]);

    const checkVictory = useCallback(() => {
        const aliveInvaders = invadersRef.current.filter(i => i.alive);
        if (aliveInvaders.length === 0) {
            setIsVictory(true);
        }
    }, []);

    const resetGame = useCallback(() => {
        setScore(0);
        setLives(3);
        setIsGameOver(false);
        setIsVictory(false);

        playerRef.current = {
            x: CANVAS_WIDTH / 2 - 20,
            y: CANVAS_HEIGHT - 60,
            width: 40,
            height: 30,
            speed: 5,
            canShoot: true,
            shootCooldown: 0
        };
        
        bulletsRef.current = [];
        enemyBulletsRef.current = [];
        
        invaderSpeedRef.current = 0.5;
        invaderDirectionRef.current = 1;
        lastEnemyShotRef.current = 0;
        
        initInvaders();
    }, [initInvaders]);

    // Main game loop
    const gameLoop = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        if (!isGameOver && !isVictory) {
            movePlayer();
            moveInvaders();
            enemyShoot();
            updateBullets();
            checkCollisions();
            checkVictory();
        }
        
        drawPlayer(ctx);
        invadersRef.current.forEach(invader => drawInvader(ctx, invader));
        drawBullets(ctx);
        
        animationFrameId.current = requestAnimationFrame(gameLoop);
    }, [isGameOver, isVictory, movePlayer, moveInvaders, enemyShoot, updateBullets, checkCollisions, checkVictory, drawPlayer, drawInvader, drawBullets]);

    // Keyboard event listeners
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

    // Start/Stop game loop
    useEffect(() => {
        if (!isGameOver && !isVictory) {
            resetGame(); // Reset game state on initial load or restart
            animationFrameId.current = requestAnimationFrame(gameLoop);
        } else if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [isGameOver, isVictory, gameLoop, resetGame]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 space-invaders-bg">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-green-400 mb-4 glow-text flex items-center justify-center gap-2">
                    <Rocket className="text-green-400" size={36} />
                    SPACE INVADERS
                </h1>
                
                <div className="flex justify-between mb-4 px-4">
                    <div className="text-green-400 text-xl glow-text">
                        Punkty: <span id="score">{score}</span>
                    </div>
                    <div className="text-green-400 text-xl glow-text">
                        Życia: <span id="lives">{lives}</span>
                    </div>
                </div>
                
                <canvas id="gameCanvas" ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-black"></canvas>
                
                <div className="mt-4 text-green-400">
                    <p className="mb-2">Użyj strzałek ← → do poruszania</p>
                    <p className="mb-2">Spacja - strzelanie</p>
                    {isGameOver && (
                        <p id="gameOver" className="text-2xl text-red-400 glow-text blink">GAME OVER</p>
                    )}
                    {isVictory && (
                        <p id="victory" className="text-2xl text-yellow-400 glow-text blink">ZWYCIĘSTWO!</p>
                    )}
                    {(isGameOver || isVictory) && (
                        <Button
                            id="restartBtn"
                            onClick={resetGame}
                            className="mt-4 px-6 py-2 bg-green-500 text-black font-bold rounded hover:bg-green-400 transition"
                        >
                            RESTART
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SpaceInvaders;