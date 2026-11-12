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

// 获取所有库位 (Read)
app.get('/api/locations', (req, res) => {
  const rows = db.prepare('SELECT * FROM locations').all() as any[];
  const locations = rows.map(row => ({
    ...row,
    inventory: JSON.parse(row.inventory)
  }));
  res.json(locations);
});

// 新增库位 (Create)
app.post('/api/locations', (req, res) => {
  const { x, y, storageType, aisleId, direction, pickingPriority } = req.body;
  const id = `LOC-${x}-${y}`;
  const inventory = JSON.stringify({});

  try {
    const insert = db.prepare(`
      INSERT INTO locations (id, x, y, storageType, aisleId, direction, pickingPriority, inventory)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(id, x, y, storageType, aisleId, direction, pickingPriority, inventory);
    res.json({ success: true, message: `库位 ${id} 创建成功` });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 修改库位 (Update)
app.put('/api/locations/:id', (req, res) => {
  const { id } = req.params;
  const { storageType, aisleId, direction, pickingPriority, inventory } = req.body;
  
  try {
    const update = db.prepare(`
      UPDATE locations 
      SET storageType = COALESCE(?, storageType), 
          aisleId = COALESCE(?, aisleId), 
          direction = COALESCE(?, direction), 
          pickingPriority = COALESCE(?, pickingPriority), 
          inventory = COALESCE(?, inventory)
      WHERE id = ?
    `);
    const invStr = inventory ? JSON.stringify(inventory) : null;
    update.run(storageType, aisleId, direction, pickingPriority, invStr, id);
    res.json({ success: true, message: `库位 ${id} 更新成功` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 删除库位 (Delete)
app.delete('/api/locations/:id', (req, res) => {
  const { id } = req.params;
  
  try {
    const del = db.prepare('DELETE FROM locations WHERE id = ?');
    del.run(id);
    res.json({ success: true, message: `库位 ${id} 删除成功` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
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