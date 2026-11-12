import { useEffect, useState } from 'react';
import { WarehouseGrid, type Location } from './components/WarehouseGrid';
import './App.css';

function App() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [qtyA, setQtyA] = useState(30);
  const [result, setResult] = useState<any>(null);
  const [animStep, setAnimStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/locations')
      .then(res => res.json())
      .then(data => { setLocations(data); setLoading(false); });
  }, []);

  const handleAllocate = async () => {
    setResult(null); setAnimStep(0); setIsPlaying(false);
    const res = await fetch('http://localhost:3001/api/orders/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ sku: 'SKU_A', qty: qtyA }] })
    });
    setResult(await res.json());
  };

  useEffect(() => {
    if (!isPlaying || !result?.route?.detailedPath) return;
    const path = result.route.detailedPath;
    if (animStep < path.length - 1) {
      const timer = setTimeout(() => setAnimStep(prev => prev + 1), 200);
      return () => clearTimeout(timer);
    } else { setIsPlaying(false); }
  }, [isPlaying, animStep, result]);

  if (loading) return <div style={{ padding: 20 }}>正在加载仓库地图...</div>;

  return (
    <div className="app-container">
      <h1>智慧仓库库位地图与拣料</h1>
      <div className="layout">
        <div className="map-section">
          <h2>2D 网格视图</h2>
          <WarehouseGrid 
            locations={locations} 
            routePath={result?.route?.detailedPath} 
            animStep={isPlaying || animStep > 0 ? animStep : -1}
          />
        </div>
        <div className="info-section">
          <div className="card">
            <h2>生成拣料单</h2>
            <div style={{ marginBottom: 10 }}>
              <label>SKU_A 数量: </label>
              <input type="number" value={qtyA} onChange={e => setQtyA(Number(e.target.value))} style={{ width: 60, padding: 4 }} />
            </div>
            <button onClick={handleAllocate} style={{ padding: '8px 16px', cursor: 'pointer' }}>生成拣料单</button>
          </div>

          {result && (
            <div className="card mt-20">
              <h3>扣减明细</h3>
              <table border={1} cellPadding={5} style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead><tr><th>库位</th><th>SKU</th><th>数量</th></tr></thead>
                <tbody>
                  {result.details.map((d: any, i: number) => (
                    <tr key={i}><td>({d.x}, {d.y})</td><td>{d.sku}</td><td>{d.qty}</td></tr>
                  ))}
                </tbody>
              </table>
              {result.unfulfilled?.length > 0 && <p style={{ color: 'red' }}>缺货: {JSON.stringify(result.unfulfilled)}</p>}
              <div style={{ marginTop: 15 }}>
                <p><strong>总步数:</strong> {result.route?.totalDistance ?? '计算失败'}</p>
                {result.route?.error && <p style={{ color: 'red' }}>{result.route.error}</p>}
                <button 
                  onClick={() => { setAnimStep(0); setIsPlaying(true); }}
                  style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#4ade80', border: 'none', borderRadius: 4, marginTop: 10 }}
                >
                  🚚 播放路线动画
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;