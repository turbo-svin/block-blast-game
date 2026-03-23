'use client';

import { useState, useEffect } from 'react';

// Размер поля
const GRID_SIZE = 8;
const TARGET_SCORE = 500;
const TIME_LIMIT = 60;

// Типы фигур
type Shape = number[][];

// Коллекция фигур
const SHAPES: Shape[] = [
  // Квадрат 2x2
  [[1, 1], [1, 1]],
  // Линия 3x1 горизонтальная
  [[1, 1, 1]],
  // Линия 3x1 вертикальная
  [[1], [1], [1]],
  // Г-образная
  [[1, 0], [1, 0], [1, 1]],
  // Г-образная зеркальная
  [[0, 1], [0, 1], [1, 1]],
  // Зигзаг
  [[1, 1, 0], [0, 1, 1]],
  // Т-образная
  [[0, 1, 0], [1, 1, 1]],
  // Маленькая линия 2x1
  [[1, 1]],
  // Уголок 2x2 с одной пустой
  [[1, 0], [1, 1]],
];

// Позиция фигуры при перетаскивании
interface DragPosition {
  shape: Shape;
  shapeIndex: number;
  startX: number;
  startY: number;
  previewRow: number;
  previewCol: number;
}

export default function BlockBlastGame() {
  // Состояния игры
  const [grid, setGrid] = useState<number[][]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [gameStatus, setGameStatus] = useState<'menu' | 'playing' | 'won' | 'lost'>('menu');
  const [betAmount, setBetAmount] = useState(100);
  const [coins, setCoins] = useState(1000);
  
  // Drag and drop
  const [dragging, setDragging] = useState<DragPosition | null>(null);
  const [previewCells, setPreviewCells] = useState<{row: number, col: number}[]>([]);

  // Инициализация
  useEffect(() => {
    resetGame();
  }, []);

  const resetGame = () => {
    const emptyGrid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
    setGrid(emptyGrid);
    generateNewShapes();
    setScore(0);
    setTimeLeft(TIME_LIMIT);
  };

  const generateNewShapes = () => {
    const newShapes: Shape[] = [];
    for (let i = 0; i < 3; i++) {
      const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      newShapes.push(randomShape.map(row => [...row]));
    }
    setShapes(newShapes);
  };

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

  // Проверка, можно ли поставить фигуру
  const canPlace = (shape: Shape, row: number, col: number): boolean => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c] === 1) {
          const gridRow = row + r;
          const gridCol = col + c;
          
          if (gridRow >= GRID_SIZE || gridCol >= GRID_SIZE) {
            return false;
          }
          
          if (grid[gridRow][gridCol] === 1) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // Получить клетки для превью
  const getPreviewCells = (shape: Shape, row: number, col: number): {row: number, col: number}[] => {
    const cells: {row: number, col: number}[] = [];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c] === 1) {
          cells.push({ row: row + r, col: col + c });
        }
      }
    }
    return cells;
  };

  // Поставить фигуру
  const placeShape = (shape: Shape, shapeIndex: number, row: number, col: number) => {
    if (gameStatus !== 'playing') return false;
    if (!canPlace(shape, row, col)) return false;

    // Ставим фигуру
    const newGrid = grid.map(r => [...r]);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c] === 1) {
          newGrid[row + r][col + c] = 1;
        }
      }
    }

    // Находим заполненные линии
    const rowsToClear: number[] = [];
    const colsToClear: number[] = [];

    // Проверка строк
    for (let i = 0; i < GRID_SIZE; i++) {
      if (newGrid[i].every(cell => cell === 1)) {
        rowsToClear.push(i);
      }
    }

    // Проверка столбцов
    for (let j = 0; j < GRID_SIZE; j++) {
      let full = true;
      for (let i = 0; i < GRID_SIZE; i++) {
        if (newGrid[i][j] !== 1) {
          full = false;
          break;
        }
      }
      if (full) {
        colsToClear.push(j);
      }
    }

    // Очищаем линии
    const finalGrid = newGrid.map(r => [...r]);
    let pointsEarned = 0;

    rowsToClear.forEach(row => {
      for (let c = 0; c < GRID_SIZE; c++) {
        finalGrid[row][c] = 0;
      }
      pointsEarned += 100;
    });

    colsToClear.forEach(col => {
      for (let r = 0; r < GRID_SIZE; r++) {
        finalGrid[r][col] = 0;
      }
      pointsEarned += 100;
    });

    // Бонус за несколько линий
    const totalLines = rowsToClear.length + colsToClear.length;
    if (totalLines >= 2) {
      pointsEarned += totalLines * 50;
    }

    setGrid(finalGrid);
    setScore(prev => prev + pointsEarned);

    // Обновляем фигуры
    const newShapes = [...shapes];
    const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    newShapes[shapeIndex] = randomShape.map(row => [...row]);
    setShapes(newShapes);

    // Проверка на возможность хода
    if (!hasAnyMove(finalGrid, newShapes)) {
      setGameStatus('lost');
    }

    return true;
  };

  // Проверка, есть ли возможный ход
  const hasAnyMove = (currentGrid: number[][], currentShapes: Shape[]): boolean => {
    for (const shape of currentShapes) {
      for (let row = 0; row <= GRID_SIZE - shape.length; row++) {
        for (let col = 0; col <= GRID_SIZE - shape[0].length; col++) {
          let valid = true;
          for (let r = 0; r < shape.length && valid; r++) {
            for (let c = 0; c < shape[0].length; c++) {
              if (shape[r][c] === 1 && currentGrid[row + r][col + c] === 1) {
                valid = false;
                break;
              }
            }
          }
          if (valid) return true;
        }
      }
    }
    return false;
  };

  // Начать игру
  const startGame = () => {
    if (coins < betAmount) {
      alert('❌ Недостаточно монет!');
      return;
    }
    setCoins(prev => prev - betAmount);
    setGameStatus('playing');
    resetGame();
  };

  // Обработчики drag and drop
  const handleDragStart = (e: React.DragEvent, shape: Shape, index: number) => {
    if (gameStatus !== 'playing') return;
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragging({
      shape,
      shapeIndex: index,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      previewRow: -1,
      previewCol: -1,
    });
    
    e.dataTransfer.setData('text/plain', '');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, row: number, col: number) => {
    if (!dragging) return;
    e.preventDefault();
    
    // Вычисляем позицию для предпросмотра
    let previewRow = row;
    let previewCol = col;
    
    // Корректируем, чтобы фигура не выходила за границы
    if (previewRow + dragging.shape.length > GRID_SIZE) {
      previewRow = GRID_SIZE - dragging.shape.length;
    }
    if (previewCol + dragging.shape[0].length > GRID_SIZE) {
      previewCol = GRID_SIZE - dragging.shape[0].length;
    }
    if (previewRow < 0) previewRow = 0;
    if (previewCol < 0) previewCol = 0;
    
    setDragging(prev => prev ? {
      ...prev,
      previewRow,
      previewCol
    } : null);
    
    const cells = getPreviewCells(dragging.shape, previewRow, previewCol);
    setPreviewCells(cells);
  };

  const handleDragLeave = () => {
    setPreviewCells([]);
  };

  const handleDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    
    if (!dragging) return;
    
    let targetRow = row;
    let targetCol = col;
    
    // Корректируем позицию
    if (targetRow + dragging.shape.length > GRID_SIZE) {
      targetRow = GRID_SIZE - dragging.shape.length;
    }
    if (targetCol + dragging.shape[0].length > GRID_SIZE) {
      targetCol = GRID_SIZE - dragging.shape[0].length;
    }
    if (targetRow < 0) targetRow = 0;
    if (targetCol < 0) targetCol = 0;
    
    placeShape(dragging.shape, dragging.shapeIndex, targetRow, targetCol);
    
    setDragging(null);
    setPreviewCells([]);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setPreviewCells([]);
  };

  // Рендер сетки
  const renderGrid = () => {
    const cells = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const isPreview = previewCells.some(cell => cell.row === row && cell.col === col);
        const isFilled = grid[row][col] === 1;
        
        cells.push(
          <div
            key={`${row}-${col}`}
            onDragOver={(e) => handleDragOver(e, row, col)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, row, col)}
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              backgroundColor: isPreview ? '#4caf50' : (isFilled ? '#2e7d32' : '#1e1e2e'),
              border: '1px solid #2d2d3a',
              borderRadius: '6px',
              transition: 'all 0.1s ease',
              cursor: dragging ? 'copy' : 'default',
            }}
          />
        );
      }
    }
    
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        gap: '4px',
        backgroundColor: '#0a0a0f',
        padding: '16px',
        borderRadius: '20px',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        {cells}
      </div>
    );
  };

  // Рендер фигур
  const renderShapes = () => {
    return shapes.map((shape, idx) => (
      <div
        key={idx}
        draggable={gameStatus === 'playing'}
        onDragStart={(e) => handleDragStart(e, shape, idx)}
        onDragEnd={handleDragEnd}
        style={{
          backgroundColor: '#2a2a35',
          borderRadius: '16px',
          padding: '16px',
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          cursor: gameStatus === 'playing' ? 'grab' : 'default',
          transition: 'transform 0.1s',
          minWidth: '100px',
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {shape.map((row, i) => (
            <div key={i} style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
              {row.map((cell, j) => (
                <div
                  key={j}
                  style={{
                    width: '35px',
                    height: '35px',
                    backgroundColor: cell === 1 ? '#ff9800' : 'transparent',
                    borderRadius: '8px',
                    boxShadow: cell === 1 ? '0 2px 8px rgba(255,152,0,0.4)' : 'none',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <span style={{ fontSize: '12px', color: '#888' }}>Перетащи</span>
      </div>
    ));
  };

  // ЭКРАН МЕНЮ
  if (gameStatus === 'menu') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '48px',
          padding: '48px 32px',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%',
        }}>
          <h1 style={{
            fontSize: '56px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #ff9800, #ff5722)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '16px',
          }}>
            BLOCK BLAST
          </h1>
          <p style={{ color: '#aaa', marginBottom: '32px' }}>
            Перетаскивай фигуры на поле<br/>
            Заполняй линии и выигрывай!
          </p>
          
          <div style={{
            backgroundColor: '#1e1e2e',
            borderRadius: '24px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>Твой баланс</div>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffd700' }}>
              {coins} 🪙
            </div>
          </div>
          
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '14px', color: '#888', marginBottom: '12px' }}>Выбери ставку</div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {[50, 100, 250, 500].map(amount => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  style={{
                    padding: '12px 24px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    backgroundColor: betAmount === amount ? '#ff9800' : '#2a2a35',
                    border: 'none',
                    borderRadius: '40px',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={startGame}
            style={{
              width: '100%',
              padding: '18px',
              fontSize: '24px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #ff9800, #ff5722)',
              border: 'none',
              borderRadius: '40px',
              color: '#fff',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            🎮 ИГРАТЬ
          </button>
          
          <div style={{ marginTop: '24px', fontSize: '12px', color: '#555' }}>
            Цель: {TARGET_SCORE} очков за {TIME_LIMIT} сек | Выигрыш: x2
          </div>
        </div>
      </div>
    );
  }

  // ЭКРАН ПОБЕДЫ
  if (gameStatus === 'won') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a2e1a 0%, #1a4a2e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(10px)',
          borderRadius: '48px',
          padding: '48px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '80px', marginBottom: '16px' }}>🎉</div>
          <h1 style={{ fontSize: '48px', color: '#ffd700', marginBottom: '16px' }}>ПОБЕДА!</h1>
          <p style={{ fontSize: '24px', marginBottom: '8px' }}>Ты набрал {score} очков</p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff9800', marginBottom: '32px' }}>
            +{betAmount * 2} 🪙
          </p>
          <button
            onClick={() => {
              setCoins(prev => prev + betAmount * 2);
              setGameStatus('menu');
            }}
            style={{
              padding: '16px 48px',
              fontSize: '20px',
              fontWeight: 'bold',
              background: '#ff9800',
              border: 'none',
              borderRadius: '40px',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            ИГРАТЬ СНОВА
          </button>
        </div>
      </div>
    );
  }

  // ЭКРАН ПОРАЖЕНИЯ
  if (gameStatus === 'lost') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #2a0a1a 0%, #4a1a2e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(10px)',
          borderRadius: '48px',
          padding: '48px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '80px', marginBottom: '16px' }}>💀</div>
          <h1 style={{ fontSize: '48px', color: '#f44336', marginBottom: '16px' }}>ПОРАЖЕНИЕ</h1>
          <p style={{ fontSize: '24px', marginBottom: '8px' }}>Ты набрал {score} из {TARGET_SCORE}</p>
          <p style={{ fontSize: '18px', color: '#aaa', marginBottom: '32px' }}>
            Ставка {betAmount} 🪙 сгорела
          </p>
          <button
            onClick={() => setGameStatus('menu')}
            style={{
              padding: '16px 48px',
              fontSize: '20px',
              fontWeight: 'bold',
              background: '#f44336',
              border: 'none',
              borderRadius: '40px',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            ПОПРОБОВАТЬ СНОВА
          </button>
        </div>
      </div>
    );
  }

  // ИГРОВОЙ ЭКРАН
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f1a',
      padding: '20px',
    }}>
      {/* Верхняя панель */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1e1e2e',
        borderRadius: '24px',
        padding: '16px 24px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>💰</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffd700' }}>{coins}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>⭐</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>
            {score}/{TARGET_SCORE}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>⏱️</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: timeLeft < 10 ? '#f44336' : '#fff' }}>
            {timeLeft} сек
          </span>
        </div>
      </div>

      {/* Игровое поле */}
      {renderGrid()}

      {/* Фигуры */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ textAlign: 'center', color: '#fff', marginBottom: '20px', fontSize: '18px', fontWeight: 'normal' }}>
          Перетащи фигуру на поле 👇
        </h3>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          flexWrap: 'wrap',
        }}>
          {renderShapes()}
        </div>
      </div>

      {/* Подсказка */}
      <div style={{
        textAlign: 'center',
        marginTop: '32px',
        fontSize: '14px',
        color: '#666',
      }}>
        💡 Заполни целую строку или столбец — получишь очки!
      </div>
    </div>
  );
}
