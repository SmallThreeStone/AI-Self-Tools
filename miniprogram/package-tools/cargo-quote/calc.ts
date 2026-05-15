import type { CargoProduct } from './types';

export type ContainerType = '20FT' | '40FT';

export const CONTAINER_LABELS = ['20Ft（27m³ / 27吨）', '40Ft（56m³ / 27吨）'] as const;

export const DEFAULT_LIMITS: Record<
  ContainerType,
  { maxVolume: number; maxWeight: number; name: string }
> = {
  '20FT': { name: '20Ft', maxVolume: 27, maxWeight: 27000 },
  '40FT': { name: '40Ft', maxVolume: 56, maxWeight: 27000 },
};

export function parseSize(sizeCm: string): { l: number; w: number; h: number } {
  const parts = String(sizeCm)
    .split('*')
    .map((x) => Number(String(x).trim()));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return { l: 0, w: 0, h: 0 };
  }
  return { l: parts[0], w: parts[1], h: parts[2] };
}

export function cartonVolumeM3(product: CargoProduct): number {
  const { l, w, h } = parseSize(product.sizeCm);
  return (l * w * h) / 1_000_000;
}

export function cartonWeightKg(product: CargoProduct): number {
  const g = product.cartonGrossWeightKg;
  if (typeof g === 'number' && g > 0) return g;
  return Number(product.capacityL) * Number(product.pcsPerCarton);
}

export function productLabel(p: CargoProduct): string {
  return `${p.name} ${p.spec}`.trim();
}

export function productCategory(p: CargoProduct): string {
  if (!p.name) return '未分类';
  const parts = p.name.split('/').map((x) => x.trim()).filter(Boolean);
  return parts[0] || '未分类';
}

export function getAllCategories(products: CargoProduct[]): string[] {
  const set = new Set(products.map(productCategory));
  return ['ALL', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))];
}

export function filteredProducts(
  products: CargoProduct[],
  keyword: string,
  category: string
): CargoProduct[] {
  const query = keyword.trim().toLowerCase();
  return products.filter((p) => {
    if (category !== 'ALL' && productCategory(p) !== category) return false;
    if (!query) return true;
    const hay = `${p.name} ${p.spec}`.toLowerCase();
    return hay.includes(query);
  });
}

export function safeNum(value: string | number, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function fmt(n: number, digits = 3): string {
  return Number(n).toFixed(digits);
}

export function normalizeProducts(raw: CargoProduct[]): CargoProduct[] {
  return raw.map((p, idx) => {
    const rawG = (p as { cartonGrossWeightKg?: unknown }).cartonGrossWeightKg;
    const gross =
      rawG === null || rawG === undefined || rawG === ''
        ? null
        : Number(rawG);
    return {
      id: p.id || `p${idx + 1}`,
      name: p.name || '未命名产品',
      spec: p.spec || '',
      capacityL: Number(p.capacityL) || 0,
      pcsPerCarton: Number(p.pcsPerCarton) || 0,
      sizeCm: p.sizeCm || '0*0*0',
      cartonGrossWeightKg: typeof gross === 'number' && Number.isFinite(gross) && gross > 0 ? gross : null,
    };
  });
}

export type MixRow = { productId: string; cartons: number };

export function calculateMix(
  rows: MixRow[],
  products: CargoProduct[],
  maxVolume: number,
  maxWeight: number,
  containerName: string
): {
  lines: string[];
  totalVolume: number;
  totalWeight: number;
  remainVolume: number;
  remainWeight: number;
  fit: boolean;
  containerName: string;
  maxVolume: number;
  maxWeight: number;
} | null {
  const resolved: { product: CargoProduct; cartons: number }[] = [];
  for (const r of rows) {
    const p = products.find((x) => x.id === r.productId);
    if (!p || r.cartons <= 0) continue;
    resolved.push({ product: p, cartons: r.cartons });
  }
  if (!resolved.length) return null;

  let totalVolume = 0;
  let totalWeight = 0;
  const lines = resolved.map(({ product, cartons }) => {
    const v = cartons * cartonVolumeM3(product);
    const w = cartons * cartonWeightKg(product);
    totalVolume += v;
    totalWeight += w;
    return `${productLabel(product)}：${cartons}箱，${fmt(v)}m³，${fmt(w, 2)}kg`;
  });

  const remainVolume = maxVolume - totalVolume;
  const remainWeight = maxWeight - totalWeight;
  const fit = remainVolume >= 0 && remainWeight >= 0;

  return {
    lines,
    totalVolume,
    totalWeight,
    remainVolume,
    remainWeight,
    fit,
    containerName,
    maxVolume,
    maxWeight,
  };
}

export function buildQuoteLines(
  mix: NonNullable<ReturnType<typeof calculateMix>>,
  rows: MixRow[],
  products: CargoProduct[]
): string[] {
  const lines: string[] = [];
  lines.push('【装柜报价摘要】');
  lines.push(
    `柜型：${mix.containerName}（体积上限 ${mix.maxVolume}m³，重量上限 ${mix.maxWeight}kg）`
  );
  lines.push('');
  for (const r of rows) {
    if (r.cartons <= 0) continue;
    const product = products.find((x) => x.id === r.productId);
    if (!product) continue;
    const v = r.cartons * cartonVolumeM3(product);
    const w = r.cartons * cartonWeightKg(product);
    lines.push(`- ${productLabel(product)}：${r.cartons}箱，体积 ${fmt(v)}m³，重量 ${fmt(w, 2)}kg`);
  }
  lines.push('');
  lines.push(`合计体积：${fmt(mix.totalVolume)}m³；合计重量：${fmt(mix.totalWeight, 2)}kg`);
  lines.push(`结果：${mix.fit ? '可装柜' : '超限'}`);
  if (!mix.fit) {
    if (mix.remainVolume < 0) lines.push(`超体积：${fmt(Math.abs(mix.remainVolume))}m³`);
    if (mix.remainWeight < 0) lines.push(`超重量：${fmt(Math.abs(mix.remainWeight), 2)}kg`);
  }
  return lines;
}
