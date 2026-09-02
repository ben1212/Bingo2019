import React from 'react';

const COLS = [
  { letter: 'B', colClass: 'col-b', range: Array.from({ length: 15 }, (_, i) => i + 1) },
  { letter: 'I', colClass: 'col-i', range: Array.from({ length: 15 }, (_, i) => i + 16) },
  { letter: 'N', colClass: 'col-n', range: Array.from({ length: 15 }, (_, i) => i + 31) },
  { letter: 'G', colClass: 'col-g', range: Array.from({ length: 15 }, (_, i) => i + 46) },
  { letter: 'O', colClass: 'col-o', range: Array.from({ length: 15 }, (_, i) => i + 61) },
];

export default function MasterBoard({ calledNumbers }) {
  const calledSet = new Set(calledNumbers || []);

  return (
    <div className="master-board">
      {COLS.map(col => (
        <div key={col.letter} className="master-board-col">
          {/* Column Letter Header */}
          <div className={`master-board-header ${col.colClass}`}>
            {col.letter}
          </div>

          {/* 15 number cells */}
          <div className="master-board-cells">
            {col.range.map(num => {
              const isCalled = calledSet.has(num);
              return (
                <div
                  key={num}
                  className={`master-board-cell${isCalled ? ` called ${col.colClass}` : ''}`}
                >
                  {num}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
