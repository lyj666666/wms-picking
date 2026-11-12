import React from 'react';

export interface Location {
  id: string;
  x: number;
  y: number;
  storageType: 'FLOOR' | 'RACK';
  aisleId: string | null;
  direction: string;
  pickingPriority: number;
  inventory: Record<string, number>;
}

export interface Point { x: number; y: number; }

interface Props {
  locations: Location[];
  cellSize?: number;
  routePath?: Point[];
  animStep?: number;
}

export const WarehouseGrid: React.FC<Props> = ({ locations, cellSize = 50, routePath, animStep = -1 }) => {
  const gridSize = 10;

  return (
    <div style={{ position: 'relative' }}>
      <svg 
        width={gridSize * cellSize} 
        height={gridSize * cellSize} 
        style={{ border: '2px solid #333', backgroundColor: '#f5f5f5' }}
      >
        {/* 1. 画网格和库位 */}
        {locations.map((loc) => {
          const isRack = loc.storageType === 'RACK';
          const hasInventory = Object.keys(loc.inventory).length > 0;
          const fill = isRack ? (hasInventory ? '#60a5fa' : '#bfdbfe') : (hasInventory ? '#4ade80' : '#dcfce7');
          const stroke = isRack ? '#1d4ed8' : '#15803d';

          return (
            <g key={loc.id} transform={`translate(${loc.x * cellSize}, ${loc.y * cellSize})`}>
              <rect width={cellSize} height={cellSize} fill={fill} stroke={stroke} strokeWidth={1} />
              
              {isRack && (
                <text x={cellSize / 2} y={cellSize / 2 + 6} textAnchor="middle" fontSize="20" fill="#1e3a8a">
                  {loc.direction === 'NORTH_TO_SOUTH' ? '↓' : '↑'}
                </text>
              )}

              {hasInventory && !isRack && (
                <circle cx={cellSize - 10} cy={10} r={4} fill="#16a34a" />
              )}

              {loc.x === 0 && loc.y === 0 && (
                <g>
                  <rect width={cellSize} height={cellSize} fill="rgba(255, 165, 0, 0.3)" />
                  <text x={cellSize / 2} y={cellSize / 2 + 4} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#ea580c">
                    起点
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* 2. 画路线轨迹 */}
        {routePath && routePath.length > 1 && (
          <g>
            {/* 画底线 */}
            <polyline
              points={routePath.map(p => `${p.x * cellSize + cellSize / 2},${p.y * cellSize + cellSize / 2}`).join(' ')}
              fill="none"
              stroke="#f97316"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            
            {/* 画方向的箭头 */}
            {routePath.map((p, i) => {
              if (i === 0) return null;
              const prev = routePath[i - 1];
              const cx = p.x * cellSize + cellSize / 2;
              const cy = p.y * cellSize + cellSize / 2;
              const angle = Math.atan2(p.y - prev.y, p.x - prev.x) * (180 / Math.PI);
              return (
                <polygon 
                  key={`arrow-${i}`}
                  points="-6,-6 6,0 -6,6"
                  fill="#f97316"
                  transform={`translate(${cx},${cy}) rotate(${angle})`}
                />
              );
            })}

            {/* 3. 画行走的叉车/小人 */}
            {animStep >= 0 && routePath[animStep] && (
              <circle
                cx={routePath[animStep].x * cellSize + cellSize / 2}
                cy={routePath[animStep].y * cellSize + cellSize / 2}
                r="12"
                fill="#ef4444"
                stroke="#fff"
                strokeWidth="3"
                style={{ transition: 'all 0.3s ease' }}
              />
            )}
          </g>
        )}
      </svg>
    </div>
  );
};