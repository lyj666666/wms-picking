import express from 'express';
import cors from 'cors';
import db from './db.js';
import { allocateInventory } from './allocate.js';
import { optimizeRoute } from './route.js';

const app = express();
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// 👇 这里就是你刚才不小心删掉的获取库位接口
app.get('/api/locations', (req, res) => {
  const rows = db.prepare('SELECT * FROM locations').all() as any[];
  const locations = rows.map(row => ({
    ...row,
    inventory: JSON.parse(row.inventory)
  }));
  res.json(locations);
});

// 生成拣料单接口
app.post('/api/orders/allocate', (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: '无效的订单格式' });

  const rows = db.prepare('SELECT * FROM locations').all() as any[];
  const locations = rows.map(row => ({ ...row, inventory: JSON.parse(row.inventory) }));

  const { details, unfulfilled, pickedLocations } = allocateInventory(items, locations);

  // 构建网格 Map 供路径算法使用
  const grid = new Map<string, any>();
  for (const loc of locations) grid.set(`${loc.x},${loc.y}`, loc);

  // 计算优化路径
  const startPoint = { x: 0, y: 0 };
  const stops = pickedLocations.map(l => ({ x: l.x, y: l.y }));
  const routeResult = optimizeRoute(startPoint, stops, grid);

  res.json({
    details,
    unfulfilled,
    pickedLocations,
    route: routeResult
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 后端服务已启动: http://localhost:${PORT}`);
});