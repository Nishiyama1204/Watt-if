// ============================================================
// エネルギーミックスシミュレーター 計算ロジック
// ============================================================

// ----------------------------
// 定数：電源別CO2排出係数 (g-CO2/kWh)
// 出典：環境省「算定・報告・公表制度における算定方法・排出係数一覧」
// ----------------------------
const CO2_FACTORS = {
  lng:    429,  // 火力（LNG）
  coal:   820,  // 火力（石炭）
  oil:    738,  // 火力（石油）
  nuclear: 19,  // 原子力（ライフサイクル）
  hydro:   11,  // 水力（ライフサイクル）
  solar:   38,  // 太陽光（ライフサイクル）
  wind:    26,  // 風力（ライフサイクル）
};

// ----------------------------
// 定数：電源別発電コスト (円/kWh)
// 出典：資源エネルギー庁「発電コスト検証WG とりまとめ（案）」令和7年1月
// ※政策経費なしのLCOEを使用
// ----------------------------
const COST_FACTORS = {
  lng:     24.7,  // LNG火力
  coal:    43.8,  // 石炭火力
  oil:     10.3,  // 石油火力
  nuclear: 11.2,  // 原子力（下限値）
  hydro:   13.0,  // 水力
  solar:   10.9,  // 太陽光（事業用）
  wind:    21.1,  // 陸上風力
};

// ----------------------------
// 猛暑日シナリオ定数
// 出典：OCCTO エリア需給実績データ 2025年8月
// ピーク時刻：2025/8/30 13:30 需要47,315MW
// ----------------------------
const SCENARIO_PEAK_DEMAND = 47315; // MW（猛暑日ピーク需要）

// 猛暑日ピーク時の実績発電量（MW）
// ※太陽光・風力は実測値、他は推定
const SCENARIO_ACTUAL = {
  lng:     19118,
  coal:     6908,
  oil:       500, // その他火力として推定
  nuclear:     0, // 東京エリアは原子力ゼロ
  hydro:    1099,
  solar:   11718, // 実績値
  wind:       75, // 実績値（猛暑日＝無風に近い）
};

// ----------------------------
// メイン計算関数
// ----------------------------

/**
 * スライダー値から3指標を計算する
 * @param {Object} mix - 電源構成 { lng, coal, oil, nuclear, hydro, solar, wind }
 *                       各値は0〜100の割合（合計が100になること）
 * @param {number} totalDemand - 想定総需要 (MW)
 * @returns {Object} { co2, cost, stabilityScore, stabilityDetail }
 */
function calcMetrics(mix, totalDemand = 47315) {
  // 割合 → 実発電量(MW)に変換
  const power = {};
  for (const src of Object.keys(mix)) {
    power[src] = totalDemand * (mix[src] / 100);
  }

  // --- CO2排出量 (t-CO2/h) ---
  let co2 = 0;
  for (const src of Object.keys(power)) {
    co2 += power[src] * CO2_FACTORS[src]; // MW × g-CO2/kWh = g-CO2/h × 1000
  }
  co2 = co2 / 1e6; // g → t に変換

  // --- 発電コスト (億円/h) ---
  let cost = 0;
  for (const src of Object.keys(power)) {
    cost += power[src] * COST_FACTORS[src]; // MW × 円/kWh = 円/h × 1000
  }
  cost = cost * 1000 / 1e8; // kW→kWh換算(×1000) 円 → 億円 (÷1e8)

  // --- 安定性スコア（猛暑日シナリオでの評価） ---
  // 「確実に発電できる電源」= 火力(LNG/石炭/石油) + 原子力 + 水力
  // 太陽光・風力は猛暑日ピーク時の実績比率をもとに推定
  const stableRatio = (mix.lng + mix.coal + mix.oil + mix.nuclear + mix.hydro) / 100;
  const stablePower = totalDemand * stableRatio;

  // 太陽光：猛暑日13時のピーク時は実績で24.8%（11718/47315）程度発電
  const solarFactor = 0.248;
  // 風力：猛暑日は0.16%（75/47315）しか発電できなかった実績
  const windFactor = 0.0016;

  const estimatedSolar = totalDemand * (mix.solar / 100) * solarFactor;
  const estimatedWind  = totalDemand * (mix.wind  / 100) * windFactor;

  const estimatedTotal = stablePower + estimatedSolar + estimatedWind;
  const shortage = totalDemand - estimatedTotal;
  const reserveRate = ((estimatedTotal - totalDemand) / totalDemand) * 100;

  // 安定性スコア：予備率が3%以上で安全、0%で危険、マイナスで停電リスク
  let stabilityScore;
  let stabilityLabel;
  if (reserveRate >= 8) {
    stabilityScore = 100;
    stabilityLabel = '✅ 安定（予備率十分）';
  } else if (reserveRate >= 3) {
    stabilityScore = 70;
    stabilityLabel = '⚠️ やや不安（予備率ギリギリ）';
  } else if (reserveRate >= 0) {
    stabilityScore = 40;
    stabilityLabel = '🔶 要注意（予備率不足）';
  } else {
    stabilityScore = 10;
    stabilityLabel = '🔴 停電リスクあり';
  }

  return {
    co2: Math.round(co2 * 10) / 10,           // t-CO2/h（小数1桁）
    cost: Math.round(cost * 10) / 10,          // 億円/h（小数1桁）
    stabilityScore,
    stabilityLabel,
    reserveRate: Math.round(reserveRate * 10) / 10, // %
    shortage: Math.round(shortage),            // MW
  };
}

// ----------------------------
// 動作テスト
// ----------------------------

const testCases = [
  {
    label: '現状の電源構成（2025年夏・東京）',
    mix: { lng: 40, coal: 15, oil: 1, nuclear: 0, hydro: 2, solar: 25, wind: 0.2 },
  },
  {
    label: '2030年エネルギーミックス目標（再エネ36-38%）',
    mix: { lng: 30, coal: 15, oil: 1, nuclear: 20, hydro: 10, solar: 20, wind: 5 },
  },
  {
    label: '再エネ100%（理想論）',
    mix: { lng: 0, coal: 0, oil: 0, nuclear: 0, hydro: 10, solar: 70, wind: 20 },
  },
];

for (const tc of testCases) {
  // 合計を100に正規化
  const total = Object.values(tc.mix).reduce((a, b) => a + b, 0);
  const normalizedMix = {};
  for (const k of Object.keys(tc.mix)) {
    normalizedMix[k] = (tc.mix[k] / total) * 100;
  }

  const result = calcMetrics(normalizedMix, SCENARIO_PEAK_DEMAND);
  console.log(`\n【${tc.label}】`);
  console.log(`  CO2排出量:   ${result.co2} t-CO2/h`);
  console.log(`  発電コスト:  ${result.cost} 億円/h`);
  console.log(`  安定性:      ${result.stabilityLabel}`);
  console.log(`  予備率:      ${result.reserveRate}%`);
  if (result.shortage > 0) {
    console.log(`  不足量:      ${result.shortage.toLocaleString()} MW`);
  }
}