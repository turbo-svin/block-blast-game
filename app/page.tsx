'use client';

import dynamic from 'next/dynamic';

// Динамически загружаем игру (отключаем серверный рендеринг)
const BlockBlastGame = dynamic(
  () => import('../components/BlockBlastGame'),
  {
    ssr: false,
    loading: () => (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#0a0a1a',
        color: '#fff',
        fontSize: '18px'
      }}>
        ⏳ Загрузка игры...
      </div>
    )
  }
);

export default function Home() {
  return <BlockBlastGame />;
}