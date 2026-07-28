import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis,
  ResponsiveContainer, Legend, ReferenceLine,
  BarChart, Bar, Cell,
} from "recharts";
import "./App.css";

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
  normal:  { label:"通常モード",      desc:"春・梅雨・秋の代表日で需給を確認" },
  summer:  { label:"夏・電力逼迫日",  desc:"記録的猛暑日の実データで検証" },
  winter:  { label:"冬・電力逼迫日",  desc:"厳冬期の電力逼迫日の実データで検証" },
  predict: { label:"未来予測",         desc:"気温を入力して需要と安定性を予測" },
};

const SCENARIO_OPTIONS = {
  normal: [
    { key:"spring", label:"春（4/1）",   note:"実データ・ピーク43,538MW・太陽光は低め" },
    { key:"rainy",  label:"梅雨（6/17）", note:"実データ・ピーク48,086MW・太陽光良好" },
    { key:"autumn", label:"秋（10/6）",   note:"実データ・ピーク39,150MW・年間最低水準" },
  ],
  summer: [
    { key:"aug30", label:"最高気温日（8/30, 38.4℃）", note:"実データ・東京記録的猛暑・需要47,315MW" },
    { key:"aug6",  label:"需要最大日（8/6）",           note:"実データ・夏の需要ピーク・57,669MW" },
  ],
  winter: [
    { key:"winter", label:"最大逼迫日（2/9）", note:"実データ・ピーク50,703MW・朝夕2回ピーク" },
  ],
};

// ============================================================
// シナリオデータ（実データ + 季節代表日）
// ============================================================
const SCENARIO_DATA = {
  spring: [
    {time:"0:00",demand:28819,solarFactor:0,windFactor:0.0035},
    {time:"0:30",demand:27644,solarFactor:0,windFactor:0.0038},
    {time:"1:00",demand:27068,solarFactor:0,windFactor:0.0038},
    {time:"1:30",demand:26855,solarFactor:0,windFactor:0.004},
    {time:"2:00",demand:26781,solarFactor:0,windFactor:0.004},
    {time:"2:30",demand:26725,solarFactor:0,windFactor:0.0041},
    {time:"3:00",demand:26914,solarFactor:0,windFactor:0.0043},
    {time:"3:30",demand:26974,solarFactor:0,windFactor:0.0043},
    {time:"4:00",demand:27199,solarFactor:0,windFactor:0.0045},
    {time:"4:30",demand:27675,solarFactor:0,windFactor:0.0047},
    {time:"5:00",demand:28584,solarFactor:0,windFactor:0.0047},
    {time:"5:30",demand:29740,solarFactor:0.0014,windFactor:0.0047},
    {time:"6:00",demand:31549,solarFactor:0.0041,windFactor:0.0049},
    {time:"6:30",demand:33281,solarFactor:0.0085,windFactor:0.0046},
    {time:"7:00",demand:34999,solarFactor:0.015,windFactor:0.0042},
    {time:"7:30",demand:36871,solarFactor:0.0213,windFactor:0.0039},
    {time:"8:00",demand:39194,solarFactor:0.0263,windFactor:0.0037},
    {time:"8:30",demand:41202,solarFactor:0.0326,windFactor:0.0034},
    {time:"9:00",demand:42894,solarFactor:0.0365,windFactor:0.0032},
    {time:"9:30",demand:43300,solarFactor:0.0398,windFactor:0.0034},
    {time:"10:00",demand:43225,solarFactor:0.0469,windFactor:0.0035},
    {time:"10:30",demand:43439,solarFactor:0.0537,windFactor:0.0035},
    {time:"11:00",demand:43538,solarFactor:0.0534,windFactor:0.0036},
    {time:"11:30",demand:43217,solarFactor:0.0515,windFactor:0.0036},
    {time:"12:00",demand:42253,solarFactor:0.0536,windFactor:0.0038},
    {time:"12:30",demand:41816,solarFactor:0.0532,windFactor:0.0039},
    {time:"13:00",demand:42767,solarFactor:0.0491,windFactor:0.0038},
    {time:"13:30",demand:42856,solarFactor:0.0444,windFactor:0.004},
    {time:"14:00",demand:42787,solarFactor:0.0394,windFactor:0.0043},
    {time:"14:30",demand:42457,solarFactor:0.0336,windFactor:0.0042},
    {time:"15:00",demand:42149,solarFactor:0.0277,windFactor:0.0042},
    {time:"15:30",demand:42345,solarFactor:0.0207,windFactor:0.0046},
    {time:"16:00",demand:42592,solarFactor:0.0139,windFactor:0.0046},
    {time:"16:30",demand:42545,solarFactor:0.0075,windFactor:0.0046},
    {time:"17:00",demand:42286,solarFactor:0.0026,windFactor:0.0048},
    {time:"17:30",demand:42419,solarFactor:0.0004,windFactor:0.0047},
    {time:"18:00",demand:42385,solarFactor:0,windFactor:0.0048},
    {time:"18:30",demand:42134,solarFactor:0,windFactor:0.005},
    {time:"19:00",demand:41525,solarFactor:0,windFactor:0.005},
    {time:"19:30",demand:40876,solarFactor:0,windFactor:0.0052},
    {time:"20:00",demand:40135,solarFactor:0,windFactor:0.0055},
    {time:"20:30",demand:39375,solarFactor:0,windFactor:0.0057},
    {time:"21:00",demand:38227,solarFactor:0,windFactor:0.006},
    {time:"21:30",demand:36940,solarFactor:0,windFactor:0.0064},
    {time:"22:00",demand:35686,solarFactor:0,windFactor:0.0064},
    {time:"22:30",demand:34264,solarFactor:0,windFactor:0.0064},
    {time:"23:00",demand:32816,solarFactor:0,windFactor:0.0066},
    {time:"23:30",demand:31223,solarFactor:0,windFactor:0.0067}
  ],
  rainy: [
    {time:"0:00",demand:28122,solarFactor:0,windFactor:0.0034},
    {time:"0:30",demand:26827,solarFactor:0,windFactor:0.004},
    {time:"1:00",demand:26079,solarFactor:0,windFactor:0.0048},
    {time:"1:30",demand:25458,solarFactor:0,windFactor:0.0053},
    {time:"2:00",demand:25120,solarFactor:0,windFactor:0.0057},
    {time:"2:30",demand:25028,solarFactor:0,windFactor:0.0061},
    {time:"3:00",demand:25056,solarFactor:0,windFactor:0.0056},
    {time:"3:30",demand:25046,solarFactor:0,windFactor:0.0055},
    {time:"4:00",demand:24998,solarFactor:0,windFactor:0.0058},
    {time:"4:30",demand:24855,solarFactor:0.0004,windFactor:0.0054},
    {time:"5:00",demand:25176,solarFactor:0.0203,windFactor:0.0056},
    {time:"5:30",demand:25494,solarFactor:0.0508,windFactor:0.0047},
    {time:"6:00",demand:26425,solarFactor:0.094,windFactor:0.0043},
    {time:"6:30",demand:27978,solarFactor:0.1461,windFactor:0.004},
    {time:"7:00",demand:30405,solarFactor:0.1948,windFactor:0.0036},
    {time:"7:30",demand:32942,solarFactor:0.2337,windFactor:0.0033},
    {time:"8:00",demand:36238,solarFactor:0.258,windFactor:0.0027},
    {time:"8:30",demand:39407,solarFactor:0.274,windFactor:0.0025},
    {time:"9:00",demand:41894,solarFactor:0.2874,windFactor:0.0024},
    {time:"9:30",demand:43577,solarFactor:0.3013,windFactor:0.0024},
    {time:"10:00",demand:44525,solarFactor:0.3125,windFactor:0.0023},
    {time:"10:30",demand:45322,solarFactor:0.3179,windFactor:0.002},
    {time:"11:00",demand:45777,solarFactor:0.3212,windFactor:0.0019},
    {time:"11:30",demand:46279,solarFactor:0.3187,windFactor:0.0018},
    {time:"12:00",demand:45825,solarFactor:0.3178,windFactor:0.0021},
    {time:"12:30",demand:46013,solarFactor:0.3076,windFactor:0.0018},
    {time:"13:00",demand:47596,solarFactor:0.2841,windFactor:0.0017},
    {time:"13:30",demand:48068,solarFactor:0.2616,windFactor:0.0016},
    {time:"14:00",demand:48077,solarFactor:0.24,windFactor:0.0015},
    {time:"14:30",demand:48086,solarFactor:0.2145,windFactor:0.0014},
    {time:"15:00",demand:47786,solarFactor:0.1851,windFactor:0.0014},
    {time:"15:30",demand:47956,solarFactor:0.1514,windFactor:0.0013},
    {time:"16:00",demand:47871,solarFactor:0.1166,windFactor:0.0012},
    {time:"16:30",demand:47352,solarFactor:0.0816,windFactor:0.0012},
    {time:"17:00",demand:46079,solarFactor:0.0505,windFactor:0.0012},
    {time:"17:30",demand:45048,solarFactor:0.0263,windFactor:0.0013},
    {time:"18:00",demand:43995,solarFactor:0.0109,windFactor:0.0015},
    {time:"18:30",demand:43220,solarFactor:0.0004,windFactor:0.0016},
    {time:"19:00",demand:42501,solarFactor:0,windFactor:0.0017},
    {time:"19:30",demand:41505,solarFactor:0,windFactor:0.002},
    {time:"20:00",demand:40254,solarFactor:0,windFactor:0.002},
    {time:"20:30",demand:39149,solarFactor:0,windFactor:0.0018},
    {time:"21:00",demand:37784,solarFactor:0,windFactor:0.0019},
    {time:"21:30",demand:36475,solarFactor:0,windFactor:0.0019},
    {time:"22:00",demand:35517,solarFactor:0,windFactor:0.0023},
    {time:"22:30",demand:34342,solarFactor:0,windFactor:0.0023},
    {time:"23:00",demand:33078,solarFactor:0,windFactor:0.0022},
    {time:"23:30",demand:31633,solarFactor:0,windFactor:0.0024}
  ],
  autumn: [
    {time:"0:00",demand:24301,solarFactor:0,windFactor:0.0041},
    {time:"0:30",demand:23297,solarFactor:0,windFactor:0.004},
    {time:"1:00",demand:22737,solarFactor:0,windFactor:0.0053},
    {time:"1:30",demand:22288,solarFactor:0,windFactor:0.0055},
    {time:"2:00",demand:22058,solarFactor:0,windFactor:0.0055},
    {time:"2:30",demand:22071,solarFactor:0,windFactor:0.0053},
    {time:"3:00",demand:22248,solarFactor:0,windFactor:0.0045},
    {time:"3:30",demand:22352,solarFactor:0,windFactor:0.0051},
    {time:"4:00",demand:22569,solarFactor:0,windFactor:0.0053},
    {time:"4:30",demand:22866,solarFactor:0,windFactor:0.0056},
    {time:"5:00",demand:23404,solarFactor:0,windFactor:0.0052},
    {time:"5:30",demand:23874,solarFactor:0.0005,windFactor:0.0045},
    {time:"6:00",demand:24467,solarFactor:0.0117,windFactor:0.0034},
    {time:"6:30",demand:25445,solarFactor:0.0448,windFactor:0.0026},
    {time:"7:00",demand:27397,solarFactor:0.0892,windFactor:0.0026},
    {time:"7:30",demand:29068,solarFactor:0.1262,windFactor:0.0025},
    {time:"8:00",demand:31286,solarFactor:0.1614,windFactor:0.0021},
    {time:"8:30",demand:34076,solarFactor:0.1864,windFactor:0.002},
    {time:"9:00",demand:35796,solarFactor:0.1994,windFactor:0.0014},
    {time:"9:30",demand:37318,solarFactor:0.2129,windFactor:0.0013},
    {time:"10:00",demand:38012,solarFactor:0.2218,windFactor:0.0014},
    {time:"10:30",demand:39150,solarFactor:0.2338,windFactor:0.0017},
    {time:"11:00",demand:38878,solarFactor:0.2357,windFactor:0.0016},
    {time:"11:30",demand:38999,solarFactor:0.2333,windFactor:0.0021},
    {time:"12:00",demand:38839,solarFactor:0.2241,windFactor:0.0033},
    {time:"12:30",demand:37862,solarFactor:0.1923,windFactor:0.0038},
    {time:"13:00",demand:38604,solarFactor:0.1568,windFactor:0.0041},
    {time:"13:30",demand:38415,solarFactor:0.1301,windFactor:0.0042},
    {time:"14:00",demand:37566,solarFactor:0.1071,windFactor:0.0046},
    {time:"14:30",demand:37352,solarFactor:0.0995,windFactor:0.0047},
    {time:"15:00",demand:36604,solarFactor:0.0797,windFactor:0.0049},
    {time:"15:30",demand:36661,solarFactor:0.0555,windFactor:0.0053},
    {time:"16:00",demand:36075,solarFactor:0.0278,windFactor:0.0059},
    {time:"16:30",demand:35599,solarFactor:0.009,windFactor:0.006},
    {time:"17:00",demand:35277,solarFactor:0.0006,windFactor:0.0066},
    {time:"17:30",demand:35025,solarFactor:0,windFactor:0.0068},
    {time:"18:00",demand:34432,solarFactor:0,windFactor:0.0073},
    {time:"18:30",demand:33794,solarFactor:0,windFactor:0.0074},
    {time:"19:00",demand:32951,solarFactor:0,windFactor:0.0078},
    {time:"19:30",demand:32185,solarFactor:0,windFactor:0.0082},
    {time:"20:00",demand:31239,solarFactor:0,windFactor:0.0087},
    {time:"20:30",demand:30592,solarFactor:0,windFactor:0.0089},
    {time:"21:00",demand:29577,solarFactor:0,windFactor:0.01},
    {time:"21:30",demand:28817,solarFactor:0,windFactor:0.01},
    {time:"22:00",demand:28245,solarFactor:0,windFactor:0.0102},
    {time:"22:30",demand:27487,solarFactor:0,windFactor:0.0105},
    {time:"23:00",demand:26893,solarFactor:0,windFactor:0.0109},
    {time:"23:30",demand:25954,solarFactor:0,windFactor:0.0109}
  ],
  winter: [
    {time:"0:00",demand:37378,solarFactor:0,windFactor:0.0078},
    {time:"0:30",demand:35818,solarFactor:0,windFactor:0.0076},
    {time:"1:00",demand:35279,solarFactor:0,windFactor:0.0071},
    {time:"1:30",demand:34674,solarFactor:0,windFactor:0.0071},
    {time:"2:00",demand:34382,solarFactor:0,windFactor:0.0066},
    {time:"2:30",demand:34076,solarFactor:0,windFactor:0.0067},
    {time:"3:00",demand:33972,solarFactor:0,windFactor:0.0054},
    {time:"3:30",demand:33789,solarFactor:0,windFactor:0.0068},
    {time:"4:00",demand:34280,solarFactor:0,windFactor:0.006},
    {time:"4:30",demand:34750,solarFactor:0,windFactor:0.006},
    {time:"5:00",demand:36385,solarFactor:0,windFactor:0.0063},
    {time:"5:30",demand:38198,solarFactor:0,windFactor:0.0065},
    {time:"6:00",demand:41394,solarFactor:0,windFactor:0.0055},
    {time:"6:30",demand:44389,solarFactor:0.0004,windFactor:0.0056},
    {time:"7:00",demand:46686,solarFactor:0.0036,windFactor:0.0052},
    {time:"7:30",demand:48096,solarFactor:0.0113,windFactor:0.0046},
    {time:"8:00",demand:49636,solarFactor:0.022,windFactor:0.0053},
    {time:"8:30",demand:50599,solarFactor:0.0349,windFactor:0.0052},
    {time:"9:00",demand:50703,solarFactor:0.0497,windFactor:0.005},
    {time:"9:30",demand:49876,solarFactor:0.0666,windFactor:0.0056},
    {time:"10:00",demand:48433,solarFactor:0.0858,windFactor:0.0055},
    {time:"10:30",demand:47159,solarFactor:0.1092,windFactor:0.0054},
    {time:"11:00",demand:46034,solarFactor:0.1378,windFactor:0.0063},
    {time:"11:30",demand:44989,solarFactor:0.1713,windFactor:0.0061},
    {time:"12:00",demand:43200,solarFactor:0.2071,windFactor:0.007},
    {time:"12:30",demand:42107,solarFactor:0.2351,windFactor:0.0071},
    {time:"13:00",demand:42392,solarFactor:0.2425,windFactor:0.0066},
    {time:"13:30",demand:42014,solarFactor:0.239,windFactor:0.0063},
    {time:"14:00",demand:41589,solarFactor:0.2216,windFactor:0.0063},
    {time:"14:30",demand:41247,solarFactor:0.1915,windFactor:0.0061},
    {time:"15:00",demand:40934,solarFactor:0.1494,windFactor:0.0054},
    {time:"15:30",demand:41329,solarFactor:0.096,windFactor:0.0053},
    {time:"16:00",demand:42278,solarFactor:0.0453,windFactor:0.0051},
    {time:"16:30",demand:43347,solarFactor:0.0117,windFactor:0.0043},
    {time:"17:00",demand:44830,solarFactor:0.0008,windFactor:0.004},
    {time:"17:30",demand:46242,solarFactor:0,windFactor:0.0038},
    {time:"18:00",demand:46702,solarFactor:0,windFactor:0.0039},
    {time:"18:30",demand:46922,solarFactor:0,windFactor:0.0038},
    {time:"19:00",demand:46653,solarFactor:0,windFactor:0.0039},
    {time:"19:30",demand:46448,solarFactor:0,windFactor:0.004},
    {time:"20:00",demand:45973,solarFactor:0,windFactor:0.0045},
    {time:"20:30",demand:45529,solarFactor:0,windFactor:0.0048},
    {time:"21:00",demand:44435,solarFactor:0,windFactor:0.0046},
    {time:"21:30",demand:43013,solarFactor:0,windFactor:0.0049},
    {time:"22:00",demand:41842,solarFactor:0,windFactor:0.0054},
    {time:"22:30",demand:40194,solarFactor:0,windFactor:0.0052},
    {time:"23:00",demand:38833,solarFactor:0,windFactor:0.0051},
    {time:"23:30",demand:37229,solarFactor:0,windFactor:0.0053}
  ],
  aug30: [
    {time:"0:00",demand:32298,solarFactor:0,windFactor:0.0034},
    {time:"0:30",demand:30879,solarFactor:0,windFactor:0.0039},
    {time:"1:00",demand:29816,solarFactor:0,windFactor:0.0039},
    {time:"1:30",demand:28951,solarFactor:0,windFactor:0.0048},
    {time:"2:00",demand:28324,solarFactor:0,windFactor:0.0046},
    {time:"2:30",demand:27992,solarFactor:0,windFactor:0.005},
    {time:"3:00",demand:27619,solarFactor:0,windFactor:0.0048},
    {time:"3:30",demand:27384,solarFactor:0,windFactor:0.0049},
    {time:"4:00",demand:27300,solarFactor:0,windFactor:0.0053},
    {time:"4:30",demand:27240,solarFactor:0,windFactor:0.0054},
    {time:"5:00",demand:27342,solarFactor:0.0001,windFactor:0.0055},
    {time:"5:30",demand:27119,solarFactor:0.01,windFactor:0.0057},
    {time:"6:00",demand:27771,solarFactor:0.0438,windFactor:0.0053},
    {time:"6:30",demand:28836,solarFactor:0.0906,windFactor:0.0047},
    {time:"7:00",demand:30694,solarFactor:0.143,windFactor:0.0044},
    {time:"7:30",demand:32743,solarFactor:0.1919,windFactor:0.0042},
    {time:"8:00",demand:35469,solarFactor:0.2283,windFactor:0.0034},
    {time:"8:30",demand:38128,solarFactor:0.2545,windFactor:0.0032},
    {time:"9:00",demand:40530,solarFactor:0.2745,windFactor:0.0029},
    {time:"9:30",demand:42324,solarFactor:0.29,windFactor:0.0026},
    {time:"10:00",demand:43577,solarFactor:0.3015,windFactor:0.0025},
    {time:"10:30",demand:44618,solarFactor:0.3075,windFactor:0.0021},
    {time:"11:00",demand:45528,solarFactor:0.3081,windFactor:0.0021},
    {time:"11:30",demand:46245,solarFactor:0.305,windFactor:0.0018},
    {time:"12:00",demand:46551,solarFactor:0.2981,windFactor:0.0017},
    {time:"12:30",demand:46739,solarFactor:0.2871,windFactor:0.0017},
    {time:"13:00",demand:47159,solarFactor:0.2696,windFactor:0.0018},
    {time:"13:30",demand:47315,solarFactor:0.2477,windFactor:0.0016},
    {time:"14:00",demand:47261,solarFactor:0.2223,windFactor:0.0016},
    {time:"14:30",demand:47307,solarFactor:0.1938,windFactor:0.0016},
    {time:"15:00",demand:47211,solarFactor:0.162,windFactor:0.0017},
    {time:"15:30",demand:47299,solarFactor:0.1252,windFactor:0.0016},
    {time:"16:00",demand:47184,solarFactor:0.0874,windFactor:0.0016},
    {time:"16:30",demand:46744,solarFactor:0.0535,windFactor:0.0015},
    {time:"17:00",demand:45831,solarFactor:0.0259,windFactor:0.0016},
    {time:"17:30",demand:44953,solarFactor:0.0074,windFactor:0.0014},
    {time:"18:00",demand:44613,solarFactor:0.0001,windFactor:0.0018},
    {time:"18:30",demand:44355,solarFactor:0,windFactor:0.0018},
    {time:"19:00",demand:43441,solarFactor:0,windFactor:0.0019},
    {time:"19:30",demand:42442,solarFactor:0,windFactor:0.0019},
    {time:"20:00",demand:41314,solarFactor:0,windFactor:0.0019},
    {time:"20:30",demand:40371,solarFactor:0,windFactor:0.0018},
    {time:"21:00",demand:39219,solarFactor:0,windFactor:0.0021},
    {time:"21:30",demand:38116,solarFactor:0,windFactor:0.002},
    {time:"22:00",demand:37137,solarFactor:0,windFactor:0.0022},
    {time:"22:30",demand:36083,solarFactor:0,windFactor:0.0021},
    {time:"23:00",demand:35035,solarFactor:0,windFactor:0.0019},
    {time:"23:30",demand:33750,solarFactor:0,windFactor:0.002}
  ],
  aug6: [
    {time:"0:00",demand:36535,solarFactor:0,windFactor:0.0049},
    {time:"0:30",demand:34942,solarFactor:0,windFactor:0.0056},
    {time:"1:00",demand:33616,solarFactor:0,windFactor:0.0054},
    {time:"1:30",demand:32663,solarFactor:0,windFactor:0.005},
    {time:"2:00",demand:31926,solarFactor:0,windFactor:0.0045},
    {time:"2:30",demand:31475,solarFactor:0,windFactor:0.0041},
    {time:"3:00",demand:31162,solarFactor:0,windFactor:0.0034},
    {time:"3:30",demand:30839,solarFactor:0,windFactor:0.0034},
    {time:"4:00",demand:30843,solarFactor:0,windFactor:0.0033},
    {time:"4:30",demand:30887,solarFactor:0,windFactor:0.0041},
    {time:"5:00",demand:31218,solarFactor:0.0017,windFactor:0.0039},
    {time:"5:30",demand:31921,solarFactor:0.018,windFactor:0.004},
    {time:"6:00",demand:33776,solarFactor:0.0419,windFactor:0.0029},
    {time:"6:30",demand:36183,solarFactor:0.0683,windFactor:0.0027},
    {time:"7:00",demand:39149,solarFactor:0.0923,windFactor:0.0026},
    {time:"7:30",demand:42324,solarFactor:0.1182,windFactor:0.0018},
    {time:"8:00",demand:46148,solarFactor:0.1359,windFactor:0.0017},
    {time:"8:30",demand:49241,solarFactor:0.1568,windFactor:0.0014},
    {time:"9:00",demand:52345,solarFactor:0.1852,windFactor:0.0013},
    {time:"9:30",demand:54306,solarFactor:0.2049,windFactor:0.0012},
    {time:"10:00",demand:55196,solarFactor:0.2198,windFactor:0.0012},
    {time:"10:30",demand:56486,solarFactor:0.2287,windFactor:0.001},
    {time:"11:00",demand:57163,solarFactor:0.2283,windFactor:0.0009},
    {time:"11:30",demand:57571,solarFactor:0.2198,windFactor:0.0009},
    {time:"12:00",demand:56819,solarFactor:0.2092,windFactor:0.001},
    {time:"12:30",demand:56519,solarFactor:0.1949,windFactor:0.001},
    {time:"13:00",demand:57468,solarFactor:0.1784,windFactor:0.0011},
    {time:"13:30",demand:57669,solarFactor:0.1638,windFactor:0.0012},
    {time:"14:00",demand:56763,solarFactor:0.1477,windFactor:0.0012},
    {time:"14:30",demand:56347,solarFactor:0.1343,windFactor:0.0013},
    {time:"15:00",demand:55710,solarFactor:0.1176,windFactor:0.0014},
    {time:"15:30",demand:55633,solarFactor:0.0913,windFactor:0.0017},
    {time:"16:00",demand:55066,solarFactor:0.0648,windFactor:0.0018},
    {time:"16:30",demand:54108,solarFactor:0.042,windFactor:0.0016},
    {time:"17:00",demand:51766,solarFactor:0.0232,windFactor:0.0016},
    {time:"17:30",demand:50526,solarFactor:0.0105,windFactor:0.0019},
    {time:"18:00",demand:49904,solarFactor:0.0027,windFactor:0.0029},
    {time:"18:30",demand:49310,solarFactor:0,windFactor:0.0024},
    {time:"19:00",demand:48140,solarFactor:0,windFactor:0.0025},
    {time:"19:30",demand:46852,solarFactor:0,windFactor:0.0023},
    {time:"20:00",demand:45400,solarFactor:0,windFactor:0.0024},
    {time:"20:30",demand:44211,solarFactor:0,windFactor:0.0024},
    {time:"21:00",demand:42978,solarFactor:0,windFactor:0.0024},
    {time:"21:30",demand:41550,solarFactor:0,windFactor:0.0024},
    {time:"22:00",demand:40355,solarFactor:0,windFactor:0.0025},
    {time:"22:30",demand:38984,solarFactor:0,windFactor:0.0022},
    {time:"23:00",demand:37537,solarFactor:0,windFactor:0.0022},
    {time:"23:30",demand:36048,solarFactor:0,windFactor:0.0028}
  ],
};

// 未来予測用回帰係数
// 出典：analysis_v2.py で関東8地点気温×需給データから算出
// 予測需要(MW) = SLOPE × |気温 - COMFORT_TEMP| + INTERCEPT
const REGRESSION = {
  slope:        424.0,
  intercept:    28391,
  comfort_temp: 22.0,
};

// 季節ごとの代表的な太陽光・風力係数（ピーク時推定）
const SEASON_FACTORS = {
  spring: { solarFactor: 0.28, windFactor: 0.035, label: "春（3〜5月）" },
  summer: { solarFactor: 0.25, windFactor: 0.002, label: "夏（6〜9月）" },
  autumn: { solarFactor: 0.25, windFactor: 0.045, label: "秋（10〜11月）" },
  winter: { solarFactor: 0.10, windFactor: 0.008, label: "冬（12〜2月）" },
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
  const [view,       setView]       = useState("sim");
  const [playing,    setPlaying]    = useState(false);
  const [frameIdx,   setFrameIdx]   = useState(0);
  // 未来予測モード用
  const [predTemp,   setPredTemp]   = useState("30");
  const [predSeason, setPredSeason] = useState("summer");
  const timerRef = useRef(null);

  // モード変更時はシナリオをリセット
  function handleMode(m) {
    setMode(m);
    const defaults = { normal:"spring", summer:"aug30", winter:"winter" };
    setScenario(defaults[m]);
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

  const [activePreset, setActivePreset] = useState("current");

  function applyPreset(name) {
    const p = PRESETS[name];
    const sum = Object.values(p).reduce((a,b)=>a+b,0);
    const normalized = {};
    SOURCES.forEach(s => { normalized[s.key] = (p[s.key] / sum) * 100; });
    setMix(normalized);
    setActivePreset(name);
    setPlaying(false);
    setFrameIdx(0);
  }

  const currentFrame  = allFrames[frameIdx];
  // 変更点①：グラフには常に24時間分のデータを表示する（再生の進行に合わせて絞り込まない）
  const chartData      = allFrames;
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
    <div style={{ padding:"1.5rem", fontFamily:"sans-serif", maxWidth:860, margin:"0 auto", color:"#1a1a1a", width:"100%", boxSizing:"border-box" }}>

      {/* タイトル */}
      <h1 style={{ fontSize:20, fontWeight:500, marginBottom:4, textAlign:"center" }}>電源構成シミュレーター</h1>
      <p style={{ fontSize:13, color:"#888", marginBottom:20, textAlign:"center" }}>
        脱炭素と安定供給のトレードオフを実データで検証する
      </p>

      {/* 選択パネル */}
      <div style={{ background:"#f5f5f3", borderRadius:10, padding:"16px 20px", marginBottom:24, width:"100%", minWidth:0, boxSizing:"border-box", alignSelf:"stretch" }}>

        {/* ① モード */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:13, color:"#1a1a1a", fontWeight:400, marginBottom:8 }}>モード</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {Object.entries(MODES).map(([k, v]) => (
              <button key={k} onClick={() => handleMode(k)} style={{
                padding:"7px 16px", fontSize:13, borderRadius:6, cursor:"pointer", border:"none",
                background: mode===k ? "#1a1a1a" : "#e8e8e6",
                color: mode===k ? "#fff" : "#555",
                fontWeight: mode===k ? 500 : 400,
              }}>{v.label}</button>
            ))}
          </div>
          <div style={{ fontSize:11, color:"#aaa", marginTop:8 }}>
            {MODES[mode].desc}
          </div>
        </div>

        {/* ② シナリオ（未来予測以外） */}
        {mode !== "predict" && (
          <div style={{ marginBottom:14, paddingTop:14, borderTop:"0.5px solid #ddd" }}>
            <div style={{ fontSize:13, color:"#1a1a1a", fontWeight:400, marginBottom:8 }}>シナリオ</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              {SCENARIO_OPTIONS[mode].map(sc => (
                <button key={sc.key}
                  onClick={() => { setScenario(sc.key); setPlaying(false); setFrameIdx(0); }}
                  style={{
                    padding:"7px 16px", fontSize:13, borderRadius:6, cursor:"pointer", border:"none",
                    background: scenarioKey===sc.key ? "#1a1a1a" : "#e8e8e6",
                    color: scenarioKey===sc.key ? "#fff" : "#555",
                    fontWeight: scenarioKey===sc.key ? 500 : 400,
                  }}>{sc.label}</button>
              ))}
              <span style={{ fontSize:11, color:"#aaa", marginLeft:4 }}>
                {SCENARIO_OPTIONS[mode].find(s=>s.key===scenarioKey)?.note}
              </span>
            </div>
          </div>
        )}

        {/* ③ 電源構成プリセット */}
        <div style={{ paddingTop:14, borderTop:"0.5px solid #ddd" }}>
          <div style={{ fontSize:13, color:"#1a1a1a", fontWeight:400, marginBottom:8 }}>電源構成プリセット</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {[
              {key:"current",    label:"現状（2025）"},
              {key:"target2030", label:"2030年目標"},
              {key:"renew100",   label:"再エネ100%"},
              {key:"nuclear",    label:"原子力増強"},
            ].map(p => (
              <button key={p.key} onClick={() => applyPreset(p.key)} style={{
                padding:"7px 16px", fontSize:13, borderRadius:6, cursor:"pointer", border:"none",
                background: activePreset===p.key ? "#1a1a1a" : "#e8e8e6",
                color: activePreset===p.key ? "#fff" : "#555",
                fontWeight: activePreset===p.key ? 500 : 400,
              }}>{p.label}</button>
            ))}
          </div>
        </div>

      </div>

      {/* スペーサー削除済み */}

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
                  className="mix-slider"
                  value={Math.round(mix[s.key] || 0)}
                  onChange={e => handleSlider(s.key, e.target.value)}
                  style={{
                    width:"100%",
                    color: s.color,
                    background: `linear-gradient(to right, ${s.color} 0%, ${s.color} ${pct}%, #e5e5e2 ${pct}%, #e5e5e2 100%)`,
                  }} />
              </div>
            );
          })}
        </div>

        {/* コンテンツエリア */}
        <div style={{ flex:1, minWidth:0 }}>

          {/* ===== 未来予測モード ===== */}
          {mode === "predict" && (() => {
            const tempVal    = parseFloat(predTemp) || 22;
            const discomfort = Math.abs(tempVal - REGRESSION.comfort_temp);
            const predDemand = Math.round(REGRESSION.slope * discomfort + REGRESSION.intercept);
            const sf = SEASON_FACTORS[predSeason].solarFactor;
            const wf = SEASON_FACTORS[predSeason].windFactor;
            const pm = calcMetrics(mix, predDemand, sf, wf);
            return (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

                {/* 気温入力 */}
                <div style={{ background:"#f5f5f3", borderRadius:8, padding:"14px 16px" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:12, marginBottom:14 }}>
                    {/* 気温入力 */}
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:11, color:"#888", marginBottom:8 }}>予想気温を入力</div>
                      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:4 }}>
                        <input
                          type="number" min="-10" max="45" step="0.5"
                          value={predTemp}
                          onChange={e => setPredTemp(e.target.value)}
                          style={{ fontSize:32, fontWeight:500, width:90, border:"none",
                            borderBottom:"2px solid #1a1a1a", background:"transparent",
                            outline:"none", textAlign:"center" }}
                        />
                        <span style={{ fontSize:18 }}>℃</span>
                      </div>
                    </div>
                    {/* 矢印 */}
                    <div style={{ fontSize:22, color:"#aaa" }}>→</div>
                    {/* 予測需要 */}
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:11, color:"#888", marginBottom:8 }}>予測需要</div>
                      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:4 }}>
                        <span style={{ fontSize:32, fontWeight:500 }}>{predDemand.toLocaleString()}</span>
                        <span style={{ fontSize:18, color:"#888" }}>MW</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:"#888", marginBottom:6 }}>季節</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {Object.entries(SEASON_FACTORS).map(([k, v]) => (
                      <button key={k} onClick={() => setPredSeason(k)}
                        style={{
                          padding:"7px 16px", fontSize:13, borderRadius:6, cursor:"pointer", border:"none",
                          background: predSeason===k ? "#1a1a1a" : "#e8e8e6",
                          color: predSeason===k ? "#fff" : "#555",
                          fontWeight: predSeason===k ? 500 : 400,
                        }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3指標（横並び：通常モードと統一） */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                  <MetricCard label="予測CO2排出量" value={pm.co2} unit="t-CO2/h"
                    barColor="#E24B4A" barPct={Math.min((pm.co2/35)*100,100)} />
                  <MetricCard label="予測発電コスト" value={pm.cost} unit="億円/h"
                    barColor="#eda100" barPct={Math.min((pm.cost/18)*100,100)} />
                  <div style={{ background:"#f5f5f3", borderRadius:8, padding:"14px 16px" }}>
                    <div style={{ fontSize:11, color:"#888", marginBottom:6 }}>予測安定性</div>
                    <div style={{ fontSize:14, fontWeight:500, color:pm.stabilityColor }}>{pm.stabilityLabel}</div>
                    <div style={{ fontSize:11, color:"#888", marginTop:4 }}>予備率 {pm.reserve}%</div>
                  </div>
                </div>

                {/* 注記 */}
                <p style={{ fontSize:11, color:"#aaa", lineHeight:1.7, marginTop:8 }}>
                  予測式：需要 = 424 × |気温 − 22℃| + 28,391 MW<br/>
                  出典：関東8地点気温 × OCCTO需給実績（2025/4〜2026/3）<br/>
                  ※曜日・湿度・前日比などは考慮していないため誤差が生じます
                </p>
              </div>
            );
          })()}

          {/* ===== 通常・夏・冬モード：3指標 + 需給カーブ同時表示 ===== */}
          {mode !== "predict" && (
            <>
              {/* 3指標カード */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
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

              {/* 需給カーブ：再生コントロール */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <button onClick={() => { if(frameIdx>=scenarioData.length-1)setFrameIdx(0); setPlaying(true); }}
                  disabled={playing}
                  style={{ padding:"5px 14px", fontSize:12, borderRadius:6, border:"none",
                    background:playing?"#ccc":"#1a1a1a", color:"#fff", cursor:playing?"default":"pointer" }}>
                  ▶ 再生
                </button>
                <button onClick={() => { setPlaying(false); setFrameIdx(0); }}
                  style={{ padding:"5px 12px", fontSize:12, borderRadius:6, border:"0.5px solid #ccc",
                    background:"transparent", color:"#555", cursor:"pointer" }}>
                  ↺ リセット
                </button>
                <input type="range" min={0} max={scenarioData.length-1} value={frameIdx}
                  onChange={e => { setPlaying(false); setFrameIdx(parseInt(e.target.value)); }}
                  style={{ flex:1, accentColor:"#555" }} />
              </div>

              {/* 需給カーブ：グラフ（常に24時間分表示。クリックで時刻選択可能） */}
              <ResponsiveContainer width="100%" height={180}>
                <LineChart
                  data={chartData}
                  margin={{ left:10, right:20, top:4, bottom:0 }}
                  onClick={(state) => {
                    // 変更点②：グラフ上のクリック位置から時刻を選択できるようにする
                    if (state && state.activeTooltipIndex != null) {
                      setPlaying(false);
                      setFrameIdx(state.activeTooltipIndex);
                    }
                  }}
                  style={{ cursor:"pointer" }}
                >
                  <XAxis dataKey="time" tick={{ fontSize:10 }}
                    interval={Math.max(1, Math.floor(chartData.length/6))} />
                  <YAxis
                    domain={[
                      Math.floor(Math.min(...scenarioData.map(d=>d.demand))*0.95/1000)*1000,
                      Math.ceil(Math.max(...scenarioData.map(d=>d.demand))*1.05/1000)*1000,
                    ]}
                    tickFormatter={v=>`${Math.round(v/1000)}万`}
                    tick={{ fontSize:10 }}
                  />
                  <Legend formatter={n=>n==="demand"?"需要（実績）":"供給（この構成）"} />
                  <ReferenceLine y={peakDemand} stroke="#E24B4A" strokeDasharray="3 3"
                    label={{ value:`ピーク ${(peakDemand/10000).toFixed(1)}万MW`, fontSize:10, fill:"#E24B4A", position:"insideTopRight" }} />
                  {/* 変更点③：選択中／再生中の時刻を縦線で示す */}
                  <ReferenceLine x={currentFrame.time} stroke="#888" strokeDasharray="2 2" />
                  <Line type="monotone" dataKey="demand" stroke="#E24B4A" dot={false} strokeWidth={2} name="demand" />
                  <Line type="monotone" dataKey="supply" stroke="#1baf7a" dot={false} strokeWidth={2} name="supply" />
                </LineChart>
              </ResponsiveContainer>

              {/* 現在コマのデータ */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginTop:12 }}>
                <InfoCell label="時刻"   value={currentFrame.time} />
                <InfoCell label="需要"   value={`${currentFrame.demand.toLocaleString()} MW`} />
                <InfoCell label="供給"   value={`${currentFrame.supply.toLocaleString()} MW`} />
                <InfoCell label="予備率" value={`${currentFrame.reserve}%`}
                  color={currentFrame.reserve>=3?"#0ca30c":currentFrame.reserve>=0?"#ec835a":"#E24B4A"} />
              </div>

              {/* 停電リスクサマリー */}
              {dangerTimes.length > 0 && (
                <div style={{ marginTop:10, padding:"8px 14px", background:"#fff3f3",
                  borderRadius:6, fontSize:12, color:"#E24B4A", border:"0.5px solid #fcc" }}>
                  🔴 停電リスク：{dangerTimes.slice(0,8).join("・")}
                  {dangerTimes.length>8 && `…他${dangerTimes.length-8}コマ`}
                </div>
              )}
              {dangerTimes.length === 0 && allFrames.length > 0 && (
                <div style={{ marginTop:10, padding:"8px 14px", background:"#f0fff4",
                  borderRadius:6, fontSize:12, color:"#0ca30c", border:"0.5px solid #9ee" }}>
                  ✅ この電源構成なら1日を通じて需給が安定しています
                </div>
              )}

              <p style={{ fontSize:11, color:"#aaa", marginTop:8 }}>
                出典：OCCTO エリア需給実績（2025/4〜2026/3）
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