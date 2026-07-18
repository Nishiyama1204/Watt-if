import pandas as pd
import json
import os

os.makedirs('output', exist_ok=True)

# ============================================================
# STEP 1: 気温データ読み込み・整形
# ============================================================

temp_df = pd.read_csv('data/時間別気温.csv',
                      encoding='shift-jis', skiprows=4, header=None,
                      names=['datetime','羽田','羽田_品質','羽田_均質',
                             '東京','東京_品質','東京_均質',
                             '練馬','練馬_品質','練馬_均質',
                             '八王子','八王子_品質','八王子_均質',
                             '小河内','小河内_品質','小河内_均質'])
temp_df['datetime'] = pd.to_datetime(temp_df['datetime'])
temp_df = temp_df[['datetime','東京']].dropna()
temp_df['hour_key'] = temp_df['datetime'].dt.floor('h')

# 日別最高気温（猛暑日確認用）
temp_df['date'] = temp_df['datetime'].dt.date
daily_max = temp_df.groupby('date')['東京'].max().reset_index()
mosha = daily_max[daily_max['東京'] >= 35].sort_values('東京', ascending=False)
print('=== 猛暑日（35℃以上）トップ10 ===')
print(mosha.head(10).to_string(index=False))
print(f'\n真夏日（30℃以上）: {len(daily_max[daily_max["東京"] >= 30])}日')
print(f'猛暑日（35℃以上）: {len(mosha)}日\n')

# ============================================================
# STEP 2: 電力需給データ読み込み・整形（7〜9月）
# ============================================================

cols = ['date','time','需要','原子力','火力_LNG','火力_石炭','火力_石油','火力_その他',
        '水力','地熱','バイオマス','太陽光_実績','太陽光_制御量','風力_実績','風力_制御量',
        '揚水','蓄電池','連系線','その他','合計']

dfs = []
for month in ['202507', '202508', '202509']:
    df = pd.read_csv(f'data/eria_jukyu_{month}_03.csv',
                     encoding='utf-8', skiprows=1, header=0)
    df.columns = cols
    dfs.append(df)

demand_df = pd.concat(dfs, ignore_index=True)
demand_df['datetime'] = pd.to_datetime(
    demand_df['date'].astype(str) + ' ' + demand_df['time'].astype(str),
    format='%Y/%m/%d %H:%M'
)
for c in cols[2:]:
    demand_df[c] = pd.to_numeric(demand_df[c], errors='coerce')
demand_df['hour_key'] = demand_df['datetime'].dt.floor('h')

# 需要ピーク日確認
daily_demand_max = demand_df.groupby('date')['需要'].max().reset_index()
print('=== 7-9月 需要ピークトップ10 ===')
print(daily_demand_max.nlargest(10, '需要').to_string(index=False))

# ============================================================
# STEP 3: 気温×需要 マージ・相関分析
# ============================================================

merged = pd.merge(demand_df, temp_df[['hour_key','東京']], on='hour_key', how='inner')
print(f'\nマージ後行数: {len(merged)}件')

# 相関係数
corr = merged['東京'].corr(merged['需要'])
print(f'気温×需要の相関係数: {corr:.3f}')

# 気温帯別の平均・最大需要
merged['気温帯'] = pd.cut(merged['東京'],
                          bins=[0, 25, 30, 33, 35, 40],
                          labels=['〜25℃','25-30℃','30-33℃','33-35℃','35℃以上'])
temp_demand = merged.groupby('気温帯', observed=True)['需要'].agg(['mean','max','count']).reset_index()
temp_demand.columns = ['気温帯','平均需要(MW)','最大需要(MW)','コマ数']
temp_demand['平均需要(MW)'] = temp_demand['平均需要(MW)'].astype(int)
temp_demand['最大需要(MW)'] = temp_demand['最大需要(MW)'].astype(int)
print('\n=== 気温帯別 平均需要 ===')
print(temp_demand.to_string(index=False))

base = temp_demand[temp_demand['気温帯']=='〜25℃']['平均需要(MW)'].values[0]
peak = temp_demand[temp_demand['気温帯']=='35℃以上']['平均需要(MW)'].values[0]
print(f'\n25℃以下 vs 35℃以上の需要差: +{peak-base:,} MW（+{(peak-base)/base*100:.1f}%）')

# ============================================================
# STEP 4: シナリオJSON出力（猛暑日トップ3）
# ============================================================

top_days = ['2025/8/30', '2025/8/18', '2025/8/24']
scenarios = {}
for day in top_days:
    mask = demand_df['date'] == day
    day_df = demand_df[mask].copy()
    day_df['hour'] = day_df['datetime'].dt.strftime('%H:%M')
    key_cols = ['hour','需要','火力_LNG','火力_石炭','火力_石油','火力_その他',
                '水力','原子力','太陽光_実績','風力_実績']
    scenarios[day] = day_df[key_cols].to_dict('records')

with open('output/scenarios.json', 'w', encoding='utf-8') as f:
    json.dump(scenarios, f, ensure_ascii=False, indent=2)
print('\nシナリオJSON → output/scenarios.json')

# ============================================================
# STEP 5: フル結合データJSON出力（React用）
# ============================================================

out = merged[['datetime','東京','需要','火力_LNG','火力_石炭','原子力',
              '太陽光_実績','風力_実績','水力']].copy()
out['datetime'] = out['datetime'].astype(str)
out.to_json('output/merged_data.json', orient='records', force_ascii=False)
print(f'フルデータJSON → output/merged_data.json（{len(out)}件）')