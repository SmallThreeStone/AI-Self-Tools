export function drawWeightChart(
  ctx: WechatMiniprogram.CanvasContext,
  data: number[],
  labels: string[],
  width: number,
  height: number,
  isDark = false
): void {
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  if (data.length === 0) return;

  const min = Math.min(...data) - 1;
  const max = Math.max(...data) + 1;
  const range = max - min || 1;

  const xs = data.map((_, i) => padding.left + (i / Math.max(data.length - 1, 1)) * chartW);
  const ys = data.map((v) => padding.top + chartH - ((v - min) / range) * chartH);

  const gridColor = isDark ? '#333' : '#eee';
  const lineColor = isDark ? '#4096ff' : '#1677ff';
  const pointColor = isDark ? '#4096ff' : '#1677ff';
  const labelColor = isDark ? '#666' : '#999';

  ctx.clearRect(0, 0, width, height);

  ctx.setStrokeStyle(gridColor);
  ctx.setLineWidth(1);
  for (let i = 0; i < 4; i++) {
    const y = padding.top + (chartH / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  ctx.setStrokeStyle(lineColor);
  ctx.setLineWidth(2);
  ctx.beginPath();
  xs.forEach((x, i) => {
    i === 0 ? ctx.moveTo(x, ys[i]) : ctx.lineTo(x, ys[i]);
  });
  ctx.stroke();

  ctx.setFillStyle(pointColor);
  xs.forEach((x, i) => {
    ctx.beginPath();
    ctx.arc(x, ys[i], 3, 0, 2 * Math.PI);
    ctx.fill();
  });

  ctx.setFillStyle(labelColor);
  ctx.setFontSize(10);
  labels.forEach((label, i) => {
    ctx.fillText(label, xs[i] - 12, height - 5);
  });

  ctx.setFillStyle(labelColor);
  ctx.setFontSize(10);
  ctx.fillText(min.toFixed(1), 2, padding.top + chartH);
  ctx.fillText(max.toFixed(1), 2, padding.top + 4);
}
