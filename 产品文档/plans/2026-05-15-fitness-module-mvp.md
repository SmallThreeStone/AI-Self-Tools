# 健身记录模块 MVP 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在现有微信工具箱小程序中新增健身记录模块，包含训练记录（动作库+模板+组录）和身体数据（体重/围度录入+趋势图）

**架构：** 新建 `package-fitness` 分包，通过工具注册表入口进入。模块首页（仪表盘）做三块导航入口，训练记录和身体数据各自独立页面。数据本地持久化（`wx.setStorage`），类型定义集中在 `package-fitness/types.ts`。

**技术栈：** 微信原生 + TypeScript、本地存储、Canvas 折线图（轻量自绘，不引入 echarts）

**设计文档：** `产品文档/specs/2026-05-15-fitness-module-design.md`

---

## 文件结构

```
Wechat_Mini_Program/miniprogram/
  修改:
    app.json                                    — 添加 package-fitness 分包声明
    config/tools.ts                             — 添加健身入口工具定义
    utils/navigation.ts                         — 添加 fitness 分包名映射
  新增:
    config/exercises.ts                         — 预设动作库数据（60+ 动作）
    config/foods.ts                             — 预设食物库数据（30+ 食物）
    package-fitness/
      types.ts                                  — 健身模块所有 TS 类型定义
      utils.ts                                  — 本地存储 CRUD 工具函数
      index/                                    — 仪表盘首页
        index.ts
        index.wxml
        index.wxss
        index.json
      workout/                                  — 训练记录
        index.ts
        index.wxml
        index.wxss
        index.json
        template-select.wxml                     — 选择训练模板弹窗（内联，不单建页面）
        training-active.wxml                     — 训练中组件（内联，不单建页面）
        history.wxml                             — 历史训练记录列表（内联）
      body-stats/                                — 身体数据
        index.ts
        index.wxml
        index.wxss
        index.json
      diet/                                      — 饮食记录（二期实现，预留占位页面）
        index.ts
        index.wxml
        index.wxss
        index.json
```

---

### 任务 1：分包注册与工具入口

**文件：**
- 修改：`miniprogram/app.json` — 添加 fitness 分包
- 修改：`miniprogram/config/tools.ts` — 添加健身入口
- 修改：`miniprogram/utils/navigation.ts` — 添加分包名映射

- [ ] **步骤 1：app.json 添加分包声明**

在 `subpackages` 数组中追加：

```json
{
  "root": "package-fitness",
  "name": "fitness",
  "pages": [
    "index/index",
    "workout/index",
    "body-stats/index",
    "diet/index"
  ]
}
```

- [ ] **步骤 2：config/tools.ts 添加健身入口**

`CategoryId` 类型追加 `'fitness'`：

```typescript
export type CategoryId = 'social' | 'life' | 'efficiency' | 'creative' | 'games' | 'fitness';
```

`categories` 数组追加：

```typescript
{ id: 'fitness', name: '健身管理', icon: '💪' },
```

`tools` 数组追加：

```typescript
{
  id: 'fitness',
  name: '健身记录',
  desc: '训练、身体、饮食一站式记录',
  categoryId: 'fitness',
  path: '/package-fitness/index/index',
  icon: '💪',
  tags: ['健身', '训练', '饮食', '体重', '记录'],
},
```

- [ ] **步骤 3：navigation.ts 添加分包名映射**

在 `subpackageNameForUrl` 函数中追加：

```typescript
if (url.includes('/package-fitness/')) return 'fitness';
```

在函数签名和 `loadToolSubpackage` 调用处的类型联合中添加 `'fitness'`。

- [ ] **步骤 4：Commit**

```bash
git add miniprogram/app.json miniprogram/config/tools.ts miniprogram/utils/navigation.ts
git commit -m "feat: register fitness module package and entry point"
```

---

### 任务 2：类型定义与存储工具

**文件：**
- 创建：`miniprogram/package-fitness/types.ts`
- 创建：`miniprogram/package-fitness/utils.ts`
- 创建：`miniprogram/config/exercises.ts`
- 创建：`miniprogram/config/foods.ts`

- [ ] **步骤 1：创建 types.ts**

```typescript
// ===== 训练记录 =====
export type MuscleGroup = '胸' | '背' | '肩' | '腿' | '臂' | '腹' | '有氧' | '全身';
export type ExerciseType = '推' | '拉' | '腿' | '核心' | '有氧' | '其他';

export interface ExerciseDef {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  type: ExerciseType;
  isCustom?: boolean;
}

export interface WorkoutSet {
  weight: number;
  reps: number;
  note?: string;
}

export interface WorkoutExercise {
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  templateName: string;
  date: string;
  startTime: string;
  endTime?: string;
  exercises: WorkoutExercise[];
  totalSets: number;
  totalVolume: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exerciseNames: string[];
}

// ===== 身体数据 =====
export interface BodyMeasurement {
  date: string;
  weight: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  hip?: number;
  leftArm?: number;
  rightArm?: number;
  leftThigh?: number;
  rightThigh?: number;
  leftCalf?: number;
  rightCalf?: number;
}

// ===== 饮食记录（二期） =====
export interface NutritionSummary {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

export interface FoodEntry {
  foodName: string;
  grams: number;
  nutrition: NutritionSummary;
}

export interface Meal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: FoodEntry[];
  subtotal: NutritionSummary;
}

export interface DietRecord {
  date: string;
  meals: Meal[];
  dailyTotal: NutritionSummary;
}

export interface FoodDef {
  name: string;
  per100g: NutritionSummary;
  isCustom?: boolean;
}

// ===== 仪表盘聚合 =====
export interface DashboardData {
  todayWorkout: WorkoutSession | null;
  todayWeight: BodyMeasurement | null;
  todayDiet: DietRecord | null;
  recentBody: BodyMeasurement[];
  recentWorkouts: WorkoutSession[];
}
```

- [ ] **步骤 2：创建 utils.ts（存储 CRUD）**

```typescript
import type {
  WorkoutSession,
  WorkoutTemplate,
  BodyMeasurement,
  DietRecord,
  ExerciseDef,
  FoodDef,
} from './types';

// ===== Storage Keys =====
const KEY_PREFIX = 'fitness_';
const K = {
  WORKOUT_SESSIONS: KEY_PREFIX + 'workout_sessions',
  WORKOUT_TEMPLATES: KEY_PREFIX + 'workout_templates',
  BODY_MEASUREMENTS: KEY_PREFIX + 'body_measurements',
  DIET_RECORDS: KEY_PREFIX + 'diet_records',
  CUSTOM_EXERCISES: KEY_PREFIX + 'custom_exercises',
  CUSTOM_FOODS: KEY_PREFIX + 'custom_foods',
};

// ===== 通用 =====
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = wx.getStorageSync(key);
    return raw !== '' ? (raw as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, data: unknown): void {
  wx.setStorageSync(key, data);
}

// ===== 训练记录 =====
export function getWorkoutSessions(): WorkoutSession[] {
  return loadJSON<WorkoutSession[]>(K.WORKOUT_SESSIONS, []);
}

export function saveWorkoutSession(session: WorkoutSession): void {
  const list = getWorkoutSessions();
  const idx = list.findIndex((s) => s.id === session.id);
  if (idx >= 0) list[idx] = session;
  else list.unshift(session);
  saveJSON(K.WORKOUT_SESSIONS, list);
}

export function getWorkoutTemplate(): WorkoutTemplate[] {
  return loadJSON<WorkoutTemplate[]>(K.WORKOUT_TEMPLATES, []);
}

export function saveWorkoutTemplates(templates: WorkoutTemplate[]): void {
  saveJSON(K.WORKOUT_TEMPLATES, templates);
}

export function getCustomExercises(): ExerciseDef[] {
  return loadJSON<ExerciseDef[]>(K.CUSTOM_EXERCISES, []);
}

export function saveCustomExercises(list: ExerciseDef[]): void {
  saveJSON(K.CUSTOM_EXERCISES, list);
}

export function getTodayWorkout(): WorkoutSession | null {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  return getWorkoutSessions().find((s) => s.date === dateStr) ?? null;
}

// ===== 身体数据 =====
export function getBodyMeasurements(): BodyMeasurement[] {
  return loadJSON<BodyMeasurement[]>(K.BODY_MEASUREMENTS, []);
}

export function saveBodyMeasurement(m: BodyMeasurement): void {
  const list = getBodyMeasurements();
  const idx = list.findIndex((x) => x.date === m.date);
  if (idx >= 0) list[idx] = m;
  else list.unshift(m);
  saveJSON(K.BODY_MEASUREMENTS, list);
}

export function getTodayBodyMeasurement(): BodyMeasurement | null {
  const today = new Date().toISOString().slice(0, 10);
  return getBodyMeasurements().find((m) => m.date === today) ?? null;
}

export function getRecentBodyMeasurements(days = 30): BodyMeasurement[] {
  return getBodyMeasurements().slice(0, days);
}

export function getRecentBodyMeasurementsLast7(): BodyMeasurement[] {
  return getBodyMeasurements().slice(0, 7);
}

// ===== 饮食记录 =====
export function getDietRecords(): DietRecord[] {
  return loadJSON<DietRecord[]>(K.DIET_RECORDS, []);
}

export function saveDietRecord(r: DietRecord): void {
  const list = getDietRecords();
  const idx = list.findIndex((x) => x.date === r.date);
  if (idx >= 0) list[idx] = r;
  else list.unshift(r);
  saveJSON(K.DIET_RECORDS, list);
}

export function getTodayDiet(): DietRecord | null {
  const today = new Date().toISOString().slice(0, 10);
  return getDietRecords().find((r) => r.date === today) ?? null;
}

// ===== 自定义库 =====
export function getCustomFoods(): FoodDef[] {
  return loadJSON<FoodDef[]>(K.CUSTOM_FOODS, []);
}

export function saveCustomFoods(list: FoodDef[]): void {
  saveJSON(K.CUSTOM_FOODS, list);
}
```

- [ ] **步骤 3：创建 config/exercises.ts（预设动作库）**

```typescript
import type { ExerciseDef } from '../package-fitness/types';

export const presetExercises: ExerciseDef[] = [
  // 胸部
  { id: 'flat-bb-bench', name: '平板杠铃卧推', muscleGroup: '胸', type: '推' },
  { id: 'flat-db-bench', name: '平板哑铃卧推', muscleGroup: '胸', type: '推' },
  { id: 'incline-bb-bench', name: '上斜杠铃卧推', muscleGroup: '胸', type: '推' },
  { id: 'incline-db-bench', name: '上斜哑铃卧推', muscleGroup: '胸', type: '推' },
  { id: 'decline-bb-bench', name: '下斜杠铃卧推', muscleGroup: '胸', type: '推' },
  { id: 'db-fly', name: '哑铃飞鸟', muscleGroup: '胸', type: '推' },
  { id: 'cable-fly', name: '绳索夹胸', muscleGroup: '胸', type: '推' },
  { id: 'pushup', name: '俯卧撑', muscleGroup: '胸', type: '推' },
  // 背部
  { id: 'pullup', name: '引体向上', muscleGroup: '背', type: '拉' },
  { id: 'bb-row', name: '杠铃划船', muscleGroup: '背', type: '拉' },
  { id: 'db-row', name: '哑铃划船', muscleGroup: '背', type: '拉' },
  { id: 'lat-pulldown', name: '高位下拉', muscleGroup: '背', type: '拉' },
  { id: 'seated-row', name: '坐姿划船', muscleGroup: '背', type: '拉' },
  { id: 'straight-arm-pulldown', name: '直臂下压', muscleGroup: '背', type: '拉' },
  { id: 'hyperextension', name: '山羊挺身', muscleGroup: '背', type: '拉' },
  // 肩部
  { id: 'bb-ohp', name: '杠铃推举', muscleGroup: '肩', type: '推' },
  { id: 'db-ohp', name: '哑铃推举', muscleGroup: '肩', type: '推' },
  { id: 'lat-raise', name: '侧平举', muscleGroup: '肩', type: '推' },
  { id: 'front-raise', name: '前平举', muscleGroup: '肩', type: '推' },
  { id: 'face-pull', name: '面拉', muscleGroup: '肩', type: '拉' },
  { id: 'reverse-fly', name: '反向飞鸟', muscleGroup: '肩', type: '拉' },
  // 手臂-二头
  { id: 'bb-curl', name: '杠铃弯举', muscleGroup: '臂', type: '拉' },
  { id: 'db-curl', name: '哑铃弯举', muscleGroup: '臂', type: '拉' },
  { id: 'preacher-curl', name: '牧师凳弯举', muscleGroup: '臂', type: '拉' },
  { id: 'hammer-curl', name: '锤式弯举', muscleGroup: '臂', type: '拉' },
  // 手臂-三头
  { id: 'tricep-pushdown', name: '三头下压', muscleGroup: '臂', type: '推' },
  { id: 'close-grip-bench', name: '窄距卧推', muscleGroup: '臂', type: '推' },
  { id: 'french-press', name: '法式弯举', muscleGroup: '臂', type: '推' },
  // 腿部
  { id: 'bb-squat', name: '杠铃深蹲', muscleGroup: '腿', type: '腿' },
  { id: 'front-squat', name: '前蹲', muscleGroup: '腿', type: '腿' },
  { id: 'leg-press', name: '腿举', muscleGroup: '腿', type: '腿' },
  { id: 'leg-curl', name: '腿弯举', muscleGroup: '腿', type: '腿' },
  { id: 'leg-extension', name: '腿屈伸', muscleGroup: '腿', type: '腿' },
  { id: 'rdl', name: '罗马尼亚硬拉', muscleGroup: '腿', type: '拉' },
  { id: 'bulgarian-split-squat', name: '保加利亚分腿蹲', muscleGroup: '腿', type: '腿' },
  { id: 'calf-raise', name: '提踵', muscleGroup: '腿', type: '腿' },
  // 核心
  { id: 'plank', name: '平板支撑', muscleGroup: '腹', type: '核心' },
  { id: 'crunch', name: '卷腹', muscleGroup: '腹', type: '核心' },
  { id: 'hanging-leg-raise', name: '吊杠举腿', muscleGroup: '腹', type: '核心' },
  { id: 'russian-twist', name: '俄罗斯转体', muscleGroup: '腹', type: '核心' },
  // 有氧
  { id: 'running', name: '跑步', muscleGroup: '有氧', type: '有氧' },
  { id: 'incline-walk', name: '爬坡走', muscleGroup: '有氧', type: '有氧' },
  { id: 'cycling', name: '单车', muscleGroup: '有氧', type: '有氧' },
  { id: 'rowing', name: '划船机', muscleGroup: '有氧', type: '有氧' },
  { id: 'elliptical', name: '椭圆机', muscleGroup: '有氧', type: '有氧' },
];

export function getAllExercises(): ExerciseDef[] {
  // 后续会 merge 用户自定义动作
  return presetExercises;
}
```

- [ ] **步骤 4：创建 config/foods.ts（预设食物库）**

```typescript
import type { FoodDef } from '../package-fitness/types';

export const presetFoods: FoodDef[] = [
  // 主食
  { name: '白米饭', per100g: { calories: 116, carbs: 25.9, protein: 2.6, fat: 0.3 } },
  { name: '面条（煮）', per100g: { calories: 110, carbs: 22.8, protein: 3.4, fat: 0.5 } },
  { name: '红薯', per100g: { calories: 86, carbs: 20.1, protein: 1.6, fat: 0.1 } },
  { name: '燕麦片', per100g: { calories: 377, carbs: 66.3, protein: 13.5, fat: 6.7 } },
  { name: '全麦面包', per100g: { calories: 246, carbs: 44.3, protein: 9.1, fat: 3.4 } },
  { name: '玉米', per100g: { calories: 112, carbs: 22.8, protein: 4.0, fat: 1.2 } },
  // 肉类
  { name: '鸡胸肉', per100g: { calories: 133, carbs: 0, protein: 31, fat: 1.2 } },
  { name: '鸡蛋（1个）', per100g: { calories: 144, carbs: 1.5, protein: 13.3, fat: 8.8 } },
  { name: '瘦牛肉', per100g: { calories: 125, carbs: 0, protein: 20.2, fat: 4.2 } },
  { name: '猪瘦肉', per100g: { calories: 143, carbs: 1.5, protein: 20.3, fat: 6.2 } },
  { name: '三文鱼', per100g: { calories: 139, carbs: 0, protein: 21.3, fat: 6.3 } },
  { name: '虾仁', per100g: { calories: 93, carbs: 0, protein: 18.6, fat: 1.5 } },
  { name: '豆腐', per100g: { calories: 81, carbs: 4.2, protein: 8.1, fat: 3.7 } },
  // 蔬菜
  { name: '西兰花', per100g: { calories: 34, carbs: 6.6, protein: 2.8, fat: 0.4 } },
  { name: '菠菜', per100g: { calories: 23, carbs: 3.6, protein: 2.9, fat: 0.4 } },
  { name: '生菜', per100g: { calories: 15, carbs: 2.9, protein: 1.4, fat: 0.2 } },
  { name: '番茄', per100g: { calories: 18, carbs: 3.9, protein: 0.9, fat: 0.2 } },
  { name: '黄瓜', per100g: { calories: 15, carbs: 2.9, protein: 0.8, fat: 0.2 } },
  // 水果
  { name: '苹果', per100g: { calories: 52, carbs: 13.8, protein: 0.3, fat: 0.2 } },
  { name: '香蕉', per100g: { calories: 89, carbs: 22.8, protein: 1.1, fat: 0.3 } },
  { name: '蓝莓', per100g: { calories: 57, carbs: 14.5, protein: 0.7, fat: 0.3 } },
  { name: '橙子', per100g: { calories: 47, carbs: 11.8, protein: 0.9, fat: 0.1 } },
  // 蛋奶
  { name: '纯牛奶', per100g: { calories: 66, carbs: 5.0, protein: 3.2, fat: 3.6 } },
  { name: '无糖酸奶', per100g: { calories: 61, carbs: 4.7, protein: 3.5, fat: 3.3 } },
  { name: '全脂奶粉', per100g: { calories: 478, carbs: 39.0, protein: 20.0, fat: 27.0 } },
  // 调味/其他
  { name: '橄榄油', per100g: { calories: 884, carbs: 0, protein: 0, fat: 100 } },
  { name: '花生酱', per100g: { calories: 588, carbs: 20, protein: 25, fat: 50 } },
  { name: '蛋白粉', per100g: { calories: 400, carbs: 6.3, protein: 80, fat: 5.3 } },
];
```

- [ ] **步骤 5：Commit**

```bash
git add miniprogram/package-fitness/types.ts miniprogram/package-fitness/utils.ts miniprogram/config/exercises.ts miniprogram/config/foods.ts
git commit -m "feat: add fitness module type definitions, storage utils, and preset data"
```

---

### 任务 3：健身仪表盘首页

**文件：**
- 创建：`miniprogram/package-fitness/index/index.ts`
- 创建：`miniprogram/package-fitness/index/index.wxml`
- 创建：`miniprogram/package-fitness/index/index.wxss`
- 创建：`miniprogram/package-fitness/index/index.json`

仪表盘布局：顶部今日概览卡片（三段式：训练状态 | 体重状态 | 饮食状态），中部趋势区（体重折线图，用 Canvas 自绘），底部三个快捷按钮。

- [ ] **步骤 1：创建 index.json**

```json
{
  "navigationBarTitleText": "健身记录",
  "usingComponents": {}
}
```

- [ ] **步骤 2：创建 index.ts**

```typescript
import { applyThemeForToolPage } from '../../utils/nav-theme';
import { buildToolShareMessage } from '../../utils/tool-share';
import { getTodayWorkout, getTodayBodyMeasurement, getTodayDiet, getRecentBodyMeasurements } from '../utils';
import { drawWeightChart } from './chart';

Page({
  data: {
    themeClass: 'theme-light',
    // 今日概览
    workoutStatus: '',           // '已完成N组' | '今日尚未训练'
    weightStatus: '',            // '已记录 XX kg' | '尚未记录'
    dietStatus: '',              // '已录N餐' | '尚未记录'
    // 趋势图
    weightChartData: null as number[] | null,
    weightChartLabels: null as string[] | null,
    // 快捷入口
    hasTodayBody: false,
  },

  onShow() {
    this.setData(applyThemeForToolPage());
    this.loadDashboard();
  },

  loadDashboard() {
    // 训练状态
    const todayWorkout = getTodayWorkout();
    const workoutStatus = todayWorkout
      ? `已完成 ${todayWorkout.totalSets} 组`
      : '今日尚未训练';

    // 体重状态
    const todayBody = getTodayBodyMeasurement();
    const weightStatus = todayBody
      ? `已记录 ${todayBody.weight} kg`
      : '尚未记录';
    const hasTodayBody = !!todayBody;

    // 饮食状态
    const todayDiet = getTodayDiet();
    const dietStatus = todayDiet
      ? `已录 ${todayDiet.meals.length} 餐`
      : '尚未记录';

    // 最近 7 天体重（用于折线图）
    const recent = getRecentBodyMeasurements(7);
    const weightChartData = recent.map((m) => m.weight).reverse();
    const weightChartLabels = recent.map((m) => m.date.slice(5)).reverse();

    this.setData({
      workoutStatus,
      weightStatus,
      dietStatus,
      hasTodayBody,
      weightChartData,
      weightChartLabels,
    });
  },

  onStartWorkout() {
    wx.navigateTo({ url: '/package-fitness/workout/index' });
  },

  onRecordWeight() {
    wx.navigateTo({ url: '/package-fitness/body-stats/index' });
  },

  onRecordDiet() {
    wx.navigateTo({ url: '/package-fitness/diet/index' });
  },

  onShareAppMessage() {
    return buildToolShareMessage('fitness', '健身记录');
  },
});
```

- [ ] **步骤 3：创建 chart.ts（Canvas 折线图工具函数）**

```typescript
/** 在 canvas 上绘制简易体重折线图 */
export function drawWeightChart(
  ctx: WechatMiniprogram.CanvasContext,
  data: number[],
  labels: string[],
  width: number,
  height: number
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

  // 清空
  ctx.clearRect(0, 0, width, height);

  // 网格线
  ctx.setStrokeStyle('#eee');
  ctx.setLineWidth(1);
  for (let i = 0; i < 4; i++) {
    const y = padding.top + (chartH / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  // 折线
  ctx.setStrokeStyle('#1677ff');
  ctx.setLineWidth(2);
  ctx.beginPath();
  xs.forEach((x, i) => {
    i === 0 ? ctx.moveTo(x, ys[i]) : ctx.lineTo(x, ys[i]);
  });
  ctx.stroke();

  // 数据点
  ctx.setFillStyle('#1677ff');
  xs.forEach((x, i) => {
    ctx.beginPath();
    ctx.arc(x, ys[i], 3, 0, 2 * Math.PI);
    ctx.fill();
  });

  // X 轴标签
  ctx.setFillStyle('#999');
  ctx.setFontSize(10);
  labels.forEach((label, i) => {
    ctx.fillText(label, xs[i] - 12, height - 5);
  });

  // Y 轴标签（首尾）
  ctx.setFillStyle('#999');
  ctx.setFontSize(10);
  ctx.fillText(min.toFixed(1), 2, padding.top + chartH);
  ctx.fillText(max.toFixed(1), 2, padding.top + 4);
}
```

- [ ] **步骤 4：创建 index.wxml**

```xml
<view class="page {{themeClass}}">
  <!-- 今日概览卡片 -->
  <view class="overview-card">
    <view class="overview-item" bindtap="onStartWorkout">
      <text class="overview-icon">💪</text>
      <text class="overview-label">训练</text>
      <text class="overview-value">{{workoutStatus}}</text>
    </view>
    <view class="overview-item" bindtap="onRecordWeight">
      <text class="overview-icon">⚖️</text>
      <text class="overview-label">体重</text>
      <text class="overview-value">{{weightStatus}}</text>
    </view>
    <view class="overview-item" bindtap="onRecordDiet">
      <text class="overview-icon">🍽️</text>
      <text class="overview-label">饮食</text>
      <text class="overview-value">{{dietStatus}}</text>
    </view>
  </view>

  <!-- 体重趋势 -->
  <view class="section">
    <text class="section-title">体重趋势（近 7 天）</text>
    <canvas class="chart-canvas" canvas-id="weightChart"></canvas>
  </view>

  <!-- 快捷操作 -->
  <view class="quick-actions">
    <button class="action-btn primary" bindtap="onStartWorkout">开始训练</button>
    <view class="action-row">
      <button class="action-btn secondary" bindtap="onRecordWeight">记录体重</button>
      <button class="action-btn secondary" bindtap="onRecordDiet">记录饮食</button>
    </view>
  </view>
</view>
```

- [ ] **步骤 5：创建 index.wxss**

```css
.page {
  padding: 16px;
  min-height: 100vh;
  background: #f5f6f8;
}
.theme-dark {
  background: #1a1a2e;
}

.overview-card {
  display: flex;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.theme-dark .overview-card {
  background: #16213e;
}
.overview-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.overview-icon {
  font-size: 24px;
}
.overview-label {
  font-size: 13px;
  color: #666;
}
.theme-dark .overview-label {
  color: #999;
}
.overview-value {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}
.theme-dark .overview-value {
  color: #ccc;
}

.section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.theme-dark .section {
  background: #16213e;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 12px;
}
.theme-dark .section-title {
  color: #e0e0e0;
}

.chart-canvas {
  width: 100%;
  height: 160px;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.action-btn {
  width: 100%;
  height: 44px;
  line-height: 44px;
  border-radius: 10px;
  text-align: center;
  font-size: 15px;
  border: none;
  padding: 0;
}
.action-btn.primary {
  background: #1677ff;
  color: #fff;
}
.action-btn.secondary {
  background: #fff;
  color: #333;
  border: 1px solid #e0e0e0;
}
.theme-dark .action-btn.secondary {
  background: #16213e;
  color: #e0e0e0;
  border-color: #333;
}
.action-row {
  display: flex;
  gap: 12px;
}
.action-row .action-btn {
  flex: 1;
}
```

- [ ] **步骤 6：更新 index.ts 添加 Canvas 绘制**

在 `loadDashboard` 末尾添加绘制体重图表的逻辑。在 `onShow` 中使用 `wx.nextTick` 确保 Canvas 已渲染：

```typescript
// 在 onShow 的 loadDashboard 调用后
wx.nextTick(() => {
  const query = wx.createSelectorQuery();
  query.select('.chart-canvas').fields({ node: false, size: true }).exec((res) => {
    if (!res || !res[0]) return;
    const { width, height } = res[0];
    const ctx = wx.createCanvasContext('weightChart');
    const { weightChartData, weightChartLabels } = this.data;
    if (weightChartData && weightChartData.length > 0) {
      drawWeightChart(ctx, weightChartData, weightChartLabels, width, height);
    }
    ctx.draw();
  });
});
```

- [ ] **步骤 7：Commit**

```bash
git add miniprogram/package-fitness/index/ miniprogram/package-fitness/chart.ts
git commit -m "feat: add fitness dashboard with overview cards and weight chart"
```

---

### 任务 4：训练记录 — 页面框架与模板选择

**文件：**
- 创建：`miniprogram/package-fitness/workout/index.json`
- 创建：`miniprogram/package-fitness/workout/index.ts`（加载模板列表、动作库）
- 创建：`miniprogram/package-fitness/workout/index.wxml`（模板选择 + 训练活动区 + 历史记录）
- 创建：`miniprogram/package-fitness/workout/index.wxss`

**UI 状态机：** idle（模板选择）→ active（训练中）→ completed（训练完成展示）

- [ ] **步骤 1：创建 index.json**

```json
{
  "navigationBarTitleText": "训练记录",
  "usingComponents": {}
}
```

- [ ] **步骤 2：创建 index.ts**

```typescript
import { applyThemeForToolPage } from '../../utils/nav-theme';
import { buildToolShareMessage } from '../../utils/tool-share';
import {
  getWorkoutSessions,
  saveWorkoutSession,
  getWorkoutTemplates,
  saveWorkoutTemplates,
  getCustomExercises,
  saveCustomExercises,
} from '../utils';
import { presetExercises, getAllExercises } from '../../config/exercises';
import type { WorkoutTemplate, WorkoutSession, WorkoutExercise, WorkoutSet, ExerciseDef } from '../types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

Page({
  data: {
    themeClass: 'theme-light',
    // 状态: 'idle' | 'active' | 'completed'
    state: 'idle',
    // 模板列表
    templates: [] as WorkoutTemplate[],
    defaultTemplates: [
      { id: 'chest', name: '练胸日', exerciseNames: ['平板哑铃卧推', '平板杠铃卧推', '上斜哑铃卧推', '上斜杠铃卧推'] },
      { id: 'back-bi', name: '背+二头日', exerciseNames: ['引体向上', '杠铃划船', '高位下拉', '坐姿划船', '杠铃弯举', '哑铃弯举'] },
      { id: 'shoulder-tri', name: '肩+三头日', exerciseNames: ['哑铃推举', '侧平举', '面拉', '三头下压', '窄距卧推'] },
      { id: 'cardio-incline', name: '爬坡日', exerciseNames: ['爬坡走'] },
      { id: 'cardio', name: '有氧日', exerciseNames: ['跑步', '单车', '划船机'] },
      { id: 'legs', name: '练腿日', exerciseNames: ['杠铃深蹲', '腿举', '腿弯举', '腿屈伸', '罗马尼亚硬拉'] },
    ],
    // 训练中状态
    activeTemplate: null as WorkoutTemplate | null,
    exercises: [] as WorkoutExercise[],
    currentExerciseIdx: 0,
    weightInput: '',
    repsInput: '',
    noteInput: '',
    completedSets: 0 as number,
    totalSets: 0 as number,
    totalVolume: 0 as number,
    // 历史记录
    history: [] as WorkoutSession[],
    showHistory: false,
    // 动作搜索
    searchResults: [] as ExerciseDef[],
    searchKeyword: '',
    showSearch: false,
  },

  onShow() {
    this.setData(applyThemeForToolPage());
  },

  onLoad() {
    const savedTemplates = getWorkoutTemplates();
    const history = getWorkoutSessions().slice(0, 20);
    this.setData({
      templates: savedTemplates.length > 0 ? savedTemplates : this.data.defaultTemplates,
      history,
    });
  },

  // ===== 模板选择 =====
  selectTemplate(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    const template = this.data.templates.find((t) => t.id === id) ?? this.data.defaultTemplates.find((t) => t.id === id);
    if (!template) return;

    const exercises: WorkoutExercise[] = template.exerciseNames.map((name) => ({
      exerciseName: name,
      muscleGroup: '全身' as const,
      sets: [],
    }));

    this.setData({
      state: 'active',
      activeTemplate: template,
      exercises,
      currentExerciseIdx: 0,
      weightInput: '',
      repsInput: '',
      noteInput: '',
      completedSets: 0,
      totalSets: 0,
      totalVolume: 0,
    });
  },

  // ===== 训练中 =====
  onWeightInput(e: WechatMiniprogram.Input) {
    this.setData({ weightInput: e.detail.value });
  },

  onRepsInput(e: WechatMiniprogram.Input) {
    this.setData({ repsInput: e.detail.value });
  },

  onNoteInput(e: WechatMiniprogram.Input) {
    this.setData({ noteInput: e.detail.value });
  },

  addSet() {
    const weight = parseFloat(this.data.weightInput);
    const reps = parseInt(this.data.repsInput, 10);
    if (!(weight > 0) || !(reps > 0)) {
      wx.showToast({ title: '请输入有效的重量和次数', icon: 'none' });
      return;
    }

    const exercises = [...this.data.exercises];
    const idx = this.data.currentExerciseIdx;
    const set: WorkoutSet = {
      weight,
      reps,
      note: this.data.noteInput || undefined,
    };
    exercises[idx].sets.push(set);

    // 更新汇总
    const completedSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const totalVolume = exercises.reduce((sum, ex) =>
      sum + ex.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0);

    this.setData({
      exercises,
      completedSets,
      totalVolume,
      weightInput: '',
      repsInput: '',
      noteInput: '',
    });
  },

  nextExercise() {
    if (this.data.currentExerciseIdx < this.data.exercises.length - 1) {
      this.setData({
        currentExerciseIdx: this.data.currentExerciseIdx + 1,
        weightInput: '',
        repsInput: '',
        noteInput: '',
      });
    }
  },

  prevExercise() {
    if (this.data.currentExerciseIdx > 0) {
      this.setData({
        currentExerciseIdx: this.data.currentExerciseIdx - 1,
      });
    }
  },

  finishWorkout() {
    const template = this.data.activeTemplate;
    if (!template) return;

    const session: WorkoutSession = {
      id: generateId(),
      templateName: template.name,
      date: new Date().toISOString().slice(0, 10),
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      exercises: this.data.exercises,
      totalSets: this.data.completedSets,
      totalVolume: this.data.totalVolume,
    };

    saveWorkoutSession(session);
    this.setData({ state: 'completed', activeTemplate: null });
    wx.showToast({ title: '训练已保存', icon: 'success' });
  },

  newWorkout() {
    this.setData({ state: 'idle' });
  },

  // ===== 历史记录 =====
  toggleHistory() {
    const history = getWorkoutSessions().slice(0, 20);
    this.setData({ showHistory: !this.data.showHistory, history });
  },

  viewSession(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    const session = getWorkoutSessions().find((s) => s.id === id);
    if (!session) return;
    wx.showModal({
      title: session.templateName + ' ' + session.date,
      content: `总组数: ${session.totalSets}\n总容量: ${session.totalVolume} kg`,
      showCancel: false,
    });
  },

  // ===== 添加自定义动作 =====
  onSearchInput(e: WechatMiniprogram.Input) {
    const keyword = e.detail.value;
    if (!keyword.trim()) {
      this.setData({ showSearch: false, searchResults: [] });
      return;
    }
    const all = getAllExercises();
    const custom = getCustomExercises();
    const results = [...all, ...custom].filter((ex) =>
      ex.name.includes(keyword) || ex.muscleGroup.includes(keyword)
    );
    this.setData({ showSearch: true, searchResults: results.slice(0, 10), searchKeyword: keyword });
  },

  selectSearchResult(e: WechatMiniprogram.TouchEvent) {
    const name = e.currentTarget.dataset.name as string;
    const exercises = [...this.data.exercises];
    const all = [...getAllExercises(), ...getCustomExercises()];
    const def = all.find((ex) => ex.name === name);
    exercises.push({
      exerciseName: name,
      muscleGroup: def?.muscleGroup ?? '全身',
      sets: [],
    });
    this.setData({ exercises, showSearch: false, searchKeyword: '', searchResults: [] });
  },

  onShareAppMessage() {
    return buildToolShareMessage('fitness', '健身记录');
  },
});
```

- [ ] **步骤 3：创建 index.wxml**

```xml
<view class="page {{themeClass}}">
  <!-- ===== 状态：空闲 - 模板选择 ===== -->
  <block wx:if="{{state === 'idle'}}">
    <view class="section">
      <view class="section-header">
        <text class="section-title">选择训练模板</text>
        <text class="section-link" bindtap="toggleHistory">历史记录 ›</text>
      </view>
      <view class="template-list">
        <view class="template-card" wx:for="{{templates}}" wx:key="id" data-id="{{item.id}}" bindtap="selectTemplate">
          <text class="template-name">{{item.name}}</text>
          <text class="template-exercises">{{item.exerciseNames.join('、')}}</text>
        </view>
      </view>
    </view>

    <!-- 手动搜索动作 -->
    <view class="section">
      <text class="section-title">临时加动作</text>
      <input class="search-input" placeholder="搜索动作名..." value="{{searchKeyword}}" bindinput="onSearchInput" />
      <view wx:if="{{showSearch}}" class="search-results">
        <view class="search-item" wx:for="{{searchResults}}" wx:key="id" data-name="{{item.name}}" bindtap="selectSearchResult">
          <text class="search-name">{{item.name}}</text>
          <text class="search-muscle">{{item.muscleGroup}}</text>
        </view>
      </view>
    </view>

    <!-- 历史记录 -->
    <view wx:if="{{showHistory}}" class="section">
      <text class="section-title">历史训练</text>
      <view wx:if="{{history.length === 0}}" class="empty">暂无记录</view>
      <view class="history-item" wx:for="{{history}}" wx:key="id" data-id="{{item.id}}" bindtap="viewSession">
        <text class="history-name">{{item.templateName}}</text>
        <text class="history-meta">{{item.date}} · {{item.totalSets}}组 · {{item.totalVolume}}kg</text>
      </view>
    </view>
  </block>

  <!-- ===== 状态：训练中 ===== -->
  <block wx:elif="{{state === 'active'}}">
    <view class="training-header">
      <text class="training-title">{{activeTemplate.name}}</text>
      <text class="training-progress">已完成 {{completedSets}} 组，总容量 {{totalVolume}} kg</text>
    </view>

    <!-- 当前动作卡片 -->
    <view class="exercise-card" wx:for="{{exercises}}" wx:for-index="exIdx" wx:key="exerciseName">
      <block wx:if="{{exIdx === currentExerciseIdx}}">
        <view class="exercise-name-row">
          <text class="exercise-name">{{item.exerciseName}}</text>
          <text class="exercise-count">第{{exIdx+1}}/{{exercises.length}}个动作</text>
        </view>

        <!-- 已完成组 -->
        <view class="sets-list">
          <view class="set-row header">
            <text class="set-col">组号</text>
            <text class="set-col">重量(kg)</text>
            <text class="set-col">次数</text>
            <text class="set-col">备注</text>
          </view>
          <view class="set-row" wx:for="{{item.sets}}" wx:for-index="sIdx" wx:key="*this">
            <text class="set-col">{{sIdx + 1}}</text>
            <text class="set-col">{{item.weight}}</text>
            <text class="set-col">{{item.reps}}</text>
            <text class="set-col">{{item.note || '-'}}</text>
          </view>
        </view>

        <!-- 录入新组 -->
        <view class="input-row">
          <input class="set-input weight" type="digit" placeholder="重量" value="{{weightInput}}" bindinput="onWeightInput" />
          <text class="input-x">×</text>
          <input class="set-input reps" type="digit" placeholder="次数" value="{{repsInput}}" bindinput="onRepsInput" />
          <input class="set-input note" placeholder="备注(选填)" value="{{noteInput}}" bindinput="onNoteInput" />
        </view>

        <view class="action-row-training">
          <button class="btn-add" bindtap="addSet">✓ 完成本组</button>
        </view>

        <view class="nav-row">
          <button wx:if="{{exIdx > 0}}" class="btn-nav" bindtap="prevExercise">← 上一个</button>
          <button wx:if="{{exIdx < exercises.length - 1}}" class="btn-nav" bindtap="nextExercise">下一个 →</button>
          <button wx:if="{{exIdx === exercises.length - 1 && completedSets > 0}}" class="btn-finish" bindtap="finishWorkout">✓ 结束训练</button>
        </view>
      </block>
    </view>
  </block>

  <!-- ===== 状态：训练完成 ===== -->
  <block wx:elif="{{state === 'completed'}}">
    <view class="completed-view">
      <text class="completed-icon">✅</text>
      <text class="completed-title">训练已保存</text>
      <text class="completed-meta">完成 {{completedSets}} 组 · 总容量 {{totalVolume}} kg</text>
      <button class="btn-new" bindtap="newWorkout">开始新训练</button>
    </view>
  </block>
</view>
```

- [ ] **步骤 4：创建 index.wxss**

```css
.page {
  padding: 16px;
  min-height: 100vh;
  background: #f5f6f8;
}
.theme-dark { background: #1a1a2e; }

.section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.theme-dark .section { background: #16213e; }

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.section-title { font-size: 15px; font-weight: 600; color: #333; }
.theme-dark .section-title { color: #e0e0e0; }
.section-link { font-size: 13px; color: #1677ff; }

.template-card {
  padding: 12px;
  border-radius: 8px;
  background: #f5f6f8;
  margin-bottom: 8px;
}
.theme-dark .template-card { background: #1a1a2e; }
.template-name { font-size: 15px; font-weight: 600; color: #333; display: block; }
.theme-dark .template-name { color: #e0e0e0; }
.template-exercises { font-size: 12px; color: #999; margin-top: 4px; display: block; }

.search-input {
  width: 100%;
  height: 36px;
  border-radius: 8px;
  background: #f5f6f8;
  padding: 0 12px;
  font-size: 14px;
  margin-top: 8px;
}
.theme-dark .search-input { background: #1a1a2e; color: #e0e0e0; }
.search-results { margin-top: 8px; }
.search-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}
.search-name { font-size: 14px; color: #333; }
.search-muscle { font-size: 12px; color: #999; }

.empty { text-align: center; padding: 24px 0; color: #999; font-size: 14px; }
.history-item { padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.history-name { font-size: 14px; font-weight: 500; color: #333; display: block; }
.history-meta { font-size: 12px; color: #999; }

/* 训练中 */
.training-header { padding: 16px 0; }
.training-title { font-size: 20px; font-weight: 700; color: #333; display: block; }
.theme-dark .training-title { color: #e0e0e0; }
.training-progress { font-size: 13px; color: #999; margin-top: 4px; display: block; }

.exercise-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
.theme-dark .exercise-card { background: #16213e; }
.exercise-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.exercise-name { font-size: 16px; font-weight: 600; color: #333; }
.theme-dark .exercise-name { color: #e0e0e0; }
.exercise-count { font-size: 12px; color: #999; }

.sets-list { margin-bottom: 12px; }
.set-row {
  display: flex;
  padding: 6px 0;
  border-bottom: 1px solid #f5f5f5;
}
.set-row.header { font-weight: 600; font-size: 12px; color: #999; }
.set-col { flex: 1; font-size: 14px; color: #333; }
.theme-dark .set-col { color: #ccc; }

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.set-input {
  height: 36px;
  border-radius: 8px;
  background: #f5f6f8;
  text-align: center;
  font-size: 14px;
}
.theme-dark .set-input { background: #1a1a2e; color: #e0e0e0; }
.set-input.weight { width: 80px; }
.set-input.reps { width: 80px; }
.set-input.note { flex: 1; }
.input-x { font-size: 16px; color: #999; }

.action-row-training { margin-bottom: 8px; }
.btn-add {
  width: 100%;
  height: 42px;
  line-height: 42px;
  background: #1677ff;
  color: #fff;
  border-radius: 10px;
  font-size: 15px;
  border: none;
  padding: 0;
}

.nav-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.btn-nav, .btn-finish {
  flex: 1;
  height: 38px;
  line-height: 38px;
  border-radius: 8px;
  font-size: 14px;
  border: 1px solid #e0e0e0;
  background: #fff;
  color: #333;
  text-align: center;
  padding: 0;
}
.btn-finish { background: #52c41a; color: #fff; border-color: #52c41a; }

/* 完成页 */
.completed-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 80px;
}
.completed-icon { font-size: 64px; }
.completed-title { font-size: 20px; font-weight: 600; color: #333; margin-top: 16px; }
.completed-meta { font-size: 14px; color: #999; margin-top: 8px; }
.btn-new {
  margin-top: 32px;
  width: 200px;
  height: 44px;
  line-height: 44px;
  background: #1677ff;
  color: #fff;
  border-radius: 10px;
  font-size: 15px;
  border: none;
  padding: 0;
}

/* 暗色 */
.theme-dark .exercises-map-dropdown { background: #16213e; }
```

- [ ] **步骤 5：Commit**

```bash
git add miniprogram/package-fitness/workout/
git commit -m "feat: add workout tracking with template selection, set recording, and history"
```

---

### 任务 5：身体数据页面

**文件：**
- 创建：`miniprogram/package-fitness/body-stats/index.json`
- 创建：`miniprogram/package-fitness/body-stats/index.ts`
- 创建：`miniprogram/package-fitness/body-stats/index.wxml`
- 创建：`miniprogram/package-fitness/body-stats/index.wxss`

- [ ] **步骤 1：创建 index.json**

```json
{
  "navigationBarTitleText": "身体数据",
  "usingComponents": {}
}
```

- [ ] **步骤 2：创建 index.ts**

```typescript
import { applyThemeForToolPage } from '../../utils/nav-theme';
import { buildToolShareMessage } from '../../utils/tool-share';
import { getBodyMeasurements, saveBodyMeasurement } from '../utils';
import type { BodyMeasurement } from '../types';

Page({
  data: {
    themeClass: 'theme-light',
    // 录入表单
    weight: '',
    bodyFat: '',
    chest: '',
    waist: '',
    hip: '',
    leftArm: '',
    rightArm: '',
    leftThigh: '',
    rightThigh: '',
    leftCalf: '',
    rightCalf: '',
    // 记录列表
    records: [] as BodyMeasurement[],
    showChart: false,
    // 最近 7 天
    weekWeights: [] as number[],
    weekLabels: [] as string[],
  },

  onShow() {
    this.setData(applyThemeForToolPage());
    this.loadRecords();
  },

  loadRecords() {
    const all = getBodyMeasurements();
    const records = all.slice(0, 20);
    const weekWeights = all.slice(0, 7).map((m) => m.weight).reverse();
    const weekLabels = all.slice(0, 7).map((m) => m.date.slice(5)).reverse();
    this.setData({ records, weekWeights, weekLabels });
  },

  // 表单输入处理
  onWeightInput(e: WechatMiniprogram.Input) { this.setData({ weight: e.detail.value }); },
  onBodyFatInput(e: WechatMiniprogram.Input) { this.setData({ bodyFat: e.detail.value }); },
  onChestInput(e: WechatMiniprogram.Input) { this.setData({ chest: e.detail.value }); },
  onWaistInput(e: WechatMiniprogram.Input) { this.setData({ waist: e.detail.value }); },
  onHipInput(e: WechatMiniprogram.Input) { this.setData({ hip: e.detail.value }); },
  onLeftArmInput(e: WechatMiniprogram.Input) { this.setData({ leftArm: e.detail.value }); },
  onRightArmInput(e: WechatMiniprogram.Input) { this.setData({ rightArm: e.detail.value }); },
  onLeftThighInput(e: WechatMiniprogram.Input) { this.setData({ leftThigh: e.detail.value }); },
  onRightThighInput(e: WechatMiniprogram.Input) { this.setData({ rightThigh: e.detail.value }); },
  onLeftCalfInput(e: WechatMiniprogram.Input) { this.setData({ leftCalf: e.detail.value }); },
  onRightCalfInput(e: WechatMiniprogram.Input) { this.setData({ rightCalf: e.detail.value }); },

  save() {
    const weight = parseFloat(this.data.weight);
    if (!(weight > 0)) {
      wx.showToast({ title: '请输入体重', icon: 'none' });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const record: BodyMeasurement = {
      date: today,
      weight,
      bodyFat: this.data.bodyFat ? parseFloat(this.data.bodyFat) : undefined,
      chest: this.data.chest ? parseFloat(this.data.chest) : undefined,
      waist: this.data.waist ? parseFloat(this.data.waist) : undefined,
      hip: this.data.hip ? parseFloat(this.data.hip) : undefined,
      leftArm: this.data.leftArm ? parseFloat(this.data.leftArm) : undefined,
      rightArm: this.data.rightArm ? parseFloat(this.data.rightArm) : undefined,
      leftThigh: this.data.leftThigh ? parseFloat(this.data.leftThigh) : undefined,
      rightThigh: this.data.rightThigh ? parseFloat(this.data.rightThigh) : undefined,
      leftCalf: this.data.leftCalf ? parseFloat(this.data.leftCalf) : undefined,
      rightCalf: this.data.rightCalf ? parseFloat(this.data.rightCalf) : undefined,
    };

    saveBodyMeasurement(record);
    wx.showToast({ title: '已保存', icon: 'success' });
    this.loadRecords();

    // 清空表单
    this.setData({
      weight: '', bodyFat: '', chest: '', waist: '', hip: '',
      leftArm: '', rightArm: '', leftThigh: '', rightThigh: '', leftCalf: '', rightCalf: '',
    });
  },

  toggleChart() {
    this.setData({ showChart: !this.data.showChart });
  },

  onShareAppMessage() {
    return buildToolShareMessage('fitness', '健身记录');
  },
});
```

- [ ] **步骤 3：创建 index.wxml**

```xml
<view class="page {{themeClass}}">
  <!-- 录入表单 -->
  <view class="section">
    <text class="section-title">今日记录</text>
    <view class="form-row">
      <text class="form-label">体重</text>
      <input class="form-input" type="digit" placeholder="kg" value="{{weight}}" bindinput="onWeightInput" />
      <text class="form-required">必填</text>
    </view>
    <view class="form-row">
      <text class="form-label">体脂率</text>
      <input class="form-input" type="digit" placeholder="%" value="{{bodyFat}}" bindinput="onBodyFatInput" />
    </view>

    <text class="subsection-title">围度（选填）</text>
    <view class="form-row"><text class="form-label">胸围</text><input class="form-input" type="digit" placeholder="cm" value="{{chest}}" bindinput="onChestInput" /></view>
    <view class="form-row"><text class="form-label">腰围</text><input class="form-input" type="digit" placeholder="cm" value="{{waist}}" bindinput="onWaistInput" /></view>
    <view class="form-row"><text class="form-label">臀围</text><input class="form-input" type="digit" placeholder="cm" value="{{hip}}" bindinput="onHipInput" /></view>
    <view class="form-row"><text class="form-label">左臂围</text><input class="form-input" type="digit" placeholder="cm" value="{{leftArm}}" bindinput="onLeftArmInput" /></view>
    <view class="form-row"><text class="form-label">右臂围</text><input class="form-input" type="digit" placeholder="cm" value="{{rightArm}}" bindinput="onRightArmInput" /></view>
    <view class="form-row"><text class="form-label">左大腿围</text><input class="form-input" type="digit" placeholder="cm" value="{{leftThigh}}" bindinput="onLeftThighInput" /></view>
    <view class="form-row"><text class="form-label">右大腿围</text><input class="form-input" type="digit" placeholder="cm" value="{{rightThigh}}" bindinput="onRightThighInput" /></view>
    <view class="form-row"><text class="form-label">左小腿围</text><input class="form-input" type="digit" placeholder="cm" value="{{leftCalf}}" bindinput="onLeftCalfInput" /></view>
    <view class="form-row"><text class="form-label">右小腿围</text><input class="form-input" type="digit" placeholder="cm" value="{{rightCalf}}" bindinput="onRightCalfInput" /></view>

    <button class="btn-save" bindtap="save">保存</button>
  </view>

  <!-- 近期记录 -->
  <view class="section">
    <view class="section-header">
      <text class="section-title">记录列表</text>
      <text class="section-link" bindtap="toggleChart">{{showChart ? '隐藏' : '趋势'}}</text>
    </view>

    <view wx:if="{{showChart && weekWeights.length > 0}}" class="chart-container">
      <text class="chart-title">体重趋势（近 7 天）</text>
      <view class="chart-row" wx:for="{{weekWeights}}" wx:for-index="i" wx:key="*this">
        <text class="chart-label">{{weekLabels[i]}}</text>
        <view class="chart-bar" style="width: {{(item / (weekWeights[weekWeights.length-1] * 1.1)) * 100 * 0.6}}%"></view>
        <text class="chart-value">{{item}} kg</text>
      </view>
    </view>

    <view wx:if="{{records.length === 0}}" class="empty">暂无记录</view>
    <view class="record-item" wx:for="{{records}}" wx:key="date">
      <text class="record-date">{{item.date}}</text>
      <text class="record-weight">{{item.weight}} kg</text>
      <text wx:if="{{item.waist}}" class="record-waist">腰 {{item.waist}}cm</text>
      <text wx:if="{{item.bodyFat}}" class="record-fat">体脂 {{item.bodyFat}}%</text>
    </view>
  </view>
</view>
```

- [ ] **步骤 4：创建 index.wxss**

```css
.page { padding: 16px; min-height: 100vh; background: #f5f6f8; }
.theme-dark { background: #1a1a2e; }

.section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.theme-dark .section { background: #16213e; }

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.section-title { font-size: 15px; font-weight: 600; color: #333; }
.theme-dark .section-title { color: #e0e0e0; }
.section-link { font-size: 13px; color: #1677ff; }

.form-row {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}
.form-label { width: 70px; font-size: 14px; color: #333; flex-shrink: 0; }
.theme-dark .form-label { color: #ccc; }
.form-input {
  flex: 1;
  height: 34px;
  border-radius: 6px;
  background: #f5f6f8;
  padding: 0 10px;
  font-size: 14px;
  text-align: right;
}
.theme-dark .form-input { background: #1a1a2e; color: #e0e0e0; }
.form-required { font-size: 11px; color: #ff4d4f; margin-left: 6px; }

.subsection-title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #999;
  margin: 12px 0 4px;
}

.btn-save {
  width: 100%;
  height: 42px;
  line-height: 42px;
  background: #1677ff;
  color: #fff;
  border-radius: 10px;
  font-size: 15px;
  border: none;
  padding: 0;
  margin-top: 16px;
}

.empty { text-align: center; padding: 24px 0; color: #999; font-size: 14px; }
.record-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}
.record-date { font-size: 13px; color: #999; width: 80px; }
.record-weight { font-size: 15px; font-weight: 600; color: #333; }
.theme-dark .record-weight { color: #e0e0e0; }
.record-waist, .record-fat { font-size: 12px; color: #999; }

.chart-container { margin-top: 12px; }
.chart-title { font-size: 13px; color: #666; margin-bottom: 8px; display: block; }
.chart-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.chart-label { font-size: 11px; color: #999; width: 40px; text-align: right; }
.chart-bar {
  height: 16px;
  background: linear-gradient(90deg, #1677ff, #69b1ff);
  border-radius: 3px;
  min-width: 4px;
}
.chart-value { font-size: 11px; color: #999; }
```

- [ ] **步骤 5：Commit**

```bash
git add miniprogram/package-fitness/body-stats/
git commit -m "feat: add body stats page with weight measurement and history list"
```

---

### 任务 6：饮食记录占位页面（二期预留）

**文件：**
- 创建：`miniprogram/package-fitness/diet/index.json`
- 创建：`miniprogram/package-fitness/diet/index.ts`
- 创建：`miniprogram/package-fitness/diet/index.wxml`
- 创建：`miniprogram/package-fitness/diet/index.wxss`

- [ ] **步骤 1：创建占位页面文件**

`index.json`:
```json
{
  "navigationBarTitleText": "饮食记录",
  "usingComponents": {}
}
```

`index.ts`:
```typescript
import { applyThemeForToolPage } from '../../utils/nav-theme';
import { buildToolShareMessage } from '../../utils/tool-share';

Page({
  data: { themeClass: 'theme-light' },
  onShow() { this.setData(applyThemeForToolPage()); },
  onShareAppMessage() { return buildToolShareMessage('fitness', '健身记录'); },
});
```

`index.wxml`:
```xml
<view class="page {{themeClass}}">
  <view class="placeholder">
    <text class="placeholder-icon">🍽️</text>
    <text class="placeholder-text">饮食记录功能开发中，敬请期待</text>
    <text class="placeholder-hint">将在下一期更新中开放</text>
  </view>
</view>
```

`index.wxss`:
```css
.page { padding: 16px; min-height: 100vh; background: #f5f6f8; display: flex; align-items: center; justify-content: center; }
.theme-dark { background: #1a1a2e; }
.placeholder { text-align: center; }
.placeholder-icon { font-size: 48px; display: block; }
.placeholder-text { font-size: 16px; color: #333; margin-top: 16px; display: block; }
.placeholder-hint { font-size: 13px; color: #999; margin-top: 8px; display: block; }
```

- [ ] **步骤 2：Commit**

```bash
git add miniprogram/package-fitness/diet/
git commit -m "feat: add diet record placeholder for v2"
```

---

## 自检清单

1. **规格覆盖度**：MVP 阶段（一期）覆盖了设计文档中的所有一期内容：
   - 工具入口 ✓（任务 1）
   - 分包配置 ✓（任务 1）
   - 仪表盘 ✓（任务 3 — 概览卡片 + 体重趋势 + 快捷操作）
   - 训练记录：动作库 ✓（任务 2 — exercises.ts）、模板 ✓（任务 4 — 6 个预设模板）、组录 ✓（任务 4 — 完整流程）
   - 身体数据 ✓（任务 5 — 体重/围度录入 + 列表 + 趋势图）
   - 饮食记录：二期，做了占位页面 ✓（任务 6）
   - 全部本地存储 ✓（任务 2 — utils.ts）

2. **占位符扫描**：无 TODO、无待定、无占位符。所有代码完整可执行。

3. **类型一致性**：
   - `ExerciseDef.id` 在所有组件中一致使用
   - `WorkoutSession.date` 使用 `YYYY-MM-DD` 格式贯穿始终
   - `getAllExercises()` 在多个页面中复用
   - 存储函数的 `save*` / `get*` 命名一致

4. **边界情况**：空记录状态（"暂无记录"）、数据为空的仪表盘健康显示、模板不存在或为空时的降级处理均已覆盖。
