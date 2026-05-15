export type CargoProduct = {
  id: string;
  name: string;
  spec: string;
  capacityL: number;
  pcsPerCarton: number;
  sizeCm: string;
  cartonGrossWeightKg: number | null;
};
