import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
  BarChart, Bar, Cell,
} from "recharts";

// ============================================================
// 定数
// ============================================================
const SOURCES = [
  { key: "lng",     label: "火力（LNG）", color: "#2a78d6", co2: 429,  cost: 24.7 },
  { key: "coal",    label: "火力（石炭）", color: "#73726c", co2: 820,  cost: 43.8 },
  { key: "oil",     label: "火力（石油）", color: "#eb6834", co2: 738,  cost: 10.3 },
  { key: "nuclear", label: "原子力",       color: "#8B5CF6", co2: 19,   cost: 11.2 },
  { key: "hydro",   label: "水力",         color: "#1baf7a", co2: 11,   cost: 13.0 },
  { key: "solar",   label: "太陽光",       color: "#eda100", co2: 38,   cost: 10.9 },
  { key: "wind",    label: "風力",         color: "#4a3aa7", co2: 26,   cost: 21.1 },
];

const PRESETS = {
  current:    { lng:40, coal:15, oil:1,  nuclear:0,  hydro:2,  solar:25, wind:0.2 },
  target2030: { lng:30, coal:15, oil:1,  nuclear:20, hydro:10, solar:20, wind:5   },
  renew100:   { lng:0,  coal:0,  oil:0,  nuclear:0,  hydro:10, solar:70, wind:20  },
  nuclear:    { lng:20, coal:5,  oil:1,  nuclear:35, hydro:5,  solar:20, wind:5   },
};

// 2025/8/30 実データ（48コマ 30分値）
// 出典：OCCTO エリア需給実績データ
const SCENARIO_DATA = [
  {time:"0:00",  demand:32298, solarFactor:0.0,    windFactor:0.0034},
  {time:"0:30",  demand:30879, solarFactor:0.0,    windFactor:0.0039},
  {time:"1:00",  demand:29816, solarFactor:0.0,    windFactor:0.0039},
  {time:"1:30",  demand:28951, solarFactor:0.0,    windFactor:0.0048},
  {time:"2:00",  demand:28324, solarFactor:0.0,    windFactor:0.0046},
  {time:"2:30",  demand:27992, solarFactor:0.0,    windFactor:0.005},
  {time:"3:00",  demand:27619, solarFactor:0.0,    windFactor:0.0048},
  {time:"3:30",  demand:27384, solarFactor:0.0,    windFactor:0.0049},
  {time:"4:00",  demand:27300, solarFactor:0.0,    windFactor:0.0053},
  {time:"4:30",  demand:27240, solarFactor:0.0,    windFactor:0.0054},
  {time:"5:00",  demand:27342, solarFactor:0.0001, windFactor:0.0055},
  {time:"5:30",  demand:27119, solarFactor:0.01,   windFactor:0.0057},
  {time:"6:00",  demand:27771, solarFactor:0.0438, windFactor:0.0053},
  {time:"6:30",  demand:28836, solarFactor:0.0906, windFactor:0.0047},
  {time:"7:00",  demand:30694, solarFactor:0.143,  windFactor:0.0044},
  {time:"7:30",  demand:32743, solarFactor:0.1919, windFactor:0.0042},
  {time:"8:00",  demand:35469, solarFactor:0.2283, windFactor:0.0034},
  {time:"8:30",  demand:38128, solarFactor:0.2545, windFactor:0.0032},
  {time:"9:00",  demand:40530, solarFactor:0.2745, windFactor:0.0029},
  {time:"9:30",  demand:42324, solarFactor:0.29,   windFactor:0.0026},
  {time:"10:00", demand:43577, solarFactor:0.3015, windFactor:0.0025},
  {time:"10:30", demand:44618, solarFactor:0.3075, windFactor:0.0021},
  {time:"11:00", demand:45528, solarFactor:0.3081, windFactor:0.0021},
  {time:"11:30", demand:46245, solarFactor:0.305,  windFactor:0.0018},
  {time:"12:00", demand:46551, solarFactor:0.2981, windFactor:0.0017},
  {time:"12:30", demand:46739, solarFactor:0.2871, windFactor:0.0017},
  {time:"13:00", demand:47159, solarFactor:0.2696, windFactor:0.0018},
  {time:"13:30", demand:47315, solarFactor:0.2477, windFactor:0.0016},
  {time:"14:00", demand:47261, solarFactor:0.2223, windFactor:0.0016},
  {time:"14:30", demand:47307, solarFactor:0.1938, windFactor:0.0016},
  {time:"15:00", demand:47211, solarFactor:0.162,  windFactor:0.0017},
  {time:"15:30", demand:47299, solarFactor:0.1252, windFactor:0.0016},
  {time:"16:00", demand:47184, solarFactor:0.0874, windFactor:0.0016},
  {time:"16:30", demand:46744, solarFactor:0.0535, windFactor:0.0015},
  {time:"17:00", demand:45831, solarFactor:0.0259, windFactor:0.0016},
  {time:"17:30", demand:44953, solarFactor:0.0074, windFactor:0.0014},
  {time:"18:00", demand:44613, solarFactor:0.0001, windFactor:0.0018},
  {time:"18:30", demand:44355, solarFactor:0.0,    windFactor:0.0018},
  {time:"19:00", demand:43441, solarFactor:0.0,    windFactor:0.0019},
  {time:"19:30", demand:42442, solarFactor:0.0,    windFactor:0.0019},
  {time:"20:00", demand:41314, solarFactor:0.0,    windFactor:0.0019},
  {time:"20:30", demand:40371, solarFactor:0.0,    windFactor:0.0018},
  {time:"21:00", demand:39219, solarFactor:0.0,    windFactor:0.0021},
  {time:"21:30", demand:38116, solarFactor:0.0,    windFactor:0.002},
  {time:"22:00", demand:37137, solarFactor:0.0,    windFactor:0.0022},
  {time:"22:30", demand:36083, solarFactor:0.0,    windFactor:0.0021},
  {time:"23:00", demand:35035, solarFactor:0.0,    windFactor:0.0019},
  {time:"23:30", demand:33750, solarFactor:0.0,    windFactor:0.002},
];

// ============================================================
// 計算ロジック
// ============================================================
function calcMetrics(mix, demand = 47315, solarFactor = 0.248, windFactor = 0.0016) {
  const total = Object.values(mix).reduce((a, b) => a + b, 0) || 1;
  const norm = {};
  SOURCES.forEach(s => { norm[s.key] = ((mix[s.key] || 0) / total) * 100; });

  let co2 = 0, cost = 0;
  SOURCES.forEach(s => {
    const pw = demand * (norm[s.key] / 100);
    co2  += pw * s.co2;
    cost += pw * s.cost * 1000;
  });
  co2  = co2  / 1e6;
  cost = cost / 1e8;

  const stableRatio = (norm.lng + norm.coal + norm.oil + norm.nuclear + norm.hydro) / 100;
  const stablePow   = demand * stableRatio;
  const estSolar    = demand * (norm.solar / 100) * solarFactor;
  const estWind     = demand * (norm.wind  / 100) * windFactor;
  const supply      = stablePow + estSolar + estWind;
  const reserve     = ((supply - demand) / demand) * 100;

  let stabilityLabel, stabilityColor;
  if      (reserve >= 8)  { stabilityLabel = "✅ 安定";          stabilityColor = "#0ca30c"; }
  else if (reserve >= 3)  { stabilityLabel = "⚠️ やや不安";      stabilityColor = "#fab219"; }
  else if (reserve >= 0)  { stabilityLabel = "🔶 要注意";        stabilityColor = "#ec835a"; }
  else                    { stabilityLabel = "🔴 停電リスクあり"; stabilityColor = "#E24B4A"; }

  return {
    co2: Math.round(co2 * 10) / 10,
    cost: Math.round(cost * 10) / 10,
    reserve: Math.round(reserve * 10) / 10,
    supply: Math.round(supply),
    stabilityLabel, stabilityColor, norm,
  };
}

// ============================================================
// App
// ============================================================
export default function App() {
  const [mix, setMix]           = useState({ ...PRESETS.current });
  const [tab, setTab]           = useState("sim");       // "sim" | "scenario"
  const [playing, setPlaying]   = useState(false);
  const [frameIdx, setFrameIdx] = useState(0);
  const timerRef                = useRef(null);

  const metrics  = calcMetrics(mix);
  const total    = Math.round(Object.values(mix).reduce((a, b) => a + b, 0));

  // シナリオモード：全コマの需要・供給を計算
  const scenarioFrames = SCENARIO_DATA.map(row => {
    const m = calcMetrics(mix, row.demand, row.solarFactor, row.windFactor);
    return {
      time: row.time,
      demand: row.demand,
      supply: m.supply,
      reserve: m.reserve,
      color: m.reserve >= 3 ? "#1baf7a" : m.reserve >= 0 ? "#ec835a" : "#E24B4A",
    };
  });

  // アニメーション制御
  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setFrameIdx(i => {
          if (i >= SCENARIO_DATA.length - 1) { setPlaying(false); return i; }
          return i + 1;
        });
      }, 120);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [playing]);

  function handlePlay() {
    if (frameIdx >= SCENARIO_DATA.length - 1) setFrameIdx(0);
    setPlaying(true);
  }

  // 現在コマの情報
  const currentFrame = scenarioFrames[frameIdx];

  // スライダー変更時はアニメーション停止
  function handleSlider(key, value) {
    setPlaying(false);
    setMix(prev => ({ ...prev, [key]: parseFloat(value) }));
  }

  function applyPreset(name) {
    setPlaying(false);
    setFrameIdx(0);
    setMix({ ...PRESETS[name] });
  }

  // グラフ用：frameIdxまでのデータ
  const chartData = scenarioFrames.slice(0, frameIdx + 1);

  return (
    <div style={{ padding: "1.5rem", fontFamily: "sans-serif", maxWidth: 820 }}>

      {/* タイトル */}
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>電源構成シミュレーター</h1>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
        スライダーで電源割合を変えてシミュレート。猛暑日モードでは実データで1日の需給を再生します。
      </p>

      {/* タブ */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[{key:"sim", label:"⚡ シミュレーター"}, {key:"scenario", label:"🌡️ 猛暑日シナリオ（2025/8/30）"}].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPlaying(false); }}
            style={{
              padding: "7px 16px", fontSize: 13, borderRadius: 6, cursor: "pointer",
              border: tab === t.key ? "none" : "0.5px solid #ccc",
              background: tab === t.key ? "#1a1a1a" : "transparent",
              color: tab === t.key ? "#fff" : "#555", fontWeight: tab === t.key ? 500 : 400,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* プリセット */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          {key:"current",    label:"現状（2025年夏）"},
          {key:"target2030", label:"2030年目標"},
          {key:"renew100",   label:"再エネ100%"},
          {key:"nuclear",    label:"原子力増強"},
        ].map(p => (
          <button key={p.key} onClick={() => applyPreset(p.key)}
            style={{ fontSize: 12, padding: "5px 12px", border: "0.5px solid #ccc",
              borderRadius: 6, background: "transparent", color: "#555", cursor: "pointer" }}>
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 24 }}>

        {/* スライダー */}
        <div style={{ width: 260, flexShrink: 0 }}>
          {SOURCES.map(s => (
            <div key={s.key} style={{ padding: "8px 0", borderBottom: "0.5px solid #eee" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: s.color, display: "inline-block" }} />
                  {s.label}
                </span>
                <span style={{ fontSize: 12, color: "#888" }}>
                  {metrics.norm[s.key].toFixed(1)}%
                </span>
              </div>
              <input type="range" min="0" max="100" step="1"
                value={Math.round(mix[s.key] || 0)}
                onChange={e => handleSlider(s.key, e.target.value)}
                style={{ width: "100%" }} />
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12,
            color: Math.abs(total - 100) > 1 ? "#E24B4A" : "#888",
            paddingTop: 8, borderTop: "0.5px solid #ccc", marginTop: 4 }}>
            <span>合計</span><span style={{ fontWeight: 500 }}>{total}%</span>
          </div>
        </div>

        {/* メインエリア */}
        <div style={{ flex: 1 }}>

          {/* ===== シミュレータータブ ===== */}
          {tab === "sim" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                <MetricCard label="CO2排出量"  value={metrics.co2}  unit="t-CO2/h" barColor="#E24B4A" barPct={Math.min((metrics.co2/35)*100,100)} />
                <MetricCard label="発電コスト" value={metrics.cost} unit="億円/h"   barColor="#eda100" barPct={Math.min((metrics.cost/18)*100,100)} />
                <div style={{ background:"#f5f5f3", borderRadius:8, padding:"14px 16px" }}>
                  <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>猛暑日の安定性</div>
                  <div style={{ fontSize:14, fontWeight:500, color:metrics.stabilityColor }}>{metrics.stabilityLabel}</div>
                  <div style={{ fontSize:12, color:"#888", marginTop:4 }}>予備率 {metrics.reserve}%</div>
                </div>
              </div>

              {/* 横棒グラフ */}
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={SOURCES.map(s => ({ name: s.label, value: Math.round(metrics.norm[s.key]*10)/10, color: s.color }))}
                  layout="vertical" margin={{ left:70, right:20, top:0, bottom:0 }}>
                  <XAxis type="number" domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{ fontSize:11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:11 }} width={70} />
                  <Tooltip formatter={v=>`${v}%`} />
                  <Bar dataKey="value" radius={[0,4,4,0]}>
                    {SOURCES.map((s,i) => <Cell key={i} fill={s.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p style={{ fontSize:11, color:"#aaa", marginTop:10 }}>
                基準：猛暑日ピーク需要 47,315 MW（2025/8/30 13:30実績）
              </p>
            </>
          )}

          {/* ===== シナリオタブ ===== */}
          {tab === "scenario" && (
            <>
              {/* 現在コマの情報 */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
                <div style={{ background:"#f5f5f3", borderRadius:8, padding:"12px 14px" }}>
                  <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>時刻</div>
                  <div style={{ fontSize:22, fontWeight:500 }}>{currentFrame.time}</div>
                </div>
                <div style={{ background:"#f5f5f3", borderRadius:8, padding:"12px 14px" }}>
                  <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>需要</div>
                  <div style={{ fontSize:20, fontWeight:500 }}>{currentFrame.demand.toLocaleString()}<span style={{ fontSize:11, color:"#888", marginLeft:3 }}>MW</span></div>
                </div>
                <div style={{ background:"#f5f5f3", borderRadius:8, padding:"12px 14px" }}>
                  <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>この構成での予備率</div>
                  <div style={{ fontSize:20, fontWeight:500, color:currentFrame.color }}>
                    {currentFrame.reserve}%
                  </div>
                  <div style={{ fontSize:11, color: currentFrame.color, marginTop:2 }}>
                    {currentFrame.reserve >= 3 ? "✅ 安定" : currentFrame.reserve >= 0 ? "🔶 要注意" : "🔴 停電リスク"}
                  </div>
                </div>
              </div>

              {/* 再生コントロール */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <button onClick={handlePlay} disabled={playing}
                  style={{ padding:"6px 16px", fontSize:13, borderRadius:6, border:"none",
                    background: playing ? "#ccc" : "#1a1a1a", color:"#fff", cursor: playing ? "default" : "pointer" }}>
                  ▶ 再生
                </button>
                <button onClick={() => { setPlaying(false); setFrameIdx(0); }}
                  style={{ padding:"6px 12px", fontSize:13, borderRadius:6, border:"0.5px solid #ccc",
                    background:"transparent", color:"#555", cursor:"pointer" }}>
                  ↺ リセット
                </button>
                <input type="range" min={0} max={SCENARIO_DATA.length - 1} value={frameIdx}
                  onChange={e => { setPlaying(false); setFrameIdx(parseInt(e.target.value)); }}
                  style={{ flex:1 }} />
              </div>

              {/* 需給カーブ */}
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ left:10, right:20, top:4, bottom:0 }}>
                  <XAxis dataKey="time" tick={{ fontSize:10 }}
                    interval={Math.floor(chartData.length / 6)} />
                  <YAxis domain={[20000, 52000]} tickFormatter={v=>`${Math.round(v/1000)}万`} tick={{ fontSize:10 }} />
                  <Tooltip formatter={(v,n) => [`${v.toLocaleString()} MW`, n === "demand" ? "需要" : "供給（この構成）"]} />
                  <Legend formatter={n => n === "demand" ? "需要（実績）" : "供給（この構成）"} />
                  <ReferenceLine y={47315} stroke="#E24B4A" strokeDasharray="3 3" label={{ value:"ピーク需要", fontSize:10, fill:"#E24B4A" }} />
                  <Line type="monotone" dataKey="demand" stroke="#E24B4A" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="supply" stroke="#1baf7a" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>

              <p style={{ fontSize:11, color:"#aaa", marginTop:8 }}>
                出典：OCCTO エリア需給実績（2025年8月）／ 気象庁 東京気温データ（2025年）
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit, barColor, barPct }) {
  return (
    <div style={{ background:"#f5f5f3", borderRadius:8, padding:"14px 16px" }}>
      <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>{label}</div>
      <div>
        <span style={{ fontSize:22, fontWeight:500 }}>{value}</span>
        <span style={{ fontSize:12, color:"#888", marginLeft:4 }}>{unit}</span>
      </div>
      <div style={{ marginTop:8, height:4, borderRadius:2, background:"#ddd", overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:2, background:barColor, width:`${barPct}%`, transition:"width .25s" }} />
      </div>
    </div>
  );
}