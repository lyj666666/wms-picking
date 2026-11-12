import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库文件保存在 server 目录下
const db = new DatabaseSync(path.join(__dirname, '../warehouse.db'));

// 建表
db.exec(`
  CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    x INTEGER,
    y INTEGER,
    storageType TEXT,
    aisleId TEXT,
    direction TEXT,
    pickingPriority INTEGER,
    inventory TEXT
  )
`);

// 检查是否有数据，如果没有则生成种子数据
const countRow = db.prepare('SELECT COUNT(*) as count FROM locations').get() as { count: number };

if (countRow.count === 0) {
  const insert = db.prepare(`
    INSERT INTO locations (id, x, y, storageType, aisleId, direction, pickingPriority, inventory)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        let storageType = 'FLOOR';
        let direction = 'BIDIRECTIONAL';
        let pickingPriority = 10;
        let aisleId = null;
        
        // 模拟一条南北向的高架巷道 (x=4)，首尾留出通道以便绕行
        if (x === 4 && y > 0 && y < 9) {
          storageType = 'RACK';
          direction = 'NORTH_TO_SOUTH';
          pickingPriority = 5;
          aisleId = 'A1';
        }

        // 模拟一些库存
        const inventory: Record<string, number> = {};
        if ((x + y) % 3 === 0) {
          inventory['SKU_A'] = 20;
        }
        if ((x + y) % 4 === 0) {
          inventory['SKU_B'] = 15;
        }

        insert.run(
          `LOC-${x}-${y}`, x, y, storageType, aisleId, direction, pickingPriority, JSON.stringify(inventory)
        );
      }
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  console.log('✅ 数据库初始化完成，已生成 10x10 仓库网格');
} else {
  console.log('✅ 数据库已存在，跳过初始化');
}

export default db;