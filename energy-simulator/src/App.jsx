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
  { key:"lng",     label:"火力（LNG）", color:"#2a78d6", co2:429,  cost:24.7 },
  { key:"coal",    label:"火力（石炭）", color:"#73726c", co2:820,  cost:43.8 },
  { key:"oil",     label:"火力（石油）", color:"#eb6834", co2:738,  cost:10.3 },
  { key:"nuclear", label:"原子力",       color:"#8B5CF6", co2:19,   cost:11.2 },
  { key:"hydro",   label:"水力",         color:"#1baf7a", co2:11,   cost:13.0 },
  { key:"solar",   label:"太陽光",       color:"#eda100", co2:38,   cost:10.9 },
  { key:"wind",    label:"風力",         color:"#4a3aa7", co2:26,   cost:21.1 },
];

const PRESETS = {
  current:    { lng:40,  coal:15, oil:1, nuclear:0,  hydro:2,  solar:25, wind:0.2 },
  target2030: { lng:30,  coal:15, oil:1, nuclear:20, hydro:10, solar:20, wind:5   },
  renew100:   { lng:0,   coal:0,  oil:0, nuclear:0,  hydro:10, solar:70, wind:20  },
  nuclear:    { lng:20,  coal:5,  oil:1, nuclear:35, hydro:5,  solar:20, wind:5   },
};

// モード・シナリオ定義
const MODES = {
  normal:  { label:"🌤️ 通常モード",  desc:"季節別の代表的な日で需給を確認" },
  extreme: { label:"🌡️ 猛暑日モード", desc:"実データで記録的な猛暑日の需給を検証" },
};

const SCENARIO_OPTIONS = {
  normal: [
    { key:"spring", label:"春（4月）",  note:"温暖・太陽光良好・風力そこそこ" },
    { key:"rainy",  label:"梅雨（6月）", note:"曇りがち・太陽光激減" },
    { key:"autumn", label:"秋（10月）",  note:"涼しい・太陽光まあまあ・風力多め" },
  ],
  extreme: [
    { key:"aug30", label:"最高気温日（8/30, 38.4℃）", note:"東京で記録的猛暑。需要47,315MW" },
    { key:"aug6",  label:"需要最大日（8/6）",           note:"夏の需要ピーク。57,669MW" },
  ],
};

// ============================================================
// シナリオデータ（実データ + 季節代表日）
// ============================================================
const SCENARIO_DATA = {
  aug30: [
    {time:"0:00",demand:32298,solarFactor:0.0,windFactor:0.0034},{time:"0:30",demand:30879,solarFactor:0.0,windFactor:0.0039},
    {time:"1:00",demand:29816,solarFactor:0.0,windFactor:0.0039},{time:"1:30",demand:28951,solarFactor:0.0,windFactor:0.0048},
    {time:"2:00",demand:28324,solarFactor:0.0,windFactor:0.0046},{time:"2:30",demand:27992,solarFactor:0.0,windFactor:0.005},
    {time:"3:00",demand:27619,solarFactor:0.0,windFactor:0.0048},{time:"3:30",demand:27384,solarFactor:0.0,windFactor:0.0049},
    {time:"4:00",demand:27300,solarFactor:0.0,windFactor:0.0053},{time:"4:30",demand:27240,solarFactor:0.0,windFactor:0.0054},
    {time:"5:00",demand:27342,solarFactor:0.0001,windFactor:0.0055},{time:"5:30",demand:27119,solarFactor:0.01,windFactor:0.0057},
    {time:"6:00",demand:27771,solarFactor:0.0438,windFactor:0.0053},{time:"6:30",demand:28836,solarFactor:0.0906,windFactor:0.0047},
    {time:"7:00",demand:30694,solarFactor:0.143,windFactor:0.0044},{time:"7:30",demand:32743,solarFactor:0.1919,windFactor:0.0042},
    {time:"8:00",demand:35469,solarFactor:0.2283,windFactor:0.0034},{time:"8:30",demand:38128,solarFactor:0.2545,windFactor:0.0032},
    {time:"9:00",demand:40530,solarFactor:0.2745,windFactor:0.0029},{time:"9:30",demand:42324,solarFactor:0.29,windFactor:0.0026},
    {time:"10:00",demand:43577,solarFactor:0.3015,windFactor:0.0025},{time:"10:30",demand:44618,solarFactor:0.3075,windFactor:0.0021},
    {time:"11:00",demand:45528,solarFactor:0.3081,windFactor:0.0021},{time:"11:30",demand:46245,solarFactor:0.305,windFactor:0.0018},
    {time:"12:00",demand:46551,solarFactor:0.2981,windFactor:0.0017},{time:"12:30",demand:46739,solarFactor:0.2871,windFactor:0.0017},
    {time:"13:00",demand:47159,solarFactor:0.2696,windFactor:0.0018},{time:"13:30",demand:47315,solarFactor:0.2477,windFactor:0.0016},
    {time:"14:00",demand:47261,solarFactor:0.2223,windFactor:0.0016},{time:"14:30",demand:47307,solarFactor:0.1938,windFactor:0.0016},
    {time:"15:00",demand:47211,solarFactor:0.162,windFactor:0.0017},{time:"15:30",demand:47299,solarFactor:0.1252,windFactor:0.0016},
    {time:"16:00",demand:47184,solarFactor:0.0874,windFactor:0.0016},{time:"16:30",demand:46744,solarFactor:0.0535,windFactor:0.0015},
    {time:"17:00",demand:45831,solarFactor:0.0259,windFactor:0.0016},{time:"17:30",demand:44953,solarFactor:0.0074,windFactor:0.0014},
    {time:"18:00",demand:44613,solarFactor:0.0001,windFactor:0.0018},{time:"18:30",demand:44355,solarFactor:0.0,windFactor:0.0018},
    {time:"19:00",demand:43441,solarFactor:0.0,windFactor:0.0019},{time:"19:30",demand:42442,solarFactor:0.0,windFactor:0.0019},
    {time:"20:00",demand:41314,solarFactor:0.0,windFactor:0.0019},{time:"20:30",demand:40371,solarFactor:0.0,windFactor:0.0018},
    {time:"21:00",demand:39219,solarFactor:0.0,windFactor:0.0021},{time:"21:30",demand:38116,solarFactor:0.0,windFactor:0.002},
    {time:"22:00",demand:37137,solarFactor:0.0,windFactor:0.0022},{time:"22:30",demand:36083,solarFactor:0.0,windFactor:0.0021},
    {time:"23:00",demand:35035,solarFactor:0.0,windFactor:0.0019},{time:"23:30",demand:33750,solarFactor:0.0,windFactor:0.002},
  ],
  aug6: [
    {time:"0:00",demand:36535,solarFactor:0.0,windFactor:0.0049},{time:"0:30",demand:34942,solarFactor:0.0,windFactor:0.0056},
    {time:"1:00",demand:33616,solarFactor:0.0,windFactor:0.0054},{time:"1:30",demand:32663,solarFactor:0.0,windFactor:0.005},
    {time:"2:00",demand:31926,solarFactor:0.0,windFactor:0.0045},{time:"2:30",demand:31475,solarFactor:0.0,windFactor:0.0041},
    {time:"3:00",demand:31162,solarFactor:0.0,windFactor:0.0034},{time:"3:30",demand:30839,solarFactor:0.0,windFactor:0.0034},
    {time:"4:00",demand:30843,solarFactor:0.0,windFactor:0.0033},{time:"4:30",demand:30887,solarFactor:0.0,windFactor:0.0041},
    {time:"5:00",demand:31218,solarFactor:0.0017,windFactor:0.0039},{time:"5:30",demand:31921,solarFactor:0.018,windFactor:0.004},
    {time:"6:00",demand:33776,solarFactor:0.0419,windFactor:0.0029},{time:"6:30",demand:36183,solarFactor:0.0683,windFactor:0.0027},
    {time:"7:00",demand:39149,solarFactor:0.0923,windFactor:0.0026},{time:"7:30",demand:42324,solarFactor:0.1182,windFactor:0.0018},
    {time:"8:00",demand:46148,solarFactor:0.1359,windFactor:0.0017},{time:"8:30",demand:49241,solarFactor:0.1568,windFactor:0.0014},
    {time:"9:00",demand:52345,solarFactor:0.1852,windFactor:0.0013},{time:"9:30",demand:54306,solarFactor:0.2049,windFactor:0.0012},
    {time:"10:00",demand:55196,solarFactor:0.2198,windFactor:0.0012},{time:"10:30",demand:56486,solarFactor:0.2287,windFactor:0.001},
    {time:"11:00",demand:57163,solarFactor:0.2283,windFactor:0.0009},{time:"11:30",demand:57571,solarFactor:0.2198,windFactor:0.0009},
    {time:"12:00",demand:56819,solarFactor:0.2092,windFactor:0.001},{time:"12:30",demand:56519,solarFactor:0.1949,windFactor:0.001},
    {time:"13:00",demand:57468,solarFactor:0.1784,windFactor:0.0011},{time:"13:30",demand:57669,solarFactor:0.1638,windFactor:0.0012},
    {time:"14:00",demand:56763,solarFactor:0.1477,windFactor:0.0012},{time:"14:30",demand:56347,solarFactor:0.1343,windFactor:0.0013},
    {time:"15:00",demand:55710,solarFactor:0.1176,windFactor:0.0014},{time:"15:30",demand:55633,solarFactor:0.0913,windFactor:0.0017},
    {time:"16:00",demand:55066,solarFactor:0.0648,windFactor:0.0018},{time:"16:30",demand:54108,solarFactor:0.042,windFactor:0.0016},
    {time:"17:00",demand:51766,solarFactor:0.0232,windFactor:0.0016},{time:"17:30",demand:50526,solarFactor:0.0105,windFactor:0.0019},
    {time:"18:00",demand:49904,solarFactor:0.0027,windFactor:0.0029},{time:"18:30",demand:49310,solarFactor:0.0,windFactor:0.0024},
    {time:"19:00",demand:48140,solarFactor:0.0,windFactor:0.0025},{time:"19:30",demand:46852,solarFactor:0.0,windFactor:0.0023},
    {time:"20:00",demand:45400,solarFactor:0.0,windFactor:0.0024},{time:"20:30",demand:44211,solarFactor:0.0,windFactor:0.0024},
    {time:"21:00",demand:42978,solarFactor:0.0,windFactor:0.0024},{time:"21:30",demand:41550,solarFactor:0.0,windFactor:0.0024},
    {time:"22:00",demand:40355,solarFactor:0.0,windFactor:0.0025},{time:"22:30",demand:38984,solarFactor:0.0,windFactor:0.0022},
    {time:"23:00",demand:37537,solarFactor:0.0,windFactor:0.0022},{time:"23:30",demand:36048,solarFactor:0.0,windFactor:0.0028},
  ],
  spring: [
    {time:"0:00",demand:23000,solarFactor:0.0,windFactor:0.035},{time:"0:30",demand:23000,solarFactor:0.0,windFactor:0.036},
    {time:"1:00",demand:23000,solarFactor:0.0,windFactor:0.036},{time:"1:30",demand:23000,solarFactor:0.0,windFactor:0.035},
    {time:"2:00",demand:23000,solarFactor:0.0,windFactor:0.034},{time:"2:30",demand:23000,solarFactor:0.0,windFactor:0.034},
    {time:"3:00",demand:23000,solarFactor:0.0,windFactor:0.033},{time:"3:30",demand:23000,solarFactor:0.0,windFactor:0.033},
    {time:"4:00",demand:23000,solarFactor:0.0,windFactor:0.033},{time:"4:30",demand:23000,solarFactor:0.0,windFactor:0.034},
    {time:"5:00",demand:23200,solarFactor:0.001,windFactor:0.035},{time:"5:30",demand:24100,solarFactor:0.04,windFactor:0.036},
    {time:"6:00",demand:26300,solarFactor:0.09,windFactor:0.037},{time:"6:30",demand:28800,solarFactor:0.15,windFactor:0.037},
    {time:"7:00",demand:31500,solarFactor:0.2,windFactor:0.038},{time:"7:30",demand:33800,solarFactor:0.25,windFactor:0.037},
    {time:"8:00",demand:35200,solarFactor:0.28,windFactor:0.036},{time:"8:30",demand:36300,solarFactor:0.29,windFactor:0.035},
    {time:"9:00",demand:37000,solarFactor:0.3,windFactor:0.034},{time:"9:30",demand:37500,solarFactor:0.3,windFactor:0.034},
    {time:"10:00",demand:37800,solarFactor:0.3,windFactor:0.033},{time:"10:30",demand:38000,solarFactor:0.3,windFactor:0.033},
    {time:"11:00",demand:38000,solarFactor:0.3,windFactor:0.033},{time:"11:30",demand:38000,solarFactor:0.3,windFactor:0.033},
    {time:"12:00",demand:38000,solarFactor:0.29,windFactor:0.034},{time:"12:30",demand:38000,solarFactor:0.28,windFactor:0.034},
    {time:"13:00",demand:38000,solarFactor:0.26,windFactor:0.035},{time:"13:30",demand:37800,solarFactor:0.24,windFactor:0.035},
    {time:"14:00",demand:37500,solarFactor:0.21,windFactor:0.036},{time:"14:30",demand:37000,solarFactor:0.18,windFactor:0.036},
    {time:"15:00",demand:36300,solarFactor:0.14,windFactor:0.037},{time:"15:30",demand:35500,solarFactor:0.1,windFactor:0.037},
    {time:"16:00",demand:34600,solarFactor:0.06,windFactor:0.038},{time:"16:30",demand:33600,solarFactor:0.03,windFactor:0.038},
    {time:"17:00",demand:32500,solarFactor:0.01,windFactor:0.037},{time:"17:30",demand:31400,solarFactor:0.001,windFactor:0.037},
    {time:"18:00",demand:30300,solarFactor:0.0,windFactor:0.036},{time:"18:30",demand:29400,solarFactor:0.0,windFactor:0.036},
    {time:"19:00",demand:28500,solarFactor:0.0,windFactor:0.035},{time:"19:30",demand:27800,solarFactor:0.0,windFactor:0.035},
    {time:"20:00",demand:27200,solarFactor:0.0,windFactor:0.035},{time:"20:30",demand:26700,solarFactor:0.0,windFactor:0.035},
    {time:"21:00",demand:26200,solarFactor:0.0,windFactor:0.036},{time:"21:30",demand:25700,solarFactor:0.0,windFactor:0.036},
    {time:"22:00",demand:25200,solarFactor:0.0,windFactor:0.036},{time:"22:30",demand:24700,solarFactor:0.0,windFactor:0.036},
    {time:"23:00",demand:24200,solarFactor:0.0,windFactor:0.035},{time:"23:30",demand:23700,solarFactor:0.0,windFactor:0.035},
  ],
  rainy: [
    {time:"0:00",demand:26000,solarFactor:0.0,windFactor:0.025},{time:"0:30",demand:26000,solarFactor:0.0,windFactor:0.025},
    {time:"1:00",demand:26000,solarFactor:0.0,windFactor:0.026},{time:"1:30",demand:26000,solarFactor:0.0,windFactor:0.026},
    {time:"2:00",demand:26000,solarFactor:0.0,windFactor:0.025},{time:"2:30",demand:26000,solarFactor:0.0,windFactor:0.025},
    {time:"3:00",demand:26000,solarFactor:0.0,windFactor:0.024},{time:"3:30",demand:26000,solarFactor:0.0,windFactor:0.024},
    {time:"4:00",demand:26000,solarFactor:0.0,windFactor:0.024},{time:"4:30",demand:26000,solarFactor:0.0,windFactor:0.025},
    {time:"5:00",demand:26200,solarFactor:0.001,windFactor:0.025},{time:"5:30",demand:27200,solarFactor:0.02,windFactor:0.026},
    {time:"6:00",demand:29500,solarFactor:0.04,windFactor:0.026},{time:"6:30",demand:32000,solarFactor:0.07,windFactor:0.026},
    {time:"7:00",demand:34800,solarFactor:0.09,windFactor:0.026},{time:"7:30",demand:37000,solarFactor:0.11,windFactor:0.026},
    {time:"8:00",demand:38800,solarFactor:0.12,windFactor:0.025},{time:"8:30",demand:40000,solarFactor:0.13,windFactor:0.025},
    {time:"9:00",demand:40800,solarFactor:0.13,windFactor:0.025},{time:"9:30",demand:41300,solarFactor:0.13,windFactor:0.025},
    {time:"10:00",demand:41600,solarFactor:0.13,windFactor:0.025},{time:"10:30",demand:41800,solarFactor:0.13,windFactor:0.025},
    {time:"11:00",demand:42000,solarFactor:0.13,windFactor:0.025},{time:"11:30",demand:42000,solarFactor:0.13,windFactor:0.025},
    {time:"12:00",demand:42000,solarFactor:0.12,windFactor:0.025},{time:"12:30",demand:42000,solarFactor:0.12,windFactor:0.025},
    {time:"13:00",demand:42000,solarFactor:0.11,windFactor:0.025},{time:"13:30",demand:41800,solarFactor:0.11,windFactor:0.025},
    {time:"14:00",demand:41500,solarFactor:0.1,windFactor:0.025},{time:"14:30",demand:41100,solarFactor:0.08,windFactor:0.025},
    {time:"15:00",demand:40600,solarFactor:0.06,windFactor:0.026},{time:"15:30",demand:40000,solarFactor:0.04,windFactor:0.026},
    {time:"16:00",demand:39300,solarFactor:0.02,windFactor:0.026},{time:"16:30",demand:38500,solarFactor:0.01,windFactor:0.026},
    {time:"17:00",demand:37600,solarFactor:0.002,windFactor:0.026},{time:"17:30",demand:36700,solarFactor:0.0,windFactor:0.026},
    {time:"18:00",demand:35800,solarFactor:0.0,windFactor:0.026},{time:"18:30",demand:34900,solarFactor:0.0,windFactor:0.025},
    {time:"19:00",demand:33900,solarFactor:0.0,windFactor:0.025},{time:"19:30",demand:33000,solarFactor:0.0,windFactor:0.025},
    {time:"20:00",demand:32100,solarFactor:0.0,windFactor:0.025},{time:"20:30",demand:31300,solarFactor:0.0,windFactor:0.025},
    {time:"21:00",demand:30500,solarFactor:0.0,windFactor:0.025},{time:"21:30",demand:29700,solarFactor:0.0,windFactor:0.025},
    {time:"22:00",demand:28900,solarFactor:0.0,windFactor:0.025},{time:"22:30",demand:28200,solarFactor:0.0,windFactor:0.025},
    {time:"23:00",demand:27500,solarFactor:0.0,windFactor:0.025},{time:"23:30",demand:26700,solarFactor:0.0,windFactor:0.025},
  ],
  autumn: [
    {time:"0:00",demand:24000,solarFactor:0.0,windFactor:0.045},{time:"0:30",demand:24000,solarFactor:0.0,windFactor:0.046},
    {time:"1:00",demand:24000,solarFactor:0.0,windFactor:0.046},{time:"1:30",demand:24000,solarFactor:0.0,windFactor:0.045},
    {time:"2:00",demand:24000,solarFactor:0.0,windFactor:0.044},{time:"2:30",demand:24000,solarFactor:0.0,windFactor:0.044},
    {time:"3:00",demand:24000,solarFactor:0.0,windFactor:0.043},{time:"3:30",demand:24000,solarFactor:0.0,windFactor:0.043},
    {time:"4:00",demand:24000,solarFactor:0.0,windFactor:0.044},{time:"4:30",demand:24000,solarFactor:0.0,windFactor:0.045},
    {time:"5:00",demand:24200,solarFactor:0.0,windFactor:0.046},{time:"5:30",demand:25100,solarFactor:0.01,windFactor:0.046},
    {time:"6:00",demand:27200,solarFactor:0.05,windFactor:0.047},{time:"6:30",demand:29600,solarFactor:0.11,windFactor:0.047},
    {time:"7:00",demand:32200,solarFactor:0.17,windFactor:0.047},{time:"7:30",demand:34500,solarFactor:0.22,windFactor:0.046},
    {time:"8:00",demand:36200,solarFactor:0.25,windFactor:0.045},{time:"8:30",demand:37400,solarFactor:0.26,windFactor:0.045},
    {time:"9:00",demand:38200,solarFactor:0.26,windFactor:0.044},{time:"9:30",demand:38700,solarFactor:0.26,windFactor:0.044},
    {time:"10:00",demand:39200,solarFactor:0.26,windFactor:0.044},{time:"10:30",demand:39600,solarFactor:0.26,windFactor:0.044},
    {time:"11:00",demand:40000,solarFactor:0.26,windFactor:0.044},{time:"11:30",demand:40000,solarFactor:0.25,windFactor:0.044},
    {time:"12:00",demand:40000,solarFactor:0.24,windFactor:0.044},{time:"12:30",demand:40000,solarFactor:0.23,windFactor:0.044},
    {time:"13:00",demand:40000,solarFactor:0.21,windFactor:0.045},{time:"13:30",demand:39700,solarFactor:0.19,windFactor:0.045},
    {time:"14:00",demand:39300,solarFactor:0.16,windFactor:0.046},{time:"14:30",demand:38700,solarFactor:0.13,windFactor:0.046},
    {time:"15:00",demand:37900,solarFactor:0.09,windFactor:0.047},{time:"15:30",demand:37000,solarFactor:0.05,windFactor:0.047},
    {time:"16:00",demand:35900,solarFactor:0.02,windFactor:0.047},{time:"16:30",demand:34800,solarFactor:0.005,windFactor:0.048},
    {time:"17:00",demand:33600,solarFactor:0.0,windFactor:0.047},{time:"17:30",demand:32500,solarFactor:0.0,windFactor:0.047},
    {time:"18:00",demand:31400,solarFactor:0.0,windFactor:0.046},{time:"18:30",demand:30400,solarFactor:0.0,windFactor:0.046},
    {time:"19:00",demand:29400,solarFactor:0.0,windFactor:0.045},{time:"19:30",demand:28600,solarFactor:0.0,windFactor:0.045},
    {time:"20:00",demand:27800,solarFactor:0.0,windFactor:0.045},{time:"20:30",demand:27200,solarFactor:0.0,windFactor:0.045},
    {time:"21:00",demand:26600,solarFactor:0.0,windFactor:0.046},{time:"21:30",demand:26100,solarFactor:0.0,windFactor:0.046},
    {time:"22:00",demand:25600,solarFactor:0.0,windFactor:0.046},{time:"22:30",demand:25200,solarFactor:0.0,windFactor:0.046},
    {time:"23:00",demand:24700,solarFactor:0.0,windFactor:0.045},{time:"23:30",demand:24200,solarFactor:0.0,windFactor:0.045},
  ],
};

// ============================================================
// 計算ロジック
// ============================================================
function calcMetrics(mix, demand, solarFactor, windFactor) {
  const total = Object.values(mix).reduce((a, b) => a + b, 0) || 1;
  const norm  = {};
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
  const supply = demand * stableRatio
    + demand * (norm.solar / 100) * solarFactor
    + demand * (norm.wind  / 100) * windFactor;
  const reserve = ((supply - demand) / demand) * 100;

  let stabilityLabel, stabilityColor;
  if      (reserve >= 8)  { stabilityLabel = "✅ 安定";          stabilityColor = "#0ca30c"; }
  else if (reserve >= 3)  { stabilityLabel = "⚠️ やや不安";      stabilityColor = "#fab219"; }
  else if (reserve >= 0)  { stabilityLabel = "🔶 要注意";        stabilityColor = "#ec835a"; }
  else                    { stabilityLabel = "🔴 停電リスク";     stabilityColor = "#E24B4A"; }

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
  const [mode,       setMode]       = useState("normal");
  const [scenarioKey,setScenario]   = useState("spring");
  const [mix,        setMix]        = useState({ ...PRESETS.current });
  const [view,       setView]       = useState("sim");     // "sim" | "curve"
  const [playing,    setPlaying]    = useState(false);
  const [frameIdx,   setFrameIdx]   = useState(0);
  const timerRef = useRef(null);

  // モード変更時はシナリオをリセット
  function handleMode(m) {
    setMode(m);
    setScenario(m === "normal" ? "spring" : "aug30");
    setPlaying(false);
    setFrameIdx(0);
  }

  // シナリオデータ
  const scenarioData = SCENARIO_DATA[scenarioKey] || SCENARIO_DATA.aug30;
  const peakDemand   = Math.max(...scenarioData.map(d => d.demand));

  // スナップショット（ピーク時コマ）
  const peakSlot = scenarioData.reduce((best, d, i) =>
    d.demand > scenarioData[best].demand ? i : best, 0);
  const peakRow  = scenarioData[peakSlot];
  const snapMetrics = calcMetrics(mix, peakRow.demand, peakRow.solarFactor, peakRow.windFactor);

  // 需給カーブ全コマ計算
  const allFrames = scenarioData.map(row => {
    const m = calcMetrics(mix, row.demand, row.solarFactor, row.windFactor);
    return { time: row.time, demand: row.demand, supply: m.supply, reserve: m.reserve };
  });

  // アニメーション
  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setFrameIdx(i => {
          if (i >= scenarioData.length - 1) { setPlaying(false); return i; }
          return i + 1;
        });
      }, 120);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, scenarioData.length]);

  // スライダー：合計100%に連動
  function handleSlider(key, newPctStr) {
    const newPct = Math.min(100, Math.max(0, parseFloat(newPctStr)));
    const delta  = newPct - (mix[key] || 0);
    if (Math.abs(delta) < 0.01) return;

    const others   = SOURCES.map(s => s.key).filter(k => k !== key);
    const otherSum = others.reduce((s, k) => s + (mix[k] || 0), 0);
    const newMix   = { ...mix, [key]: newPct };

    if (otherSum < 0.01) {
      // 他が全部0のとき：上げようとしても無視、下げるなら均等配分
      if (delta > 0) { newMix[key] = mix[key] || 0; return; }
      others.forEach(k => { newMix[k] = Math.abs(delta) / others.length; });
    } else {
      // 差分(delta)を他の電源から按分して増減
      others.forEach(k => {
        newMix[k] = Math.max(0, (mix[k] || 0) - delta * ((mix[k] || 0) / otherSum));
      });
    }

    // 浮動小数点誤差の補正（合計を100に揃える）
    const newSum = Object.values(newMix).reduce((a, b) => a + b, 0);
    if (Math.abs(newSum - 100) > 0.01) {
      const scale = 100 / newSum;
      Object.keys(newMix).forEach(k => { newMix[k] *= scale; });
      newMix[key] = newPct; // 動かしたスライダーの値は正確に保持
    }

    setMix(newMix);
  }

  function applyPreset(name) {
    const p = PRESETS[name];
    const sum = Object.values(p).reduce((a,b)=>a+b,0);
    const normalized = {};
    SOURCES.forEach(s => { normalized[s.key] = (p[s.key] / sum) * 100; });
    setMix(normalized);
    setPlaying(false);
    setFrameIdx(0);
  }

  const currentFrame  = allFrames[frameIdx];
  const chartData     = allFrames.slice(0, frameIdx + 1);
  const dangerTimes   = allFrames.filter(f => f.reserve < 0).map(f => f.time);

  const S = { // style helpers
    tag: (active) => ({
      padding: "6px 14px", fontSize: 13, borderRadius: 6, cursor: "pointer", border: "none",
      background: active ? "#1a1a1a" : "#f0f0ee",
      color: active ? "#fff" : "#555",
      fontWeight: active ? 500 : 400,
    }),
    smallTag: (active) => ({
      padding: "4px 11px", fontSize: 12, borderRadius: 5, cursor: "pointer",
      border: active ? "none" : "0.5px solid #ccc",
      background: active ? "#2a78d6" : "transparent",
      color: active ? "#fff" : "#555",
    }),
  };

  return (
    <div style={{ padding:"1.5rem", fontFamily:"sans-serif", maxWidth:860, color:"#1a1a1a" }}>

      {/* タイトル */}
      <h1 style={{ fontSize:20, fontWeight:500, marginBottom:4 }}>電源構成シミュレーター</h1>
      <p style={{ fontSize:13, color:"#888", marginBottom:20 }}>
        脱炭素と安定供給のトレードオフを実データで検証する
      </p>

      {/* ① モード選択 */}
      <div style={{ marginBottom:14 }}>
        <span style={{ fontSize:12, color:"#888", marginRight:10 }}>モード</span>
        {Object.entries(MODES).map(([k, v]) => (
          <button key={k} onClick={() => handleMode(k)}
            style={{ ...S.tag(mode===k), marginRight:8 }}>{v.label}</button>
        ))}
      </div>

      {/* ② シナリオ選択 */}
      <div style={{ marginBottom:14 }}>
        <span style={{ fontSize:12, color:"#888", marginRight:10 }}>シナリオ</span>
        {SCENARIO_OPTIONS[mode].map(sc => (
          <button key={sc.key} onClick={() => { setScenario(sc.key); setPlaying(false); setFrameIdx(0); }}
            style={{ ...S.smallTag(scenarioKey===sc.key), marginRight:6, marginBottom:4 }}>
            {sc.label}
          </button>
        ))}
        <span style={{ fontSize:11, color:"#aaa", marginLeft:6 }}>
          {SCENARIO_OPTIONS[mode].find(s=>s.key===scenarioKey)?.note}
        </span>
      </div>

      {/* ③ プリセット */}
      <div style={{ marginBottom:14 }}>
        <span style={{ fontSize:12, color:"#888", marginRight:10 }}>電源構成</span>
        {[
          {key:"current",    label:"現状（2025）"},
          {key:"target2030", label:"2030年目標"},
          {key:"renew100",   label:"再エネ100%"},
          {key:"nuclear",    label:"原子力増強"},
        ].map(p => (
          <button key={p.key} onClick={() => applyPreset(p.key)}
            style={{ ...S.smallTag(false), marginRight:6 }}>{p.label}</button>
        ))}
      </div>

      {/* ④ ビュー選択 */}
      <div style={{ marginBottom:20 }}>
        <span style={{ fontSize:12, color:"#888", marginRight:10 }}>表示</span>
        {[{key:"sim",label:"⚡ シミュレーター"},{key:"curve",label:"📈 需給カーブ"}].map(v => (
          <button key={v.key} onClick={() => setView(v.key)}
            style={{ ...S.tag(view===v.key), marginRight:8 }}>{v.label}</button>
        ))}
      </div>

      {/* メインエリア：スライダー + コンテンツ */}
      <div style={{ display:"flex", gap:28 }}>

        {/* スライダー（合計100%固定） */}
        <div style={{ width:260, flexShrink:0 }}>
          <div style={{ fontSize:12, color:"#888", marginBottom:8 }}>電源割合（合計 100%固定）</div>
          {SOURCES.map(s => {
            const pct = Math.round((mix[s.key] || 0) / Object.values(mix).reduce((a,b)=>a+b,0) * 100 * 10) / 10;
            return (
              <div key={s.key} style={{ padding:"8px 0", borderBottom:"0.5px solid #eee" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:500, display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ width:9, height:9, borderRadius:"50%", background:s.color, flexShrink:0, display:"inline-block" }}/>
                    {s.label}
                  </span>
                  <span style={{ fontSize:12, color:"#555", minWidth:38, textAlign:"right" }}>{pct.toFixed(1)}%</span>
                </div>
                <input type="range" min="0" max="100" step="1"
                  value={Math.round(mix[s.key] || 0)}
                  onChange={e => handleSlider(s.key, e.target.value)}
                  style={{ width:"100%", accentColor:s.color }} />
              </div>
            );
          })}
          <div style={{ fontSize:11, color:"#aaa", paddingTop:8, textAlign:"right" }}>合計 100%（自動調整）</div>
        </div>

        {/* コンテンツエリア */}
        <div style={{ flex:1, minWidth:0 }}>

          {/* ===== シミュレータービュー ===== */}
          {view === "sim" && (
            <>
              {/* 指標カード */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
                <MetricCard label="CO2排出量" value={snapMetrics.co2} unit="t-CO2/h"
                  barColor="#E24B4A" barPct={Math.min((snapMetrics.co2/35)*100,100)} />
                <MetricCard label="発電コスト" value={snapMetrics.cost} unit="億円/h"
                  barColor="#eda100" barPct={Math.min((snapMetrics.cost/18)*100,100)} />
                <div style={{ background:"#f5f5f3", borderRadius:8, padding:"14px 16px" }}>
                  <div style={{ fontSize:11, color:"#888", marginBottom:6 }}>ピーク時の安定性</div>
                  <div style={{ fontSize:14, fontWeight:500, color:snapMetrics.stabilityColor }}>
                    {snapMetrics.stabilityLabel}
                  </div>
                  <div style={{ fontSize:11, color:"#888", marginTop:4 }}>予備率 {snapMetrics.reserve}%</div>
                </div>
              </div>

              {/* 横棒グラフ（全ラベル表示） */}
              <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>電源構成の内訳</div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart
                  data={SOURCES.map(s => ({
                    name: s.label,
                    value: Math.round(snapMetrics.norm[s.key] * 10) / 10,
                    color: s.color,
                  }))}
                  layout="vertical"
                  margin={{ left:80, right:40, top:4, bottom:4 }}
                >
                  <XAxis type="number" domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{ fontSize:11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:11 }} width={80} />
                  <Tooltip formatter={v=>[`${v}%`, "割合"]} />
                  <Bar dataKey="value" radius={[0,4,4,0]} label={{ position:"right", fontSize:11, formatter:v=>`${v}%` }}>
                    {SOURCES.map((s,i) => <Cell key={i} fill={s.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <p style={{ fontSize:11, color:"#aaa", marginTop:8 }}>
                ※ピーク需要時（{peakRow.time}・{peakDemand.toLocaleString()} MW）の試算
              </p>
            </>
          )}

          {/* ===== 需給カーブビュー ===== */}
          {view === "curve" && (
            <>
              {/* 再生コントロール */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <button onClick={() => { if(frameIdx>=scenarioData.length-1)setFrameIdx(0); setPlaying(true); }}
                  disabled={playing}
                  style={{ padding:"6px 14px", fontSize:13, borderRadius:6, border:"none",
                    background:playing?"#ccc":"#1a1a1a", color:"#fff", cursor:playing?"default":"pointer" }}>
                  ▶ 再生
                </button>
                <button onClick={() => { setPlaying(false); setFrameIdx(0); }}
                  style={{ padding:"6px 12px", fontSize:13, borderRadius:6, border:"0.5px solid #ccc",
                    background:"transparent", color:"#555", cursor:"pointer" }}>
                  ↺ リセット
                </button>
                <input type="range" min={0} max={scenarioData.length-1} value={frameIdx}
                  onChange={e => { setPlaying(false); setFrameIdx(parseInt(e.target.value)); }}
                  style={{ flex:1 }} />
              </div>

              {/* グラフ */}
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ left:10, right:20, top:4, bottom:0 }}>
                  <XAxis dataKey="time" tick={{ fontSize:10 }}
                    interval={Math.max(1, Math.floor(chartData.length/6))} />
                  <YAxis
                    domain={[
                      Math.floor(Math.min(...scenarioData.map(d=>d.demand))*0.95/1000)*1000,
                      Math.ceil(Math.max(...scenarioData.map(d=>d.demand))*1.05/1000)*1000
                    ]}
                    tickFormatter={v=>`${Math.round(v/1000)}万`}
                    tick={{ fontSize:10 }}
                  />
                  <Tooltip
                    formatter={(v,n) => [`${v.toLocaleString()} MW`, n==="demand"?"需要（実績）":"供給（この構成）"]}
                    labelFormatter={l => `時刻: ${l}`}
                  />
                  <Legend formatter={n => n==="demand"?"需要（実績）":"供給（この構成）"} />
                  <ReferenceLine y={peakDemand} stroke="#E24B4A" strokeDasharray="3 3"
                    label={{ value:`ピーク ${(peakDemand/10000).toFixed(1)}万MW`, fontSize:10, fill:"#E24B4A", position:"insideTopRight" }} />
                  <Line type="monotone" dataKey="demand" stroke="#E24B4A" dot={false} strokeWidth={2} name="demand" />
                  <Line type="monotone" dataKey="supply" stroke="#1baf7a" dot={false} strokeWidth={2} name="supply" />
                </LineChart>
              </ResponsiveContainer>

              {/* 現在コマのデータ（グラフの下に表示） */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginTop:14 }}>
                <InfoCell label="時刻"   value={currentFrame.time} />
                <InfoCell label="需要"   value={`${currentFrame.demand.toLocaleString()} MW`} />
                <InfoCell label="供給"   value={`${currentFrame.supply.toLocaleString()} MW`} />
                <InfoCell label="予備率" value={`${currentFrame.reserve}%`}
                  color={currentFrame.reserve>=3?"#0ca30c":currentFrame.reserve>=0?"#ec835a":"#E24B4A"} />
              </div>

              {/* 停電リスク時間帯サマリー */}
              {dangerTimes.length > 0 && (
                <div style={{ marginTop:12, padding:"10px 14px", background:"#fff3f3",
                  borderRadius:6, fontSize:12, color:"#E24B4A", border:"0.5px solid #fcc" }}>
                  🔴 停電リスク発生時間帯（予備率0%未満）：{dangerTimes.slice(0,8).join("・")}
                  {dangerTimes.length>8 && `…他${dangerTimes.length-8}コマ`}
                </div>
              )}
              {dangerTimes.length === 0 && allFrames.length > 0 && (
                <div style={{ marginTop:12, padding:"10px 14px", background:"#f0fff4",
                  borderRadius:6, fontSize:12, color:"#0ca30c", border:"0.5px solid #9ee" }}>
                  ✅ この電源構成なら1日を通じて需給が安定しています
                </div>
              )}

              <p style={{ fontSize:11, color:"#aaa", marginTop:10 }}>
                {mode==="extreme"
                  ? "出典：OCCTO エリア需給実績（2025年8月）"
                  : "※季節代表日データ（推計値）"}
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
      <div style={{ fontSize:11, color:"#888", marginBottom:6 }}>{label}</div>
      <div>
        <span style={{ fontSize:20, fontWeight:500 }}>{value}</span>
        <span style={{ fontSize:11, color:"#888", marginLeft:4 }}>{unit}</span>
      </div>
      <div style={{ marginTop:8, height:4, borderRadius:2, background:"#ddd", overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:2, background:barColor,
          width:`${barPct}%`, transition:"width .25s" }} />
      </div>
    </div>
  );
}

function InfoCell({ label, value, color }) {
  return (
    <div style={{ background:"#f5f5f3", borderRadius:6, padding:"8px 12px" }}>
      <div style={{ fontSize:10, color:"#aaa", marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:500, color: color || "#1a1a1a" }}>{value}</div>
    </div>
  );
}