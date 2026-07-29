import pandas as pd
import json
import os

os.makedirs('output', exist_ok=True)

# ============================================================
# STEP 1: 関東8地点の気温データ読み込み・結合
# 出典：気象庁「過去の気象データ・ダウンロード」
# ============================================================

def read_temp_file(path, stations):
    """
    stations: [('地点名', 列インデックス), ...]
    気象庁CSVはShift-JIS、4行スキップ、列構造は
    0列目=日時、各地点は「気温・品質情報・均質番号」の3列セット
    """
    df = pd.read_csv(path, encoding='shift-jis', skiprows=4, header=None)
    df['datetime'] = pd.to_datetime(df[0])
    result = pd.DataFrame({'datetime': df['datetime']})
    for name, col in stations:
        result[name] = pd.to_numeric(df[col], errors='coerce')
    return result

# 東京（大手町）
tokyo = read_temp_file(
    'data/時間別気温1.csv',
    [('東京', 1)]
)

# 甲府・水戸
kofu_mito = read_temp_file(
    'data/時間別気温2.csv',
    [('甲府', 1), ('水戸', 4)]
)

# 横浜・さいたま・千葉・宇都宮・前橋
others = read_temp_file(
    'data/時間別気温3.csv',
    [('横浜', 1), ('さいたま', 4), ('千葉', 7), ('宇都宮', 10), ('前橋', 13)]
)

# 全地点をdatetimeで結合
temp_df = tokyo.merge(kofu_mito, on='datetime', how='inner')
temp_df = temp_df.merge(others, on='datetime', how='inner')

STATIONS = ['東京','甲府','水戸','横浜','さいたま','千葉','宇都宮','前橋']

# 関東エリア代表気温（8地点の単純平均）
temp_df['関東平均気温'] = temp_df[STATIONS].mean(axis=1)

# 30分値需給データとの結合用に「時間キー」を作成
temp_df['hour_key'] = temp_df['datetime'].dt.floor('h')

print(f'気温データ: {len(temp_df)}件 ({temp_df["datetime"].min()} 〜 {temp_df["datetime"].max()})')
print(f'欠損: {temp_df["関東平均気温"].isna().sum()}件')

# ============================================================
# STEP 2: 電力需給データ読み込み（全月）
# 出典：OCCTO エリア需給実績データ（東京エリア）
# ============================================================

cols = ['date','time','需要','原子力','火力_LNG','火力_石炭','火力_石油','火力_その他',
        '水力','地熱','バイオマス','太陽光_実績','太陽光_制御量','風力_実績','風力_制御量',
        '揚水','蓄電池','連系線','その他','合計']

months = ['202504','202505','202506','202507','202508','202509',
          '202510','202511','202512','202601','202602','202603']

dfs = []
for m in months:
    df = pd.read_csv(f'data/eria_jukyu_{m}_03.csv',
                     encoding='utf-8', skiprows=1, header=0)
    df.columns = cols
    df['ym'] = m
    for c in cols[2:]:
        df[c] = pd.to_numeric(df[c], errors='coerce')
    dfs.append(df)

demand_df = pd.concat(dfs, ignore_index=True)
demand_df['datetime'] = pd.to_datetime(
    demand_df['date'].astype(str) + ' ' + demand_df['time'].astype(str),
    format='%Y/%m/%d %H:%M'
)
demand_df['hour_key'] = demand_df['datetime'].dt.floor('h')

print(f'\n需給データ: {len(demand_df)}件 ({demand_df["datetime"].min()} 〜 {demand_df["datetime"].max()})')

# ============================================================
# STEP 3: 気温×需要のマージ・相関分析
# ============================================================

merged = pd.merge(
    demand_df,
    temp_df[['hour_key', '東京', '関東平均気温']],
    on='hour_key', how='inner'
)
merged = merged.dropna(subset=['関東平均気温', '需要'])

print(f'\nマージ後: {len(merged)}件')

# 曜日・休日フラグを追加
merged['曜日'] = merged['datetime'].dt.dayofweek  # 0=月 〜 6=日
merged['休日フラグ'] = (merged['曜日'] >= 5).astype(int)  # 土日=1

# 単純線形相関（参考値）
corr_kanto = merged['関東平均気温'].corr(merged['需要'])
print(f'\n[単純線形相関]')
print(f'  関東8地点平均 vs 需要: {corr_kanto:.3f}')
print(f'  ※全年データはU字型（寒くても暑くても需要高）なので線形相関は低くなる')

# 不快度（快適温度22℃からの乖離）
COMFORT_TEMP = 22.0
merged['不快度'] = (merged['関東平均気温'] - COMFORT_TEMP).abs()

# 平日・休日別の平均需要
print(f'\n[平日・休日の平均需要]')
print(merged.groupby('休日フラグ')['需要'].agg(['mean','max','count']).round(0))

# 重回帰：不快度 + 休日フラグ
import numpy as np
X = np.column_stack([
    merged['不快度'].values,
    merged['休日フラグ'].values,
    np.ones(len(merged))
])
Y = merged['需要'].values
coeffs, _, _, _ = np.linalg.lstsq(X, Y, rcond=None)
slope_discomfort, slope_holiday, intercept = coeffs

Y_pred = X @ coeffs
corr_multi = np.corrcoef(Y, Y_pred)[0,1]
rmse = np.sqrt(np.mean((Y - Y_pred)**2))

print(f'\n=== 重回帰結果（曜日込み）===')
print(f'  需要(MW) = {slope_discomfort:.1f} × |気温-{COMFORT_TEMP}℃| + ({slope_holiday:.1f}) × 休日フラグ + {intercept:.0f}')
print(f'  相関係数: {corr_multi:.3f}（曜日なしは0.333）')
print(f'  RMSE:     {rmse:.0f} MW')
print(f'\n[予測例]')
examples = [(38,0,'夏38℃・平日'),(38,1,'夏38℃・休日'),
            (0, 0,'冬0℃・平日'), (0, 1,'冬0℃・休日'),
            (22,0,'22℃・平日'),  (22,1,'22℃・休日')]
for temp, holiday, label in examples:
    pred = slope_discomfort * abs(temp - COMFORT_TEMP) + slope_holiday * holiday + intercept
    print(f'  {label}: {pred:,.0f} MW')

# 気温帯別の平均需要
merged['気温帯'] = pd.cut(
    merged['関東平均気温'],
    bins=[float('-inf'), 5, 10, 15, 20, 25, 30, 33, 35, float('inf')],
    labels=['〜5℃','5-10℃','10-15℃','15-20℃','20-25℃','25-30℃','30-33℃','33-35℃','35℃以上']
)
temp_demand = merged.groupby('気温帯', observed=True)['需要'].agg(['mean','max','count']).reset_index()
temp_demand.columns = ['気温帯','平均需要(MW)','最大需要(MW)','コマ数']
temp_demand['平均需要(MW)'] = temp_demand['平均需要(MW)'].astype(int)
temp_demand['最大需要(MW)'] = temp_demand['最大需要(MW)'].astype(int)
print('\n=== 気温帯別 平均需要（関東平均気温ベース）===')
print(temp_demand.to_string(index=False))

# ============================================================
# STEP 4: 未来予測用の回帰式（曜日込み重回帰）
# 説明変数：不快度（|気温 - 22℃|）・休日フラグ（土日=1）
# 目的変数：需要（MW）
# ============================================================

# 回帰係数をJSONで保存（Reactから使う用）
regression = {
    'slope_discomfort': round(float(slope_discomfort), 1),
    'slope_holiday':    round(float(slope_holiday), 1),
    'intercept':        round(float(intercept), 0),
    'comfort_temp':     COMFORT_TEMP,
    'corr':             round(float(corr_multi), 3),
    'rmse':             round(float(rmse), 0),
}
with open('output/regression.json', 'w') as f:
    json.dump(regression, f)
print(f'\nregression.json 保存完了')
print(f'  slope_discomfort: {regression["slope_discomfort"]}')
print(f'  slope_holiday:    {regression["slope_holiday"]}')
print(f'  intercept:        {regression["intercept"]}')

# ============================================================
# STEP 5: 季節別ピーク日の特定・シナリオJSON出力
# 出典：OCCTO エリア需給実績データ
# ============================================================

seasons = {
    'spring': ['202504','202505'],
    'rainy':  ['202506'],
    'autumn': ['202510','202511'],
    'winter': ['202601','202602','202512'],
}

print('\n=== 季節別 需要ピーク日 ===')
peak_days = {}
for season, yms in seasons.items():
    sub = demand_df[demand_df['ym'].isin(yms)]
    daily = sub.groupby('date')['需要'].max().reset_index()
    best = daily.loc[daily['需要'].idxmax()]
    peak_days[season] = best['date']
    print(f'  {season}: {best["date"]} ({int(best["需要"]):,} MW)')

peak_days['aug30'] = '2025/8/30'
peak_days['aug6']  = '2025/8/6'

def extract_day(date_str):
    day = demand_df[demand_df['date'] == date_str].copy()
    out = []
    for _, row in day.iterrows():
        demand = int(row['需要'])
        sf = round(float(row['太陽光_実績']) / demand, 4) if demand else 0
        wf = round(float(row['風力_実績'])  / demand, 4) if demand else 0
        out.append({
            'time':        row['time'],
            'demand':      demand,
            'solarFactor': max(0, sf),
            'windFactor':  max(0, wf),
        })
    return out

scenarios = {}
for key, date in peak_days.items():
    data = extract_day(date)
    peak = max(x['demand'] for x in data)
    scenarios[key] = {'date': date, 'peak': peak, 'data': data}
    print(f'  {key}: {date} ピーク{peak:,}MW ({len(data)}コマ)')

with open('output/scenarios.json', 'w', encoding='utf-8') as f:
    json.dump(scenarios, f, ensure_ascii=False, indent=2)
print('\nscenarios.json 保存完了')

print('\n=== 全処理完了 ===')
print('output/ フォルダに以下が出力されました：')
print('  scenarios.json  → シミュレーターのシナリオデータ')
print('  regression.json → 未来予測の回帰係数')