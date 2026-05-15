import {
  BUDGET_DEFAULT,
  SEGMENTS,
  TRAINS_OUTBOUND,
  TRAINS_RETURN,
  HOTELS,
  ITINERARY,
  GUIDE_PHASES,
  PHASE_CHECKS,
  buildPoiOrder,
  poiGcj,
  POIS_WGS,
  type PoiKey,
  type PoiRow,
  type TripPhase,
} from './beijing-data';

type TabId = 'map' | 'trip' | 'train' | 'hotel' | 'budget' | 'tips';

type SegToggle = { id: string; label: string; color: string; checked: boolean };

type CheckRow = { id: string; text: string; checked: boolean };

type QuickChip = { key: PoiKey; label: string };

const STORAGE_PHASE = 'beijing_wizard_phase_v1';
const STORAGE_CHECKS = 'beijing_wizard_checks_v1';

function readPhase(): TripPhase {
  try {
    const v = wx.getStorageSync(STORAGE_PHASE);
    const n = typeof v === 'number' ? v : parseInt(String(v), 10);
    if (n === 0 || n === 1 || n === 2 || n === 3) return n;
  } catch {
    /* ignore */
  }
  return 0;
}

function savePhase(p: TripPhase): void {
  try {
    wx.setStorageSync(STORAGE_PHASE, p);
  } catch {
    /* ignore */
  }
}

function readChecks(): Record<string, boolean> {
  try {
    const v = wx.getStorageSync(STORAGE_CHECKS);
    if (v && typeof v === 'object') return v as Record<string, boolean>;
  } catch {
    /* ignore */
  }
  return {};
}

function saveChecks(m: Record<string, boolean>): void {
  try {
    wx.setStorageSync(STORAGE_CHECKS, m);
  } catch {
    /* ignore */
  }
}

Page({
  data: {
    tabs: [
      { id: 'map', name: '首页' },
      { id: 'trip', name: '日程' },
      { id: 'train', name: '车票' },
      { id: 'hotel', name: '酒店' },
      { id: 'budget', name: '预算' },
      { id: 'tips', name: '备忘' },
    ],
    activeTab: 'map' as TabId,
    tripPhase: 0 as TripPhase,
    guideCard: GUIDE_PHASES[0],
    quickPoiChips: [] as QuickChip[],
    phaseChips: GUIDE_PHASES.map((g) => ({
      phase: g.phase,
      chip: g.chip,
      active: g.phase === 0,
    })),
    checklistItems: [] as CheckRow[],
    itinerary: ITINERARY,
    trainsOut: TRAINS_OUTBOUND,
    trainsRet: TRAINS_RETURN,
    hotels: HOTELS,
    poiRows: [] as PoiRow[],
    segmentToggles: [] as SegToggle[],
    mapLatitude: 39.92,
    mapLongitude: 116.38,
    mapScale: 10,
    mapShowLoc: false,
    includePoints: [] as { latitude: number; longitude: number }[],
    markers: [] as unknown[],
    polyline: [] as unknown[],
    budgetN: BUDGET_DEFAULT.n,
    budgetTrain: BUDGET_DEFAULT.train,
    budgetHotel: BUDGET_DEFAULT.hotel,
    budgetFood: BUDGET_DEFAULT.food,
    budgetTicket: BUDGET_DEFAULT.ticket,
    budgetLocal: BUDGET_DEFAULT.local,
    budgetTotal: '',
    budgetPer: '',
    hintBudget: '',
  },

  onLoad() {
    const phase = readPhase();
    const segmentToggles: SegToggle[] = SEGMENTS.map((s) => ({
      id: s.id,
      label: s.label,
      color: s.color,
      checked: s.defaultOn,
    }));
    const poiRows = buildPoiOrder();
    this.setData({ segmentToggles, poiRows, tripPhase: phase }, () => {
      this.applyPhaseToUI(phase);
      this.rebuildMapLayers();
      this.recalcBudget();
    });
  },

  applyPhaseToUI(phase: TripPhase) {
    const guideCard = GUIDE_PHASES.find((g) => g.phase === phase) ?? GUIDE_PHASES[0];
    const quickPoiChips: QuickChip[] = guideCard.quickPois.map((k) => ({
      key: k,
      label: POIS_WGS[k].name,
    }));
    const checks = readChecks();
    const raw = PHASE_CHECKS[phase] ?? [];
    const checklistItems: CheckRow[] = raw.map((c) => ({
      id: c.id,
      text: c.text,
      checked: !!checks[c.id],
    }));
    const phaseChips = GUIDE_PHASES.map((g) => ({
      phase: g.phase,
      chip: g.chip,
      active: g.phase === phase,
    }));
    this.setData({ tripPhase: phase, guideCard, checklistItems, phaseChips, quickPoiChips });
  },

  onTabTap(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as TabId;
    if (!id) return;
    this.setData({ activeTab: id });
  },

  onPhaseChipTap(e: WechatMiniprogram.TouchEvent) {
    const p = Number(e.currentTarget.dataset.phase) as TripPhase;
    if (p !== 0 && p !== 1 && p !== 2 && p !== 3) return;
    savePhase(p);
    this.applyPhaseToUI(p);
  },

  onApplySuggestedRoutes() {
    const phase = this.data.tripPhase;
    const want = new Set(
      (GUIDE_PHASES.find((g) => g.phase === phase) ?? GUIDE_PHASES[0]).suggestSegmentIds
    );
    const segmentToggles: SegToggle[] = SEGMENTS.map((s) => ({
      id: s.id,
      label: s.label,
      color: s.color,
      checked: want.has(s.id),
    }));
    this.setData({ segmentToggles }, () => this.rebuildMapLayers());
    wx.showToast({ title: '已按今日切换路线', icon: 'none' });
  },

  onCheckToggle(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    if (!id) return;
    const checks = readChecks();
    checks[id] = !checks[id];
    saveChecks(checks);
    const checklistItems = this.data.checklistItems.map((row) =>
      row.id === id ? { ...row, checked: !!checks[id] } : row
    );
    this.setData({ checklistItems });
  },

  isSegmentOn(id: string): boolean {
    return this.data.segmentToggles.find((t) => t.id === id)?.checked ?? false;
  },

  rebuildMapLayers() {
    const polys: unknown[] = [];
    const includePts: { latitude: number; longitude: number }[] = [];
    for (const seg of SEGMENTS) {
      if (!this.isSegmentOn(seg.id)) continue;
      const points = seg.keys.map((k) => {
        const g = poiGcj(k);
        includePts.push({ latitude: g.lat, longitude: g.lng });
        return { latitude: g.lat, longitude: g.lng };
      });
      polys.push({
        points,
        color: seg.color,
        width: 7,
        dottedLine: seg.dotted,
      });
    }
    const poiRows = buildPoiOrder();
    const markers: unknown[] = poiRows.map((r) => ({
      id: r.num,
      latitude: r.lat,
      longitude: r.lng,
      title: `${r.num}. ${r.name}`,
      width: 30,
      height: 30,
      callout: {
        content: `${r.num}. ${r.name} · ${r.note}`,
        color: '#1a1a1a',
        fontSize: 12,
        borderRadius: 8,
        bgColor: '#ffffff',
        padding: 8,
        display: 'BYCLICK' as const,
      },
    }));
    this.setData({
      polyline: polys,
      markers,
      includePoints: includePts.length ? includePts : poiRows.map((r) => ({ latitude: r.lat, longitude: r.lng })),
    });
  },

  onSegChange(e: WechatMiniprogram.CustomEvent<{ value: boolean }>) {
    const id = e.currentTarget.dataset.id as string;
    const checked = e.detail.value;
    const segmentToggles = this.data.segmentToggles.map((t) =>
      t.id === id ? { ...t, checked } : t
    );
    this.setData({ segmentToggles }, () => this.rebuildMapLayers());
  },

  onFitCity() {
    const keys = [
      'bjWest',
      'zhushikou',
      'qianmenHotel',
      'chongwenHotel',
      'dongzhimen',
      'tiananmen',
      'wumen',
      'shenwumen',
      'jingshan',
      'tiantan',
    ] as const;
    const includePoints = keys.map((k) => {
      const g = poiGcj(k);
      return { latitude: g.lat, longitude: g.lng };
    });
    this.setData({
      mapLatitude: 39.91,
      mapLongitude: 116.395,
      mapScale: 13,
      includePoints,
    });
  },

  onFitAll() {
    const poiRows = buildPoiOrder();
    this.setData({
      mapLatitude: 39.9,
      mapLongitude: 116.42,
      mapScale: 10,
      includePoints: poiRows.map((r) => ({ latitude: r.lat, longitude: r.lng })),
    });
  },

  onQuickPoiTap(e: WechatMiniprogram.TouchEvent) {
    const key = e.currentTarget.dataset.key as PoiKey;
    if (!key || !POIS_WGS[key]) return;
    const g = poiGcj(key);
    const p = POIS_WGS[key];
    this.setData({
      activeTab: 'map',
      mapLatitude: g.lat,
      mapLongitude: g.lng,
      mapScale: 15,
      includePoints: [{ latitude: g.lat, longitude: g.lng }],
    });
  },

  onMarkerTap(e: WechatMiniprogram.CustomEvent<{ markerId: number }>) {
    const mid = Number(e.detail.markerId);
    const row = this.data.poiRows.find((r) => r.num === mid);
    if (!row) return;
    wx.openLocation({
      latitude: row.lat,
      longitude: row.lng,
      name: row.name,
      address: row.note,
      scale: 16,
    });
  },

  onPoiRowTap(e: WechatMiniprogram.TouchEvent) {
    const num = Number(e.currentTarget.dataset.num);
    const row = this.data.poiRows.find((r) => r.num === num);
    if (!row) return;
    this.setData({
      activeTab: 'map',
      mapLatitude: row.lat,
      mapLongitude: row.lng,
      mapScale: 15,
      includePoints: [{ latitude: row.lat, longitude: row.lng }],
    });
  },

  onHotelNavigate(e: WechatMiniprogram.TouchEvent) {
    const key = e.currentTarget.dataset.poi as PoiKey;
    if (!key || !POIS_WGS[key]) return;
    const g = poiGcj(key);
    const p = POIS_WGS[key];
    wx.openLocation({
      latitude: g.lat,
      longitude: g.lng,
      name: p.name,
      address: (e.currentTarget.dataset.title as string) || p.note,
      scale: 16,
    });
  },

  onBudgetInput(e: WechatMiniprogram.Input) {
    const field = e.currentTarget.dataset.field as string;
    const raw = e.detail.value;
    const n = parseFloat(raw);
    const v = Number.isFinite(n) ? n : 0;
    this.setData({ [field]: v } as unknown as Record<string, unknown>, () => this.recalcBudget());
  },

  recalcBudget() {
    const n = Math.max(1, Math.floor(this.data.budgetN) || 1);
    const train = this.data.budgetTrain || 0;
    const hotel = this.data.budgetHotel || 0;
    const food = this.data.budgetFood || 0;
    const ticket = this.data.budgetTicket || 0;
    const local = this.data.budgetLocal || 0;
    const sum = train * n + hotel + food + ticket + local;
    const per = sum / n;
    const hintBudget =
      per <= 1550
        ? '人均接近或低于 ¥1500 区间（估算）。'
        : '人均高于 ¥1500：可调低酒店或餐饮占位。';
    this.setData({
      budgetN: n,
      budgetTotal: String(Math.round(sum)),
      budgetPer: String(Math.round(per)),
      hintBudget,
    });
  },

  onCopy(e: WechatMiniprogram.TouchEvent) {
    const text = (e.currentTarget.dataset.text as string) || '';
    if (!text) return;
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制', icon: 'none' }),
    });
  },

  onCall(e: WechatMiniprogram.TouchEvent) {
    const num = (e.currentTarget.dataset.num as string) || '';
    if (!num) return;
    wx.makePhoneCall({ phoneNumber: num });
  },

  onShareAppMessage() {
    return {
      title: '家人北京向导 · 邯郸出发',
      path: '/package-beijing/index',
    };
  },
});
