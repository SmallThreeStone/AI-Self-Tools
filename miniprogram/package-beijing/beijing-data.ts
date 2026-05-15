/** 北京游静态数据（坐标 WGS84；地图展示前转 GCJ-02） */

export type PoiKey =
  | 'bjWest'
  | 'zhushikou'
  | 'qianmenHotel'
  | 'chongwenHotel'
  | 'beijingNorth'
  | 'badaling'
  | 'dongzhimen'
  | 'mutianyu'
  | 'tiananmen'
  | 'wumen'
  | 'shenwumen'
  | 'jingshan'
  | 'tiantan';

export type PoiDef = { name: string; note: string; lat: number; lng: number };

export const POIS_WGS: Record<PoiKey, PoiDef> = {
  bjWest: { name: '北京西站', note: '高铁到达/返程', lat: 39.894846, lng: 116.321395 },
  zhushikou: { name: '珠市口地铁站', note: '7/8 换乘', lat: 39.89257, lng: 116.39689 },
  qianmenHotel: { name: '全季前门(示意)', note: '大栅栏西街一带', lat: 39.89695, lng: 116.39185 },
  chongwenHotel: { name: '如家崇文门(示意)', note: '船板胡同一带', lat: 39.9001, lng: 116.4102 },
  beijingNorth: { name: '北京北站', note: '京张高铁往八达岭', lat: 39.9456, lng: 116.3534 },
  badaling: { name: '八达岭长城', note: '景区', lat: 40.35939, lng: 116.01505 },
  dongzhimen: { name: '东直门枢纽', note: '慕田峪大巴常见', lat: 39.9417, lng: 116.4336 },
  mutianyu: { name: '慕田峪长城', note: '景区', lat: 40.4319, lng: 116.5706 },
  tiananmen: { name: '天安门广场', note: '需预约', lat: 39.90333, lng: 116.39167 },
  wumen: { name: '故宫午门', note: '入口', lat: 39.91635, lng: 116.39095 },
  shenwumen: { name: '故宫神武门', note: '出口', lat: 39.91885, lng: 116.39705 },
  jingshan: { name: '景山公园', note: '俯瞰紫禁城', lat: 39.92889, lng: 116.39722 },
  tiantan: { name: '天坛(祈年殿)', note: '联票含祈年殿', lat: 39.88229, lng: 116.40659 },
};

export type SegmentDef = {
  id: string;
  label: string;
  color: string;
  dotted: boolean;
  keys: PoiKey[];
  defaultOn: boolean;
};

export const SEGMENTS: SegmentDef[] = [
  {
    id: 'd0',
    label: '17日 抵京',
    color: '#00bcd4',
    dotted: true,
    keys: ['bjWest', 'zhushikou', 'qianmenHotel'],
    defaultOn: true,
  },
  {
    id: 'd1b',
    label: '18日 八达岭',
    color: '#ff1744',
    dotted: false,
    keys: ['qianmenHotel', 'beijingNorth', 'badaling'],
    defaultOn: true,
  },
  {
    id: 'd1m',
    label: '18日 慕田峪(备选)',
    color: '#7c4dff',
    dotted: true,
    keys: ['chongwenHotel', 'dongzhimen', 'mutianyu'],
    defaultOn: false,
  },
  {
    id: 'd2',
    label: '19日 皇城',
    color: '#00c853',
    dotted: true,
    keys: ['qianmenHotel', 'tiananmen', 'wumen', 'shenwumen', 'jingshan'],
    defaultOn: true,
  },
  {
    id: 'd3',
    label: '20日 天坛+离京',
    color: '#ff9100',
    dotted: true,
    keys: ['qianmenHotel', 'tiantan', 'bjWest'],
    defaultOn: true,
  },
];

export type TrainRow = { no: string; dep: string; arr: string; dur: string; price: string };

export const TRAINS_OUTBOUND: TrainRow[] = [
  { no: 'G1592', dep: '邯郸东 18:34', arr: '北京西 20:35', dur: '约2h01', price: '二等约¥209～¥251' },
  { no: 'G662', dep: '邯郸东 18:30', arr: '北京西 20:30', dur: '约2h', price: '二等约¥209～¥251' },
  { no: 'G557', dep: '邯郸东 19:18', arr: '北京西 21:25', dur: '约2h07', price: '二等约¥209～¥251' },
  { no: 'G372', dep: '邯郸东 19:36', arr: '北京西 21:35', dur: '约1h59', price: '二等约¥209～¥251' },
  { no: 'G1561', dep: '邯郸东 20:08', arr: '北京西 22:06', dur: '约1h58', price: '二等约¥209～¥251' },
];

export const TRAINS_RETURN: TrainRow[] = [
  { no: 'G429', dep: '北京西 12:40', arr: '邯郸东 15:05', dur: '约2h25', price: '二等约¥209' },
  { no: 'G685', dep: '北京西 13:15', arr: '邯郸东 15:31', dur: '约2h16', price: '二等约¥209' },
  { no: 'G673', dep: '北京西 13:46', arr: '邯郸东 16:06', dur: '约2h20', price: '二等约¥209' },
  { no: 'G6713', dep: '北京西 14:38', arr: '邯郸东 16:48', dur: '约2h10', price: '二等约¥209' },
  { no: 'G659', dep: '北京西 15:20', arr: '邯郸东 17:28', dur: '约2h08', price: '二等约¥209' },
  { no: 'G1589', dep: '北京西 15:32', arr: '邯郸东 17:33', dur: '约2h01', price: '二等约¥209' },
];

export type HotelRow = {
  title: string;
  addr: string;
  metro: string;
  price: string;
  amapQuery: string;
  /** 用于「一键导航」的近似坐标点 */
  navPoi?: PoiKey;
};

export const HOTELS: HotelRow[] = [
  {
    title: '全季酒店（北京前门地铁站店）',
    addr: '西城区大栅栏西街 15 号',
    metro: '前门/珠市口步行约 600～800m；北京西 7 号线至珠市口',
    price: '双床约¥380～¥520/间夜；4间×3晚约¥4500～¥6300',
    amapQuery: '全季酒店北京前门地铁站店',
    navPoi: 'qianmenHotel',
  },
  {
    title: '如家·neo（北京崇文门店）',
    addr: '东城区船板胡同 24 号',
    metro: '崇文门站 2/5 号线步行约 8～12 分钟',
    price: '双床约¥320～¥450/间夜；4间×3晚约¥3850～¥5400',
    amapQuery: '如家neo北京崇文门店',
    navPoi: 'chongwenHotel',
  },
  {
    title: '汉庭（北京西站南广场店）',
    addr: '西城区莲花河胡同 2 号院 1 号楼',
    metro: '近北京西站；湾子站 7 号线',
    price: '双床约¥350～¥480/间夜；4间×3晚约¥4200～¥5800',
    amapQuery: '汉庭酒店北京西站南广场店',
    navPoi: 'bjWest',
  },
];

/** 游玩阶段 0～3：与日程四段一一对应，用于「今日向导」 */
export type TripPhase = 0 | 1 | 2 | 3;

export const ITINERARY = [
  {
    day: '17日',
    title: '抵达（晚）',
    lines: ['邯郸东→北京西晚间车次见「车票」', '地铁 7 号线→酒店入住', '早点休息'],
    /** 给长辈看的口语化一句 */
    familyTip: '今晚不赶景点，出站跟好孩子，先到酒店放下行李再吃一口热乎的。',
    detail: [
      '北京西站出站后看指示牌找地铁，7 号线往「环球度假区」方向，珠市口或附近站下车步行到酒店。',
      '若订的是「崇文门」方案酒店，改乘 2/5 号线，仍以导航为准。',
    ],
  },
  {
    day: '18日',
    title: '长城全天',
    lines: ['八达岭：北京北站京张高铁/德胜门公交以当季为准', '慕田峪：东直门/前门集散大巴', '自带干粮与水'],
    familyTip: '长城风大台阶陡，老人小孩量力而行；宁可早回别赶末班车。',
    detail: [
      '八达岭：常见为地铁到「北京北站」转京张高铁；具体车次以 12306 / 现场为准。',
      '慕田峪：可买含摆渡+门票的套票，少换乘；与八达岭二选一即可，别两天都爬。',
    ],
  },
  {
    day: '19日',
    title: '天安门+故宫',
    lines: ['广场需预约；故宫提前7天20:00抢票', '午门进→神武门出；可选景山', '故宫周一闭馆，请避开'],
    familyTip: '故宫里走路多、厕所少，进门前先上厕所；带点干粮与水。',
    detail: [
      '广场与故宫是两套预约，截图保存在相册，检票时亮码更快。',
      '神武门出若去景山，门票便宜、台阶短，适合拍一张全家福。',
    ],
  },
  {
    day: '20日',
    title: '返程（下午）',
    lines: ['上午天坛或前门步行街二选一', '下午高铁；提前≥1.5h到站'],
    familyTip: '上午别排太满，留足去车站与安检时间；身份证随手拿。',
    detail: [
      '天坛若买联票可看祈年殿；若时间紧，前门买伴手礼也可。',
      '建议提前 1.5 小时到北京西站候车，节假日再宽裕些。',
    ],
  },
];

/** 首页「今日向导」：与阶段绑定的重点与地图快捷点 */
export const GUIDE_PHASES: Array<{
  phase: TripPhase;
  chip: string;
  headline: string;
  sub: string;
  bullets: string[];
  quickPois: PoiKey[];
  /** 点「按今日显示路线」时建议打开的线段 id（与 SEGMENTS.id 一致） */
  suggestSegmentIds: string[];
}> = [
  {
    phase: 0,
    chip: '抵京日',
    headline: '今晚：出站 → 地铁 → 酒店',
    sub: '地图里青色线是「西客站—珠市口—酒店」示意。',
    bullets: ['别在站口久留，先下地铁', '到酒店群发一条「已入住」', '早睡，明天长城要早起'],
    quickPois: ['bjWest', 'zhushikou', 'qianmenHotel'],
    suggestSegmentIds: ['d0'],
  },
  {
    phase: 1,
    chip: '长城日',
    headline: '今天：一整天交给长城',
    sub: '红色线为八达岭方案；若走慕田峪，打开紫色线并关掉红色即可对比。',
    bullets: ['穿防滑鞋、带外套', '老人小孩结伴，别走散', '记好返程末班时间'],
    quickPois: ['qianmenHotel', 'beijingNorth', 'badaling', 'dongzhimen', 'mutianyu'],
    suggestSegmentIds: ['d1b', 'd1m'],
  },
  {
    phase: 2,
    chip: '皇城日',
    headline: '今天：广场 → 故宫 →（可选）景山',
    sub: '绿色线串起天安门、午门、神武门、景山。',
    bullets: ['按预约时段到广场', '故宫只逛中轴线也值', '累了就撤，别硬撑'],
    quickPois: ['tiananmen', 'wumen', 'shenwumen', 'jingshan'],
    suggestSegmentIds: ['d2'],
  },
  {
    phase: 3,
    chip: '返程日',
    headline: '上午轻松逛 → 下午高铁回家',
    sub: '橙色线：酒店—天坛—北京西；天坛与前门二选一即可。',
    bullets: ['上午别安排太远', '提前查好从酒店到西站地铁', '候车时清点人数与证件'],
    quickPois: ['qianmenHotel', 'tiantan', 'bjWest'],
    suggestSegmentIds: ['d3'],
  },
];

/** 各阶段可勾选备忘（勾选状态存本机） */
export const PHASE_CHECKS: Record<number, { id: string; text: string }[]> = {
  0: [
    { id: 'p0a', text: '全员身份证已带' },
    { id: 'p0b', text: '酒店订单截图已存相册' },
    { id: 'p0c', text: '到站已向家人报平安' },
  ],
  1: [
    { id: 'p1a', text: '长城门票/车票已买' },
    { id: 'p1b', text: '水和干粮已装包' },
    { id: 'p1c', text: '返程末班时间已截图' },
  ],
  2: [
    { id: 'p2a', text: '广场预约已截图' },
    { id: 'p2b', text: '故宫门票已出票' },
    { id: 'p2c', text: '充电宝已充满' },
  ],
  3: [
    { id: 'p3a', text: '行李已收齐' },
    { id: 'p3b', text: '房卡已退' },
    { id: 'p3c', text: '高铁车次再次确认' },
  ],
};

export const BUDGET_DEFAULT = {
  n: 7,
  train: 388,
  hotel: 3600,
  food: 2400,
  ticket: 1200,
  local: 520,
};

function outOfChina(lat: number, lng: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x: number, y: number): number {
  let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
  ret += ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3;
  ret += ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) * 2) / 3;
  return ret;
}

function transformLng(x: number, y: number): number {
  let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
  ret += ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3;
  ret += ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) * 2) / 3;
  return ret;
}

/** WGS84 → GCJ-02（国内地图） */
export function wgs84ToGcj02(wgLat: number, wgLng: number): { lat: number; lng: number } {
  const lat = +wgLat;
  const lng = +wgLng;
  if (outOfChina(lat, lng)) return { lat, lng };
  const a = 6378245;
  const ee = 0.00669342162296594323;
  let dLat = transformLat(lng - 105, lat - 35);
  let dLng = transformLng(lng - 105, lat - 35);
  const radLat = (lat / 180) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLng = (dLng * 180) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return { lat: lat + dLat, lng: lng + dLng };
}

export function poiGcj(key: PoiKey): { lat: number; lng: number } {
  const p = POIS_WGS[key];
  return wgs84ToGcj02(p.lat, p.lng);
}

export type PoiRow = {
  num: number;
  key: PoiKey;
  name: string;
  note: string;
  labels: string[];
  color: string;
  lat: number;
  lng: number;
};

/** 与网页版一致：按日程首次出现顺序去重编号 */
export function buildPoiOrder(): PoiRow[] {
  const labelsByKey = new Map<PoiKey, string[]>();
  for (const seg of SEGMENTS) {
    for (const key of seg.keys) {
      if (!labelsByKey.has(key)) labelsByKey.set(key, []);
      labelsByKey.get(key)!.push(seg.label);
    }
  }
  const order: PoiKey[] = [];
  const firstSegColor = new Map<PoiKey, string>();
  for (const seg of SEGMENTS) {
    for (const key of seg.keys) {
      if (!order.includes(key)) {
        order.push(key);
        firstSegColor.set(key, seg.color);
      }
    }
  }
  return order.map((key, i) => {
    const p = POIS_WGS[key];
    const g = poiGcj(key);
    return {
      num: i + 1,
      key,
      name: p.name,
      note: p.note,
      labels: labelsByKey.get(key) ?? [],
      color: firstSegColor.get(key) ?? '#1677ff',
      lat: g.lat,
      lng: g.lng,
    };
  });
}
