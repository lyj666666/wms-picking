export interface OrderItem {
  sku: string;
  qty: number;
}

export interface Location {
  id: string;
  x: number;
  y: number;
  storageType: string;
  pickingPriority: number;
  inventory: Record<string, number>;
}

// 优先扣减算法
export function allocateInventory(orderItems: OrderItem[], locations: Location[]) {
  const details: any[] = [];
  const remaining = new Map(orderItems.map(item => [item.sku, item.qty]));
  const pickedLocations: Location[] = [];

  // 1. 排序：优先级降序 (10 比 5 先扣)，相同优先级按到起点(0,0)的曼哈顿距离升序 (近的先扣)
  const sortedLocations = [...locations].sort((a, b) => {
    if (b.pickingPriority !== a.pickingPriority) {
      return b.pickingPriority - a.pickingPriority;
    }
    const distA = Math.abs(a.x - 0) + Math.abs(a.y - 0);
    const distB = Math.abs(b.x - 0) + Math.abs(b.y - 0);
    return distA - distB;
  });

  // 2. 遍历库位进行扣减
  for (const loc of sortedLocations) {
    for (const item of orderItems) {
      const need = remaining.get(item.sku) || 0;
      if (need <= 0) continue; // 这个 SKU 已经扣够了

      const avail = loc.inventory[item.sku] || 0;
      if (avail <= 0) continue; // 该库位没这个货

      const take = Math.min(avail, need);
      
      // 执行扣减
      loc.inventory[item.sku] -= take;
      remaining.set(item.sku, need - take);

      // 记录明细
      details.push({
        locationId: loc.id,
        x: loc.x,
        y: loc.y,
        sku: item.sku,
        qty: take,
        priority: loc.pickingPriority
      });

      // 记录需要去的库位（去重）
      if (!pickedLocations.find(l => l.id === loc.id)) {
        pickedLocations.push(loc);
      }
    }
  }

  // 3. 检查缺货
  const unfulfilled = Array.from(remaining.entries())
    .filter(([_, qty]) => qty > 0)
    .map(([sku, qty]) => ({ sku, qty }));

  return { details, unfulfilled, pickedLocations };
}