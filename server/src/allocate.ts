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

  const sortedLocations = [...locations].sort((a, b) => {
    if (b.pickingPriority !== a.pickingPriority) {
      return b.pickingPriority - a.pickingPriority;
    }
    const distA = Math.abs(a.x - 0) + Math.abs(a.y - 0);
    const distB = Math.abs(b.x - 0) + Math.abs(b.y - 0);
    return distA - distB;
  });

  for (const loc of sortedLocations) {
    for (const item of orderItems) {
      const need = remaining.get(item.sku) || 0;
      if (need <= 0) continue;

      const avail = loc.inventory[item.sku] || 0;
      if (avail <= 0) continue;

      const take = Math.min(avail, need);
      
      loc.inventory[item.sku] -= take;
      remaining.set(item.sku, need - take);

      details.push({
        locationId: loc.id,
        x: loc.x,
        y: loc.y,
        sku: item.sku,
        qty: take,
        priority: loc.pickingPriority
      });

      if (!pickedLocations.find(l => l.id === loc.id)) {
        pickedLocations.push(loc);
      }
    }
  }

  const unfulfilled = Array.from(remaining.entries())
    .filter(([_, qty]) => qty > 0)
    .map(([sku, qty]) => ({ sku, qty }));

  return { details, unfulfilled, pickedLocations };
}