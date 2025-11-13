"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Gamepad2 } from 'lucide-react';

const GRID_SIZE = 20;
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const GRID_WIDTH = CANVAS_WIDTH / GRID_SIZE;
const GRID_HEIGHT = CANVAS_HEIGHT / GRID_SIZE;

const SnakeGame = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameLoopRef = useRef<number | null>(null);

    const [snake, setSnake] = useState<{ x: number; y: number }[]>([]);
    const [food, setFood] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [direction, setDirection] = useState<'up' | 'down' | 'left' | 'right'>('right');
    const [nextDirection, setNextDirection] = useState<'up' | 'down' | 'left' | 'right'>('right');
    const [score, setScore] = useState<number>(0);
    const [highScore, setHighScore] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            return parseInt(localStorage.getItem('snakeHighScore') || '0', 10);
        }
        return 0;
    });
    const [gameSpeed, setGameSpeed] = useState<number>(150);
    const [gameRunning, setGameRunning] = useState<boolean>(false);
    const [gameOver, setGameOver] = useState<boolean>(false);

    const spawnFood = useCallback(() => {
        let newFood: { x: number; y: number };
        let onSnake: boolean;

        do {
            onSnake = false;
            newFood = {
                x: Math.floor(Math.random() * GRID_WIDTH),
                y: Math.floor(Math.random() * GRID_HEIGHT),
            };

            for (const segment of snake) {
                if (segment.x === newFood.x && segment.y === newFood.y) {
                    onSnake = true;
                    break;
                }
            }
        } while (onSnake);

        setFood(newFood);
    }, [snake]);

    const updateScore = useCallback((newScore: number) => {
        setScore(newScore);
        if (newScore > highScore) {
            setHighScore(newScore);
            if (typeof window !== 'undefined') {
                localStorage.setItem('snakeHighScore', newScore.toString());
            }
        }
    }, [highScore]);

    const handleGameOver = useCallback(() => {
        setGameRunning(false);
        setGameOver(true);
        if (gameLoopRef.current) {
            clearInterval(gameLoopRef.current);
        }
    }, []);

    const drawGame = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw snake
        snake.forEach((segment, index) => {
            if (index === 0) {
                ctx.fillStyle = '#4cc9f0'; // Head color
            } else {
                // Snake body with gradient
                const progress = index / snake.length;
                const r = Math.floor(76 + (34 - 76) * progress);
                const g = Math.floor(201 + (197 - 201) * progress);
                const b = Math.floor(240 + (94 - 240) * progress);
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            }

            ctx.fillRect(segment.x * GRID_SIZE, segment.y * GRID_SIZE, GRID_SIZE - 1, GRID_SIZE - 1);

            // Add rounded corners (simplified for canvas rect)
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            ctx.strokeRect(segment.x * GRID_SIZE, segment.y * GRID_SIZE, GRID_SIZE - 1, GRID_SIZE - 1);
        });

        // Draw food
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        const centerX = food.x * GRID_SIZE + GRID_SIZE / 2;
        const centerY = food.y * GRID_SIZE + GRID_SIZE / 2;
        const radius = GRID_SIZE / 2 - 2;
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();

        // Add glow effect to food
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
    }, [snake, food]);

    const updateGame = useCallback(() => {
        if (!gameRunning) return;

        setDirection(prevDirection => {
            const currentDirection = prevDirection; // Use current direction for collision check
            const head = { ...snake[0] };

            switch (nextDirection) { // Use nextDirection for movement
                case 'up': head.y--; break;
                case 'down': head.y++; break;
                case 'left': head.x--; break;
                case 'right': head.x++; break;
            }

            // Check wall collision
            if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
                handleGameOver();
                return currentDirection;
            }

            // Check self collision
            for (const segment of snake) {
                if (head.x === segment.x && head.y === segment.y) {
                    handleGameOver();
                    return currentDirection;
                }
            }

            // Add new head
            const newSnake = [head, ...snake];

            // Check food collision
            if (head.x === food.x && head.y === food.y) {
                updateScore(score + 10);
                spawnFood();

                // Increase speed every 50 points
                if ((score + 10) % 50 === 0 && gameSpeed > 50) {
                    setGameSpeed(prevSpeed => Math.max(50, prevSpeed - 10));
                }
            } else {
                // Remove tail if no food eaten
                newSnake.pop();
            }

            setSnake(newSnake);
            return nextDirection; // Update actual direction after movement
        });
    }, [gameRunning, snake, food, score, gameSpeed, spawnFood, updateScore, handleGameOver, nextDirection]);

    const initGame = useCallback(() => {
        setSnake([
            { x: 5, y: 10 },
            { x: 4, y: 10 },
            { x: 3, y: 10 },
        ]);
        setDirection('right');
        setNextDirection('right');
        setScore(0);
        setGameSpeed(150);
        setGameOver(false);
        setGameRunning(true);
        spawnFood();
    }, [spawnFood]);

    // Game loop effect
    useEffect(() => {
        if (gameRunning && !gameOver) {
            if (gameLoopRef.current) {
                clearInterval(gameLoopRef.current);
            }
            gameLoopRef.current = window.setInterval(updateGame, gameSpeed);
        } else if (gameLoopRef.current) {
            clearInterval(gameLoopRef.current);
        }
        return () => {
            if (gameLoopRef.current) {
                clearInterval(gameLoopRef.current);
            }
        };
    }, [gameRunning, gameOver, gameSpeed, updateGame]);

    // Drawing effect
    useEffect(() => {
        drawGame();
    }, [snake, food, drawGame]);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameOver && (e.code === 'Space' || e.code === 'Enter')) {
                initGame();
                return;
            }

            if (!gameRunning && (e.code === 'Space' || e.code === 'Enter')) {
                setGameRunning(true);
                return;
            }
            
            switch (e.code) {
                case 'ArrowUp':
                case 'KeyW':
                    if (direction !== 'down') setNextDirection('up');
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    if (direction !== 'up') setNextDirection('down');
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    if (direction !== 'right') setNextDirection('left');
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    if (direction !== 'left') setNextDirection('right');
                    break;
                case 'Space':
                    e.preventDefault(); // Prevent scrolling
                    setGameRunning(prev => !prev);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [gameRunning, gameOver, direction, initGame]);

    // Initialize game on component mount
    useEffect(() => {
        initGame();
        setGameRunning(false); // Start paused
    }, [initGame]);

    return (
        <div className="min-h-screen flex justify-center items-center p-4">
            <div className="game-container">
                <h1 className="text-4xl font-bold text-center mb-6 text-white flex items-center justify-center gap-3">
                    <Gamepad2 className="text-blue-400" size={36} />
                    Gra w Snake
                </h1>

                <div className="score-display">
                    <div className="flex justify-between items-center text-white">
                        <div>
                            <span className="text-lg font-semibold">Score: </span>
                            <span id="score" className="text-2xl font-bold text-green-400">{score}</span>
                        </div>
                        <div>
                            <span className="text-lg font-semibold">High Score: </span>
                            <span id="highScore" className="text-2xl font-bold text-yellow-400">{highScore}</span>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <canvas id="gameCanvas" ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}></canvas>

                    {gameOver && (
                        <div id="gameOverScreen" className="game-over absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <h2 className="text-3xl font-bold text-red-400 mb-4">Game Over!</h2>
                                <p className="text-white text-xl mb-2">Final Score: <span id="finalScore" className="text-green-400">{score}</span></p>
                                <p className="text-white text-lg mb-4">High Score: <span id="finalHighScore" className="text-yellow-400">{highScore}</span></p>
                                <Button
                                    id="restartButton"
                                    onClick={initGame}
                                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 text-lg"
                                >
                                    Play Again
                                </Button>
                            </div>
                        </div>
                    )}
                    {!gameRunning && !gameOver && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 rounded-xl">
                            <div className="text-center">
                                <p className="text-white text-2xl font-bold mb-4">Press SPACE to Start</p>
                                <p className="text-gray-400 text-sm">Use Arrow Keys or WASD to move</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="controls">
                    <div className="text-center text-white">
                        <p className="mb-2 font-semibold">Controls:</p>
                        <p className="text-sm opacity-80">Use Arrow Keys or WASD to move • Space to pause/resume</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SnakeGame;