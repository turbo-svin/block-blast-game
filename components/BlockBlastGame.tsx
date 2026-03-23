'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Размеры игрового поля
const GRID_SIZE = 8;
const TARGET_SCORE = 500;
const TIME_LIMIT = 60;

// Типы фигур (какие фигуры будут появляться)
type Shape = number[][];

// Все возможные фигуры
const SHAPES: Shape[] = [
  // Квадрат 2x2
  [[1, 1], [1, 1]],
  // Линия 3x1
  [[1], [1], [1]],
  // Г-образная фигура
  [[1, 0], [1, 0], [1, 1]],
  // Обратная Г-образная
  [[0, 1], [0, 1], [1, 1]],
  // Зигзаг
  [[1, 1, 0], [0, 1, 1]],
  // Т-образная
  [[0, 1, 0], [1, 1, 1]],
  // Квадрат 3x3 (большая фигура для бонуса)
  [[1, 1, 1], [1, 1, 1], [1, 1, 1]]
];

// Интерфейс для фигуры с координатами
interface PlacedShape {
  shape: Shape;
  row: number;
  col: number;
}

export default function BlockBlastGame() {
  // Состояния игры
  const [grid, setGrid] = useState<number[][]>([]);
  const [currentShapes, setCurrentShapes] = useState<Shape[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'won' | 'lost'>('waiting');
  const [betAmount, setBetAmount] = useState(100);
  const [coins, setCoins] = useState(1000);
  
  // Refs для drag and drop
  const [draggedShape, setDraggedShape] = useState<Shape | null>(null);
  const [dragIndex, setDragIndex] = useState<number>(-1);
  
  // Инициализация игрового поля
  useEffect(() => {
    resetGrid();
    generateShapes();
  }, []);
  
  // Таймер
  useEffect(() => {
    if (gameStatus !== 'playing') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (score < TARGET_SCORE) {
            setGameStatus('lost');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameStatus, score]);
  
  // Проверка победы
  useEffect(() => {
    if (gameStatus === 'playing' && score >= TARGET_SCORE) {
      setGameStatus('won');
    }
  }, [score, gameStatus]);
  
  // Сброс сетки
  const resetGrid = () => {
    const emptyGrid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
    setGrid(emptyGrid);
  };
  
  // Генерация 3 случайных фигур
  const generateShapes = () => {
    const newShapes: Shape[] = [];
    for (let i = 0; i < 3; i++) {
      const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      // Клонируем фигуру
      newShapes.push(randomShape.map(row => [...row]));
    }
    setCurrentShapes(newShapes);
  };
  
  // Проверка, можно ли поставить фигуру
  const canPlaceShape = (shape: Shape, startRow: number, startCol: number): boolean => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c] === 1) {
          const gridRow = startRow + r;
          const gridCol = startCol + c;
          
          // Проверка границ
          if (gridRow >= GRID_SIZE || gridCol >= GRID_SIZE) {
            return false;
          }
          
          // Проверка, не занято ли место
          if (grid[gridRow][gridCol] === 1) {
            return false;
          }
        }
      }
    }
    return true;
  };
  
  // Постановка фигуры
  const placeShape = (shape: Shape, startRow: number, startCol: number, shapeIndex: number) => {
    if (gameStatus !== 'playing') return false;
    
    // Проверяем, можно ли поставить
    if (!canPlaceShape(shape, startRow, startCol)) {
      return false;
    }
    
    // Создаём копию сетки
    const newGrid = grid.map(row => [...row]);
    
    // Ставим фигуру
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c] === 1) {
          newGrid[startRow + r][startCol + c] = 1;
        }
      }
    }
    
    // Проверяем заполненные линии
    const linesToClear: { type: 'row' | 'col', index: number }[] = [];
    
    // Проверка строк
    for (let row = 0; row < GRID_SIZE; row++) {
      if (newGrid[row].every(cell => cell === 1)) {
        linesToClear.push({ type: 'row', index: row });
      }
    }
    
    // Проверка столбцов
    for (let col = 0; col < GRID_SIZE; col++) {
      let full = true;
      for (let row = 0; row < GRID_SIZE; row++) {
        if (newGrid[row][col] !== 1) {
          full = false;
          break;
        }
      }
      if (full) {
        linesToClear.push({ type: 'col', index: col });
      }
    }
    
    // Очищаем линии и начисляем очки
    let pointsEarned = 0;
    const finalGrid = newGrid.map(row => [...row]);
    
    linesToClear.forEach(line => {
      if (line.type === 'row') {
        for (let c = 0; c < GRID_SIZE; c++) {
          finalGrid[line.index][c] = 0;
        }
        pointsEarned += 100;
      } else {
        for (let r = 0; r < GRID_SIZE; r++) {
          finalGrid[r][line.index] = 0;
        }
        pointsEarned += 100;
      }
    });
    
    // Бонус за одновременное удаление нескольких линий
    if (linesToClear.length >= 2) {
      pointsEarned += linesToClear.length * 50;
    }
    
    // Обновляем состояния
    setGrid(finalGrid);
    setScore(prev => prev + pointsEarned);
    
    // Удаляем использованную фигуру и генерируем новую
    const newShapes = [...currentShapes];
    newShapes[shapeIndex] = SHAPES[Math.floor(Math.random() * SHAPES.length)].map(row => [...row]);
    setCurrentShapes(newShapes);
    
    // Если нет доступных ходов — проигрыш
    const hasValidMove = checkAnyValidMove(finalGrid, newShapes);
    if (!hasValidMove) {
      setGameStatus('lost');
    }
    
    return true;
  };
  
  // Проверка, есть ли хоть один возможный ход
  const checkAnyValidMove = (gridToCheck: number[][], shapesToCheck: Shape[]): boolean => {
    for (const shape of shapesToCheck) {
      for (let row = 0; row <= GRID_SIZE - shape.length; row++) {
        for (let col = 0; col <= GRID_SIZE - shape[0].length; col++) {
          let canPlace = true;
          for (let r = 0; r < shape.length && canPlace; r++) {
            for (let c = 0; c < shape[0].length; c++) {
              if (shape[r][c] === 1 && gridToCheck[row + r][col + c] === 1) {
                canPlace = false;
                break;
              }
            }
          }
          if (canPlace) return true;
        }
      }
    }
    return false;
  };
  
  // Начало перетаскивания
  const handleDragStart = (shape: Shape, index: number) => {
    if (gameStatus !== 'playing') return;
    setDraggedShape(shape);
    setDragIndex(index);
  };
  
  // Завершение перетаскивания
  const handleDrop = (row: number, col: number) => {
    if (draggedShape && dragIndex >= 0) {
      // Вычисляем, куда можно поставить фигуру
      // Ищем подходящую позицию
      let placed = false;
      for (let startRow = 0; startRow <= GRID_SIZE - draggedShape.length; startRow++) {
        for (let startCol = 0; startCol <= GRID_SIZE - draggedShape[0].length; startCol++) {
          if (canPlaceShape(draggedShape, startRow, startCol)) {
            // Нашли позицию, ставим фигуру в первый подходящий слот
            placeShape(draggedShape, startRow, startCol, dragIndex);
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
    }
    setDraggedShape(null);
    setDragIndex(-1);
  };
  
  // Начать игру
  const startGame = () => {
    if (coins < betAmount) {
      alert('Недостаточно монет!');
      return;
    }
    
    setCoins(prev => prev - betAmount);
    resetGrid();
    generateShapes();
    setScore(0);
    setTimeLeft(TIME_LIMIT);
    setGameStatus('playing');
  };
  
  // Отрисовка сетки
  const renderGrid = () => {
    const cells = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        cells.push(
          <div
            key={`${i}-${j}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(i, j)}
            style={{
              width: '40px',
              height: '40px',
              border: '1px solid #333',
              backgroundColor: grid[i][j] === 1 ? '#4CAF50' : '#1a1a2e',
              display: 'inline-block',
              cursor: 'pointer'
            }}
          />
        );
      }
    }
    return <div style={{ width: 'fit-content', margin: '0 auto' }}>{cells}</div>;
  };
  
  // Отрисовка доступных фигур
  const renderShapes = () => {
    return currentShapes.map((shape, idx) => (
      <div
        key={idx}
        draggable={gameStatus === 'playing'}
        onDragStart={() => handleDragStart(shape, idx)}
        style={{
          display: 'inline-block',
          margin: '10px',
          padding: '10px',
          backgroundColor: '#2a2a3e',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        {shape.map((row, i) => (
          <div key={i} style={{ display: 'flex' }}>
            {row.map((cell, j) => (
              <div
                key={j}
                style={{
                  width: '35px',
                  height: '35px',
                  backgroundColor: cell === 1 ? '#FF5722' : 'transparent',
                  border: cell === 1 ? '1px solid #fff' : 'none'
                }}
              />
            ))}
          </div>
        ))}
      </div>
    ));
  };
  
  // Интерфейс игры
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a1a',
      color: '#fff',
      textAlign: 'center',
      padding: '20px'
    }}>
      {/* Верхняя панель */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '15px',
        backgroundColor: '#1a1a2e',
        borderRadius: '12px',
        marginBottom: '20px'
      }}>
        <div>💰 Монет: {coins}</div>
        <div>⭐ Счёт: {score}/{TARGET_SCORE}</div>
        <div>⏱️ Время: {timeLeft} сек</div>
      </div>
      
      {/* Статус игры */}
      {gameStatus === 'waiting' && (
        <div>
          <h2>Block Blast Game</h2>
          <div style={{ margin: '20px 0' }}>
            <label>Ставка: </label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              min={10}
              max={coins}
              style={{ padding: '10px', marginLeft: '10px' }}
            />
          </div>
          <button
            onClick={startGame}
            style={{
              padding: '15px 40px',
              fontSize: '18px',
              backgroundColor: '#4CAF50',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            🎮 Начать игру (ставка {betAmount} монет)
          </button>
        </div>
      )}
      
      {/* Игровое поле */}
      {gameStatus === 'playing' && (
        <>
          <div style={{ marginBottom: '20px' }}>
            {renderGrid()}
          </div>
          <div>
            <h3>Перетащи фигуру на поле:</h3>
            <div>{renderShapes()}</div>
          </div>
          <div style={{ marginTop: '20px', fontSize: '14px', color: '#888' }}>
            💡 Совет: заполняй целые строки или столбцы, чтобы получить очки!
          </div>
        </>
      )}
      
      {/* Результат игры */}
      {gameStatus === 'won' && (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <h1 style={{ color: '#4CAF50' }}>🎉 ПОБЕДА! 🎉</h1>
          <p>Ты набрал {score} очков и выигрываешь {betAmount * 2} монет!</p>
          <button
            onClick={() => {
              setCoins(prev => prev + betAmount * 2);
              setGameStatus('waiting');
            }}
            style={{
              padding: '12px 30px',
              fontSize: '16px',
              backgroundColor: '#4CAF50',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Играть снова
          </button>
        </div>
      )}
      
      {gameStatus === 'lost' && (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <h1 style={{ color: '#f44336' }}>💀 ПОРАЖЕНИЕ 💀</h1>
          <p>Ты набрал только {score} очков из {TARGET_SCORE} нужных.</p>
          <p>Ставка {betAmount} монет сгорела</p>
          <button
            onClick={() => setGameStatus('waiting')}
            style={{
              padding: '12px 30px',
              fontSize: '16px',
              backgroundColor: '#2196F3',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Попробовать снова
          </button>
        </div>
      )}
    </div>
  );
}