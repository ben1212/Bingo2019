import React from 'react';

export default function CartellaCard({ id, grid = [], calledSet, price = 10, compact = false }) {
  // Always include FREE space (0) in calledSet for win detection
  const effectiveSet = new Set(calledSet || []);
  effectiveSet.add(0);

  const winningCells = new Set();
  let isBingo = false;
  let patternName = '';

  if (grid && grid.length === 5) {
    const isSet = num => effectiveSet.has(num);

    // Rows
    for (let r = 0; r < 5; r++) {
      if (grid[r].every(num => isSet(num))) {
        isBingo = true;
        patternName = `Row ${r + 1}`;
        for (let c = 0; c < 5; c++) winningCells.add(`${r}-${c}`);
      }
    }

    // Columns
    for (let c = 0; c < 5; c++) {
      const col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c], grid[4][c]];
      if (col.every(num => isSet(num))) {
        isBingo = true;
        patternName = `Col ${c + 1}`;
        for (let r = 0; r < 5; r++) winningCells.add(`${r}-${c}`);
      }
    }

    // Main diagonal
    if (!isBingo) {
      const d1 = [grid[0][0], grid[1][1], grid[2][2], grid[3][3], grid[4][4]];
      if (d1.every(num => isSet(num))) {
        isBingo = true;
        patternName = 'Diagonal ↘';
        for (let i = 0; i < 5; i++) winningCells.add(`${i}-${i}`);
      }
    }

    // Reverse diagonal
    if (!isBingo) {
      const d2 = [grid[0][4], grid[1][3], grid[2][2], grid[3][1], grid[4][0]];
      if (d2.every(num => isSet(num))) {
        isBingo = true;
        patternName = 'Diagonal ↙';
        for (let i = 0; i < 5; i++) winningCells.add(`${i}-${4 - i}`);
      }
    }

    // Corners
    if (!isBingo) {
      const corners = [grid[0][0], grid[0][4], grid[4][0], grid[4][4]];
      if (corners.every(num => isSet(num))) {
        isBingo = true;
        patternName = 'Corners';
        winningCells.add('0-0'); winningCells.add('0-4');
        winningCells.add('4-0'); winningCells.add('4-4');
      }
    }
  }

  // Detect "1 Away" (Near Bingo)
  let isNearBingo = false;
  if (!isBingo && grid && grid.length === 5) {
    const isSet = num => effectiveSet.has(num);
    // Check rows
    for (let r = 0; r < 5; r++) {
      if (grid[r].filter(num => isSet(num)).length === 4) isNearBingo = true;
    }
    // Check cols
    if (!isNearBingo) {
      for (let c = 0; c < 5; c++) {
        const col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c], grid[4][c]];
        if (col.filter(num => isSet(num)).length === 4) isNearBingo = true;
      }
    }
    // Check diagonals
    if (!isNearBingo) {
      const d1 = [grid[0][0], grid[1][1], grid[2][2], grid[3][3], grid[4][4]];
      if (d1.filter(num => isSet(num)).length === 4) isNearBingo = true;
    }
    if (!isNearBingo) {
      const d2 = [grid[0][4], grid[1][3], grid[2][2], grid[3][1], grid[4][0]];
      if (d2.filter(num => isSet(num)).length === 4) isNearBingo = true;
    }
  }

  const cardClass = `cartella-card${compact ? ' cartella-card--compact' : ''}${isNearBingo ? ' near-bingo' : ''}`;

  return (
    <div
      className={cardClass}
      style={{
        position: 'relative',
        ...(isBingo ? { border: '2px solid #10b981', boxShadow: '0 0 20px rgba(16,185,129,0.35)' } : {})
      }}
    >
      {/* BINGO badge */}
      {isBingo && (
        <div
          style={{
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#10b981',
            color: '#ffffff',
            padding: '3px 12px',
            borderRadius: '16px',
            fontWeight: '900',
            fontSize: '10.5px',
            boxShadow: '0 2px 8px rgba(16,185,129,0.4)',
            zIndex: 10,
            whiteSpace: 'nowrap',
            letterSpacing: '0.2px'
          }}
        >
          🏆 BINGO! {patternName}
        </div>
      )}

      {/* Near Bingo 1-AWAY Badge */}
      {!isBingo && isNearBingo && (
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            right: '8px',
            background: '#f59e0b',
            color: '#ffffff',
            padding: '2px 7px',
            borderRadius: '10px',
            fontWeight: '900',
            fontSize: '9px',
            boxShadow: '0 2px 6px rgba(245,158,11,0.3)',
            zIndex: 10,
            letterSpacing: '0.2px'
          }}
        >
          ⚡ 1 AWAY!
        </div>
      )}

      {/* BINGO column labels + card meta in header strip */}
      <div style={{ background: 'linear-gradient(135deg, #1a1000 0%, #2a1a00 50%, #1a1000 100%)', borderBottom: '1.5px solid rgba(250,204,21,0.3)', flexShrink: 0 }}>
        <div className="cartella-header">
          <div>B</div>
          <div>I</div>
          <div>N</div>
          <div>G</div>
          <div>O</div>
        </div>
        {!compact && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 6px 4px', fontSize: '9.5px', fontWeight: '700', opacity: 0.75 }}>
            <span style={{ color: '#94a3b8' }}>#{id}</span>
            <span style={{ color: '#fbbf24' }}>{price} ETB</span>
          </div>
        )}
      </div>


      {/* Grid cells */}
      <div className="cartella-grid">
        {grid.map((row, rIdx) =>
          row.map((num, cIdx) => {
            const isFree = num === 0;
            const isDaubed = effectiveSet.has(num);
            const isWin = winningCells.has(`${rIdx}-${cIdx}`);

            let cls = 'cartella-cell';
            if (isFree) cls += ' free daubed';
            else if (isWin) cls += ' winning';
            else if (isDaubed) cls += ' daubed';

            return (
              <div key={`${rIdx}-${cIdx}`} className={cls}>
                {isFree ? '★ FREE' : num}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
