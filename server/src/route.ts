export interface Point { x: number; y: number; }
export interface Location {
  x: number; y: number; storageType: string; direction: string;
}

const GRID_SIZE = 10;

// 获取当前格子可以走的下一步（核心：单行道硬性约束）
export function getNeighbors(p: Point, grid: Map<string, Location>): Point[] {
  const dirs = [
    { dx: 0, dy: -1 }, // 北
    { dx: 0, dy: 1 },  // 南
    { dx: -1, dy: 0 }, // 西
    { dx: 1, dy: 0 },  // 东
  ];
  
  const neighbors: Point[] = [];
  const currentLoc = grid.get(`${p.x},${p.y}`);
  if (!currentLoc) return [];
  
  for (const d of dirs) {
    const nx = p.x + d.dx;
    const ny = p.y + d.dy;
    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
    
    const targetLoc = grid.get(`${nx},${ny}`);
    if (!targetLoc) continue;
    
    let canMove = false;
    
    if (currentLoc.storageType === 'FLOOR') {
      if (targetLoc.storageType === 'RACK') {
        // 进入高架区：必须从北进（如果是 SOUTH），或从南进（如果是 NORTH）
        if (targetLoc.direction === 'NORTH_TO_SOUTH' && d.dy === 1) canMove = true;
        if (targetLoc.direction === 'SOUTH_TO_NORTH' && d.dy === -1) canMove = true;
      } else {
        canMove = true; // 地堆自由进入地堆
      }
    } else if (currentLoc.storageType === 'RACK') {
      // 在高架区内：强制单向
      if (currentLoc.direction === 'NORTH_TO_SOUTH' && d.dy === 1) canMove = true;
      if (currentLoc.direction === 'SOUTH_TO_NORTH' && d.dy === -1) canMove = true;
    }
    
    if (canMove) neighbors.push({ x: nx, y: ny });
  }
  return neighbors;
}

// 广度优先搜索找两点间最短路径
export function findShortestPath(start: Point, end: Point, grid: Map<string, Location>): Point[] | null {
  const queue: Point[] = [start];
  const visited = new Set<string>();
  const parent = new Map<string, Point>();
  
  visited.add(`${start.x},${start.y}`);
  
  while(queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.x === end.x && curr.y === end.y) {
      const path: Point[] = [];
      let step: Point | undefined = curr;
      while (step) {
        path.unshift(step);
        step = parent.get(`${step.x},${step.y}`);
      }
      return path;
    }
    
    for (const n of getNeighbors(curr, grid)) {
      const key = `${n.x},${n.y}`;
      if (!visited.has(key)) {
        visited.add(key);
        parent.set(key, curr);
        queue.push(n);
      }
    }
  }
  return null; // 不可达
}

// TSP 路径优化（状态压缩 DP，解决访问所有库位并回到起点）
export function optimizeRoute(start: Point, stops: Point[], grid: Map<string, Location>) {
  const uniqueStops = stops.filter((s, i, self) => self.findIndex(t => t.x === s.x && t.y === s.y) === i);
  const m = uniqueStops.length;
  if (m === 0) return { totalDistance: 0, detailedPath: [], orderStops: [] };
  
  const points = [start, ...uniqueStops];
  const n = points.length;
  const pathMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(Infinity));
  const segmentMatrix: (Point[] | null)[][] = Array(n).fill(null).map(() => Array(n).fill(null));
  
  // 预计算所有两点间的距离
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) { pathMatrix[i][j] = 0; continue; }
      const p = findShortestPath(points[i], points[j], grid);
      if (p) {
        segmentMatrix[i][j] = p;
        pathMatrix[i][j] = p.length - 1;
      }
    }
  }

  const dp: { dist: number, prev: number }[][] = Array(1 << m).fill(null).map(() => Array(m).fill(null).map(() => ({ dist: Infinity, prev: -1 })));
  
  for (let i = 0; i < m; i++) {
    dp[1 << i][i] = { dist: pathMatrix[0][i + 1], prev: -1 };
  }
  
  for (let mask = 1; mask < (1 << m); mask++) {
    for (let i = 0; i < m; i++) {
      if ((mask & (1 << i)) === 0 || dp[mask][i].dist === Infinity) continue;
      for (let j = 0; j < m; j++) {
        if (mask & (1 << j)) continue;
        const nextMask = mask | (1 << j);
        const newDist = dp[mask][i].dist + pathMatrix[i + 1][j + 1];
        if (newDist < dp[nextMask][j].dist) {
          dp[nextMask][j] = { dist: newDist, prev: i };
        }
      }
    }
  }
  
  let minTotalDist = Infinity;
  let lastStop = -1;
  const fullMask = (1 << m) - 1;
  
  for (let i = 0; i < m; i++) {
    const d = dp[fullMask][i].dist + pathMatrix[i + 1][0];
    if (d < minTotalDist) {
      minTotalDist = d;
      lastStop = i;
    }
  }
  
  if (minTotalDist === Infinity) return { error: '部分库位被单行道堵死无法到达' };
  
  const orderStops: number[] = [];
  let currMask = fullMask, currStop = lastStop;
  while (currStop !== -1) {
    orderStops.unshift(currStop);
    const prev = dp[currMask][currStop].prev;
    currMask = currMask ^ (1 << currStop);
    currStop = prev;
  }
  
  const detailedPath: Point[] = [];
  let currPointIdx = 0;
  for (const stopIdx of orderStops) {
    const seg = segmentMatrix[currPointIdx][stopIdx + 1]!;
    detailedPath.push(...(detailedPath.length > 0 ? seg.slice(1) : seg));
    currPointIdx = stopIdx + 1;
  }
  const returnSeg = segmentMatrix[currPointIdx][0]!;
  detailedPath.push(...returnSeg.slice(1));
  
  return {
    totalDistance: minTotalDist,
    detailedPath,
    orderStops: orderStops.map(i => points[i + 1])
  };
}