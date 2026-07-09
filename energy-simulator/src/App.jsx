import { useState, useEffect, useRef } from "react";
import { Bar } from "recharts";
import {
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ============================================================
// 定数：電源別CO2排出係数・発電コスト
// 出典：環境省、資源エネルギー庁（令和7年1月）
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

// 猛暑日ピーク需要（2025/8/30 13:30 実績）
const DEMAND = 47315;

// 猛暑日の太陽光・風力 実稼働率（実データより）
const SOLAR_FACTOR = 0.248;   // 太陽光は24.8%しか出力できなかった
const WIND_FACTOR  = 0.0016;  // 風力は0.16%（ほぼ無風）

// プリセット構成
const PRESETS = {
  current:    { lng: 40, coal: 15, oil: 1,  nuclear: 0,  hydro: 2,  solar: 25, wind: 0.2 },
  target2030: { lng: 30, coal: 15, oil: 1,  nuclear: 20, hydro: 10, solar: 20, wind: 5   },
  renew100:   { lng: 0,  coal: 0,  oil: 0,  nuclear: 0,  hydro: 10, solar: 70, wind: 20  },
  nuclear:    { lng: 20, coal: 5,  oil: 1,  nuclear: 35, hydro: 5,  solar: 20, wind: 5   },
};

// ============================================================
// calcMetrics: スライダー値 → 3指標を計算
// ============================================================
function calcMetrics(mix) {
  const total = Object.values(mix).reduce((a, b) => a + b, 0) || 1;

  // 割合を正規化（合計100%に）
  const norm = {};
  SOURCES.forEach((s) => {
    norm[s.key] = ((mix[s.key] || 0) / total) * 100;
  });

  // CO2排出量 (t-CO2/h)
  let co2 = 0;
  SOURCES.forEach((s) => {
    co2 += DEMAND * (norm[s.key] / 100) * s.co2;
  });
  co2 = co2 / 1e6;

  // 発電コスト (億円/h)
  let cost = 0;
  SOURCES.forEach((s) => {
    cost += DEMAND * (norm[s.key] / 100) * s.cost * 1000;
  });
  cost = cost / 1e8;

  // 安定性スコア（猛暑日ピーク時の予備率）
  const stableRatio = (norm.lng + norm.coal + norm.oil + norm.nuclear + norm.hydro) / 100;
  const stablePow   = DEMAND * stableRatio;
  const estSolar    = DEMAND * (norm.solar / 100) * SOLAR_FACTOR;
  const estWind     = DEMAND * (norm.wind  / 100) * WIND_FACTOR;
  const estTotal    = stablePow + estSolar + estWind;
  const reserve     = ((estTotal - DEMAND) / DEMAND) * 100;

  let stabilityLabel, stabilityColor;
  if      (reserve >= 8)  { stabilityLabel = "✅ 安定";         stabilityColor = "#0ca30c"; }
  else if (reserve >= 3)  { stabilityLabel = "⚠️ やや不安";     stabilityColor = "#fab219"; }
  else if (reserve >= 0)  { stabilityLabel = "🔶 要注意";       stabilityColor = "#ec835a"; }
  else                    { stabilityLabel = "🔴 停電リスクあり"; stabilityColor = "#E24B4A"; }

  return {
    co2:    Math.round(co2  * 10) / 10,
    cost:   Math.round(cost * 10) / 10,
    reserve: Math.round(reserve * 10) / 10,
    stabilityLabel,
    stabilityColor,
    norm,
  };
}

// ============================================================
// App コンポーネント
// ============================================================
export default function App() {
  const [mix, setMix] = useState({ ...PRESETS.current });
  const metrics = calcMetrics(mix);
  const total   = Math.round(Object.values(mix).reduce((a, b) => a + b, 0));

  const chartData = SOURCES.map((s) => ({
    name:  s.label,
    value: Math.round(metrics.norm[s.key] * 10) / 10,
    color: s.color,
  }));

  function handleSlider(key, value) {
    setMix((prev) => ({ ...prev, [key]: parseFloat(value) }));
  }

  function applyPreset(name) {
    setMix({ ...PRESETS[name] });
  }

  return (
    <div style={{ padding: "1.5rem", fontFamily: "sans-serif", maxWidth: 780, margin: "0 auto" }}>

      {/* タイトル */}
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>
        電源構成シミュレーター
      </h1>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>
        スライダーで割合を変えると3指標がリアルタイムで変わります
        （基準：猛暑日ピーク需要 47,315 MW）
      </p>

      {/* 3指標カード */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
        <MetricCard
          label="CO2排出量"
          value={metrics.co2}
          unit="t-CO2/h"
          barColor="#E24B4A"
          barPct={Math.min((metrics.co2 / 35) * 100, 100)}
        />
        <MetricCard
          label="発電コスト"
          value={metrics.cost}
          unit="億円/h"
          barColor="#eda100"
          barPct={Math.min((metrics.cost / 18) * 100, 100)}
        />
        <div style={{ background: "#f5f5f3", borderRadius: 8, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>猛暑日の安定性</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: metrics.stabilityColor }}>
            {metrics.stabilityLabel}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
            予備率 {metrics.reserve}%
          </div>
        </div>
      </div>

      {/* プリセットボタン */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { key: "current",    label: "現状（2025年夏）" },
          { key: "target2030", label: "2030年目標" },
          { key: "renew100",   label: "再エネ100%" },
          { key: "nuclear",    label: "原子力増強" },
        ].map((p) => (
          <button
            key={p.key}
            onClick={() => applyPreset(p.key)}
            style={{
              fontSize: 12, padding: "5px 12px",
              border: "0.5px solid #ccc", borderRadius: 6,
              background: "transparent", color: "#555", cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* スライダー */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 2rem", marginBottom: 24 }}>
        {SOURCES.map((s) => (
          <div key={s.key} style={{ padding: "10px 0", borderBottom: "0.5px solid #eee" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, display: "inline-block" }} />
                {s.label}
              </span>
              <span style={{ fontSize: 13, color: "#888", minWidth: 40, textAlign: "right" }}>
                {metrics.norm[s.key].toFixed(1)}%
              </span>
            </div>
            <input
              type="range" min="0" max="100" step="1"
              value={Math.round(mix[s.key] || 0)}
              onChange={(e) => handleSlider(s.key, e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        ))}

        {/* 合計表示 */}
        <div style={{
          gridColumn: "1 / -1",
          display: "flex", justifyContent: "space-between",
          fontSize: 12, color: "#888",
          paddingTop: 8, borderTop: "0.5px solid #ccc",
        }}>
          <span>合計</span>
          <span style={{ color: Math.abs(total - 100) > 1 ? "#E24B4A" : "#888", fontWeight: 500 }}>
            {total}%
          </span>
        </div>
      </div>

      {/* 横棒グラフ */}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 70, right: 20, top: 0, bottom: 0 }}>
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
          <Tooltip formatter={(v) => `${v}%`} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p style={{ fontSize: 11, color: "#aaa", marginTop: 12 }}>
        猛暑日実績（2025/8/30 13:30）: 東京38.4℃ ／ 需要47,315 MW ／ 太陽光24.8%・風力0.16%
      </p>
    </div>
  );
}

// ============================================================
// サブコンポーネント：指標カード
// ============================================================
function MetricCard({ label, value, unit, barColor, barPct }) {
  return (
    <div style={{ background: "#f5f5f3", borderRadius: 8, padding: "14px 16px" }}>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{label}</div>
      <div>
        <span style={{ fontSize: 22, fontWeight: 500 }}>{value}</span>
        <span style={{ fontSize: 12, color: "#888", marginLeft: 4 }}>{unit}</span>
      </div>
      <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: "#ddd", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 2, background: barColor, width: `${barPct}%`, transition: "width .25s" }} />
      </div>
    </div>
  );
}