import { buildToolShareMessage } from '../../utils/tool-share';
import { applyThemeForToolPage } from '../../utils/nav-theme';
import { INITIAL_PRODUCTS } from './products-data';
import type { CargoProduct } from './types';
import {
  buildQuoteLines,
  calculateMix,
  cartonVolumeM3,
  cartonWeightKg,
  CONTAINER_LABELS,
  DEFAULT_LIMITS,
  filteredProducts,
  fmt,
  getAllCategories,
  type ContainerType,
  productLabel,
  normalizeProducts,
  safeNum,
} from './calc';

const STORAGE_KEY = 'tool_cargo_quote_v1';

type LimitBucket = { maxVolume: number; maxWeight: number };

type MixLine = { id: string; productId: string; cartons: string; mixProductIndex: number };

type Persisted = {
  products: CargoProduct[];
  c20: LimitBucket;
  c40: LimitBucket;
  containerType: ContainerType;
};

function loadPersisted(): Persisted | null {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY) as unknown;
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    if (!Array.isArray(o.products)) return null;
    return {
      products: normalizeProducts(o.products as CargoProduct[]),
      c20: {
        maxVolume: safeNum((o.c20 as LimitBucket)?.maxVolume, DEFAULT_LIMITS['20FT'].maxVolume),
        maxWeight: safeNum((o.c20 as LimitBucket)?.maxWeight, DEFAULT_LIMITS['20FT'].maxWeight),
      },
      c40: {
        maxVolume: safeNum((o.c40 as LimitBucket)?.maxVolume, DEFAULT_LIMITS['40FT'].maxVolume),
        maxWeight: safeNum((o.c40 as LimitBucket)?.maxWeight, DEFAULT_LIMITS['40FT'].maxWeight),
      },
      containerType: o.containerType === '40FT' ? '40FT' : '20FT',
    };
  } catch {
    return null;
  }
}

function savePersisted(p: Persisted): void {
  try {
    wx.setStorageSync(STORAGE_KEY, p);
  } catch {
    /* ignore */
  }
}

function newMixLine(productId: string, mixProductIndex: number): MixLine {
  return {
    id: `m${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    productId,
    cartons: '0',
    mixProductIndex,
  };
}

Page({
  data: {
    themeClass: 'theme-light' as 'theme-light' | 'theme-dark',
    containerType: '20FT' as ContainerType,
    containerTypeIndex: 0,
    containerTypeLabels: [...CONTAINER_LABELS],
    c20: { maxVolume: 27, maxWeight: 27000 } as LimitBucket,
    c40: { maxVolume: 56, maxWeight: 27000 } as LimitBucket,
    currentMaxVolume: 27,
    currentMaxWeight: 27000,
    containerMeta: '',

    productKw: '',
    productCat: 'ALL',
    productCatLabels: [] as string[],
    productCatIndex: 0,
    productLibExpanded: true,

    singleKw: '',
    singleCat: 'ALL',
    singleCatLabels: [] as string[],
    singleCatIndex: 0,
    singleProductId: '',
    singleOptions: [] as { id: string; label: string }[],
    singleOptionIndex: 0,
    singleCartons: '1600',
    singleResultLines: [] as string[],
    singleFit: true,

    mixKw: '',
    mixCat: 'ALL',
    mixCatLabels: [] as string[],
    mixCatIndex: 0,
    mixProductLabels: [] as string[],
    mixProductIds: [] as string[],
    mixLines: [] as MixLine[],
    mixResultLines: [] as string[],
    mixFit: true,
    mixPending: true,

    displayProducts: [] as CargoProduct[],
    quoteText: '',

    products: [] as CargoProduct[],
  },

  _products: [] as CargoProduct[],

  onLoad() {
    const persisted = loadPersisted();
    const products = persisted?.products?.length
      ? persisted.products
      : normalizeProducts(INITIAL_PRODUCTS);
    const c20 = persisted?.c20 ?? { maxVolume: DEFAULT_LIMITS['20FT'].maxVolume, maxWeight: DEFAULT_LIMITS['20FT'].maxWeight };
    const c40 = persisted?.c40 ?? { maxVolume: DEFAULT_LIMITS['40FT'].maxVolume, maxWeight: DEFAULT_LIMITS['40FT'].maxWeight };
    const containerType = persisted?.containerType ?? '20FT';
    this._products = products;
    const lim = containerType === '20FT' ? c20 : c40;
    const mixLines: MixLine[] = [];
    const pick = (i: number) => products[i]?.id ?? products[0]?.id ?? '';
    if (products.length) {
      mixLines.push(newMixLine(pick(0), 0));
      mixLines.push(newMixLine(pick(1) || pick(0), Math.min(1, products.length - 1)));
    }
    this.setData(
      {
        products,
        c20,
        c40,
        containerType,
        containerTypeIndex: containerType === '40FT' ? 1 : 0,
        currentMaxVolume: lim.maxVolume,
        currentMaxWeight: lim.maxWeight,
        mixLines,
        singleProductId: products[0]?.id ?? '',
      },
      () => {
        this.rebuild();
        this.recalcMix();
      }
    );
  },

  onShow() {
    this.setData(applyThemeForToolPage());
  },

  persist() {
    savePersisted({
      products: this._products,
      c20: this.data.c20,
      c40: this.data.c40,
      containerType: this.data.containerType,
    });
  },

  recalcMix() {
    const products = this._products;
    const { containerType, c20, c40, mixLines } = this.data;
    const lim = containerType === '20FT' ? c20 : c40;
    const cname = DEFAULT_LIMITS[containerType].name;
    const mixRows = mixLines
      .map((line) => ({
        productId: line.productId,
        cartons: Math.max(0, Math.floor(safeNum(line.cartons))),
      }))
      .filter((r) => r.productId && r.cartons > 0);

    const mixCalc = calculateMix(mixRows, products, lim.maxVolume, lim.maxWeight, cname);
    const mixResultLines: string[] = [];
    let mixFit = true;
    let mixPending = true;
    if (!mixCalc) {
      mixResultLines.push('请至少输入一行箱数大于 0 的产品，并点击「计算混装结果」。');
    } else {
      mixPending = false;
      mixFit = mixCalc.fit;
      mixResultLines.push(...mixCalc.lines);
      mixResultLines.push('');
      mixResultLines.push(
        `合计体积：${fmt(mixCalc.totalVolume)} / ${lim.maxVolume} m³（${fmt(
          (mixCalc.totalVolume / lim.maxVolume) * 100,
          1
        )}%）`
      );
      mixResultLines.push(
        `合计重量：${fmt(mixCalc.totalWeight, 2)} / ${lim.maxWeight} kg（${fmt(
          (mixCalc.totalWeight / lim.maxWeight) * 100,
          1
        )}%）`
      );
      mixResultLines.push(
        `剩余体积：${fmt(mixCalc.remainVolume)} m³；剩余重量：${fmt(mixCalc.remainWeight, 2)} kg`
      );
      mixResultLines.push(mixCalc.fit ? '判定：可装柜' : '判定：超限');
    }
    this.setData({ mixResultLines, mixFit, mixPending });
  },

  rebuild() {
    const products = this._products;
    const { containerType, c20, c40, productKw, productCat, singleKw, singleCat, mixKw, mixCat } =
      this.data;
    const lim = containerType === '20FT' ? c20 : c40;
    const cname = DEFAULT_LIMITS[containerType].name;
    const containerMeta = `${cname} 约束：体积 <= ${lim.maxVolume}m³，重量 <= ${lim.maxWeight}kg`;

    const cats = getAllCategories(products);
    const catLabels = cats.map((c) => (c === 'ALL' ? '全部分类' : c));
    const productCatIndex = Math.max(0, cats.indexOf(productCat === '' ? 'ALL' : productCat));
    const singleCatIndex = Math.max(0, cats.indexOf(singleCat === '' ? 'ALL' : singleCat));
    const mixCatIndex = Math.max(0, cats.indexOf(mixCat === '' ? 'ALL' : mixCat));

    const displayProducts = filteredProducts(products, productKw, cats[productCatIndex] ?? 'ALL');

    const singleList = filteredProducts(products, singleKw, cats[singleCatIndex] ?? 'ALL');
    const singleOptions = singleList.map((p) => ({ id: p.id, label: productLabel(p) }));
    let singleProductId = this.data.singleProductId;
    if (!singleList.some((p) => p.id === singleProductId)) {
      singleProductId = singleList[0]?.id ?? '';
    }
    const singleOptionIndex = Math.max(
      0,
      singleOptions.findIndex((o) => o.id === singleProductId)
    );

    const mixList = filteredProducts(products, mixKw, cats[mixCatIndex] ?? 'ALL');
    const mixProductLabels = mixList.map((p) => productLabel(p));
    const mixProductIds = mixList.map((p) => p.id);
    const mixLines = this.data.mixLines.map((line) => {
      let pid = line.productId;
      if (!mixList.some((p) => p.id === pid)) {
        pid = mixList[0]?.id ?? '';
      }
      const mixProductIndex = Math.max(0, mixProductIds.indexOf(pid));
      return { ...line, productId: pid, mixProductIndex };
    });

    const singleResultLines: string[] = [];
    let singleFit = true;
    const sp = products.find((x) => x.id === singleProductId);
    if (!sp) {
      singleResultLines.push('请先添加或筛选出可用产品。');
    } else {
      const cartons = Math.max(0, Math.floor(safeNum(this.data.singleCartons)));
      const volumePerCarton = cartonVolumeM3(sp);
      const weightPerCarton = cartonWeightKg(sp);
      const volume = cartons * volumePerCarton;
      const weight = cartons * weightPerCarton;
      const maxByVolume = volumePerCarton > 0 ? Math.floor(lim.maxVolume / volumePerCarton) : 0;
      const maxByWeight = weightPerCarton > 0 ? Math.floor(lim.maxWeight / weightPerCarton) : 0;
      const maxCartons = Math.min(maxByVolume, maxByWeight);
      singleFit = volume <= lim.maxVolume && weight <= lim.maxWeight;
      singleResultLines.push(`产品：${productLabel(sp)}`);
      singleResultLines.push(
        `单箱体积：${fmt(volumePerCarton, 4)} m³；单箱重量：${fmt(weightPerCarton, 2)} kg`
      );
      singleResultLines.push(
        `当前 ${cartons} 箱 => 总体积 ${fmt(volume)} m³，总重量 ${fmt(weight, 2)} kg`
      );
      singleResultLines.push(
        `理论最大可装：${maxCartons} 箱（体积上限 ${maxByVolume} / 重量上限 ${maxByWeight}）`
      );
      singleResultLines.push(singleFit ? '判定：可装柜' : '判定：超限');
    }

    this.setData({
      products,
      containerMeta,
      productCatLabels: catLabels,
      productCatIndex,
      singleCatLabels: catLabels,
      singleCatIndex,
      mixCatLabels: catLabels,
      mixCatIndex,
      displayProducts,
      singleOptions,
      singleOptionIndex,
      singleProductId,
      mixProductLabels,
      mixProductIds,
      singleResultLines,
      singleFit,
      mixLines,
      currentMaxVolume: lim.maxVolume,
      currentMaxWeight: lim.maxWeight,
    });
    this.persist();
  },

  onContainerTypeChange(e: WechatMiniprogram.PickerChange) {
    const idx = Number(e.detail.value);
    const containerType: ContainerType = idx === 1 ? '40FT' : '20FT';
    const lim = containerType === '20FT' ? this.data.c20 : this.data.c40;
    this.setData(
      {
        containerTypeIndex: idx,
        containerType,
        currentMaxVolume: lim.maxVolume,
        currentMaxWeight: lim.maxWeight,
      },
      () => {
        this.rebuild();
        this.recalcMix();
      }
    );
  },

  onMaxVolumeInput(e: WechatMiniprogram.Input) {
    const v = Math.max(0, safeNum(e.detail.value));
    if (this.data.containerType === '20FT') {
      const c20 = { ...this.data.c20, maxVolume: v };
      this.setData({ c20, currentMaxVolume: v }, () => {
        this.rebuild();
        this.recalcMix();
      });
    } else {
      const c40 = { ...this.data.c40, maxVolume: v };
      this.setData({ c40, currentMaxVolume: v }, () => {
        this.rebuild();
        this.recalcMix();
      });
    }
  },

  onMaxWeightInput(e: WechatMiniprogram.Input) {
    const w = Math.max(0, safeNum(e.detail.value));
    if (this.data.containerType === '20FT') {
      const c20 = { ...this.data.c20, maxWeight: w };
      this.setData({ c20, currentMaxWeight: w }, () => {
        this.rebuild();
        this.recalcMix();
      });
    } else {
      const c40 = { ...this.data.c40, maxWeight: w };
      this.setData({ c40, currentMaxWeight: w }, () => {
        this.rebuild();
        this.recalcMix();
      });
    }
  },

  onProductKw(e: WechatMiniprogram.Input) {
    this.setData({ productKw: e.detail.value }, () => this.rebuild());
  },

  onProductCatChange(e: WechatMiniprogram.PickerChange) {
    const cats = getAllCategories(this._products);
    const idx = Number(e.detail.value);
    this.setData({ productCat: cats[idx] ?? 'ALL', productCatIndex: idx }, () => this.rebuild());
  },

  toggleProductLib() {
    this.setData({ productLibExpanded: !this.data.productLibExpanded });
  },

  onAddProduct() {
    this._products.push({
      id: `p${Date.now()}`,
      name: '新产品',
      spec: '规格',
      capacityL: 1,
      pcsPerCarton: 1,
      sizeCm: '30*30*30',
      cartonGrossWeightKg: null,
    });
    this.setData({ products: this._products }, () => this.rebuild());
  },

  onProductField(e: WechatMiniprogram.Input) {
    const id = e.currentTarget.dataset.id as string;
    const field = e.currentTarget.dataset.field as string;
    const p = this._products.find((x) => x.id === id);
    if (!p || !field) return;
    const val = e.detail.value;
    if (field === 'capacityL' || field === 'pcsPerCarton') {
      (p as Record<string, unknown>)[field] = val === '' ? 0 : safeNum(val);
    } else if (field === 'cartonGrossWeightKg') {
      p.cartonGrossWeightKg = val === '' ? null : safeNum(val);
    } else {
      (p as Record<string, unknown>)[field] = val;
    }
    this.setData({ products: this._products }, () => this.rebuild());
  },

  onDeleteProduct(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    const idx = this._products.findIndex((x) => x.id === id);
    if (idx < 0) return;
    this._products.splice(idx, 1);
    const fallback = this._products[0]?.id ?? '';
    const mixLines = this.data.mixLines.map((line) =>
      line.productId === id ? { ...line, productId: fallback } : line
    );
    let singleProductId = this.data.singleProductId;
    if (singleProductId === id) singleProductId = fallback;
    this.setData({ products: this._products, mixLines, singleProductId }, () => this.rebuild());
  },

  onSingleKw(e: WechatMiniprogram.Input) {
    this.setData({ singleKw: e.detail.value }, () => this.rebuild());
  },

  onSingleCatChange(e: WechatMiniprogram.PickerChange) {
    const cats = getAllCategories(this._products);
    const idx = Number(e.detail.value);
    this.setData({ singleCat: cats[idx] ?? 'ALL', singleCatIndex: idx }, () => this.rebuild());
  },

  onSingleProductChange(e: WechatMiniprogram.PickerChange) {
    const idx = Number(e.detail.value);
    const opt = this.data.singleOptions[idx];
    if (!opt) return;
    this.setData({ singleProductId: opt.id, singleOptionIndex: idx }, () => this.rebuild());
  },

  onSingleCartons(e: WechatMiniprogram.Input) {
    this.setData({ singleCartons: e.detail.value }, () => this.rebuild());
  },

  onMixKw(e: WechatMiniprogram.Input) {
    this.setData({ mixKw: e.detail.value }, () => this.rebuild());
  },

  onMixCatChange(e: WechatMiniprogram.PickerChange) {
    const cats = getAllCategories(this._products);
    const idx = Number(e.detail.value);
    this.setData({ mixCat: cats[idx] ?? 'ALL', mixCatIndex: idx }, () => this.rebuild());
  },

  onAddMixLine() {
    const mixList = filteredProducts(this._products, this.data.mixKw, this.data.mixCat);
    const first = mixList[0]?.id ?? '';
    const lines = [...this.data.mixLines, newMixLine(first, 0)];
    this.setData({ mixLines: lines }, () => this.rebuild());
  },

  onMixLineProductChange(e: WechatMiniprogram.PickerChange) {
    const lineId = e.currentTarget.dataset.lineId as string;
    const idx = Number(e.detail.value);
    const pid = this.data.mixProductIds[idx] ?? '';
    const mixLines = this.data.mixLines.map((l) =>
      l.id === lineId ? { ...l, productId: pid, mixProductIndex: idx } : l
    );
    this.setData({ mixLines }, () => this.rebuild());
  },

  onMixLineCartons(e: WechatMiniprogram.Input) {
    const lineId = e.currentTarget.dataset.lineId as string;
    const mixLines = this.data.mixLines.map((l) =>
      l.id === lineId ? { ...l, cartons: e.detail.value } : l
    );
    this.setData({ mixLines });
  },

  onRemoveMixLine(e: WechatMiniprogram.TouchEvent) {
    const lineId = e.currentTarget.dataset.lineId as string;
    if (this.data.mixLines.length <= 1) {
      wx.showToast({ title: '至少保留一行', icon: 'none' });
      return;
    }
    const mixLines = this.data.mixLines.filter((l) => l.id !== lineId);
    this.setData({ mixLines }, () => this.rebuild());
  },

  onCalcMix() {
    this.rebuild();
    this.recalcMix();
    wx.showToast({ title: '已更新', icon: 'none', duration: 800 });
  },

  onBuildQuote() {
    const products = this._products;
    const { containerType, c20, c40, mixLines } = this.data;
    const lim = containerType === '20FT' ? c20 : c40;
    const cname = DEFAULT_LIMITS[containerType].name;
    const mixRows = mixLines
      .map((line) => ({
        productId: line.productId,
        cartons: Math.max(0, Math.floor(safeNum(line.cartons))),
      }))
      .filter((r) => r.productId && r.cartons > 0);
    const mix = calculateMix(mixRows, products, lim.maxVolume, lim.maxWeight, cname);
    if (!mix) {
      wx.showToast({ title: '请先填写混装箱数', icon: 'none' });
      return;
    }
    this.recalcMix();
    const lines = buildQuoteLines(mix, mixRows, products);
    this.setData({ quoteText: lines.join('\n') });
  },

  onCopyQuote() {
    const text = this.data.quoteText.trim();
    if (!text) {
      wx.showToast({ title: '请先生成摘要', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    });
  },

  onShareAppMessage() {
    return buildToolShareMessage('cargo-quote', '装柜报价');
  },
});
