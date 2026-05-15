# 训练页优化 — 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 subagent-driven-development（推荐）或 executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将训练页升级为功能完整的动作浏览器 + 专业训练记录系统，包含肌群树导航、器材 Tab 筛选、选择/浏览双模式、默认 5 组热身、难度评级、动作详情和动作历史。

**架构：** 在现有 `package-fitness/workout/` 页面内通过 state 切换（browse/select/active/completed）实现所有 UI。数据模型扩展集中在 `types.ts`，预设动作库扩展在 `config/exercises.ts`。不新增页面，所有 UI 为内联 WXML。

**技术栈：** 微信原生 + TypeScript、本地存储

**设计文档：** `产品文档/specs/2026-05-15-workout-page-optimization.md`

---

## 文件结构

```
Wechat_Mini_Program/miniprogram/
  修改:
    package-fitness/types.ts             — ExerciseDef/WorkoutSet/WorkoutExercise 数据模型扩展
    config/exercises.ts                  — 预设动作库从 45 扩至 ~80 个，增加 subMuscleGroup/equipment 字段
    package-fitness/utils.ts             — 新增 getExerciseHistory() / getExerciseMaxWeight() 查询函数
    package-fitness/workout/index.ts     — 页面逻辑重写：新增动作浏览器、选择模式、训练模式改进
    package-fitness/workout/index.wxml   — 模板重写：左树+右网格、动作详情弹窗、训练面板
    package-fitness/workout/index.wxss   — 样式重写：双栏布局、网格卡片、弹窗、Tab 栏
    package-fitness/workout/index.json   — 无需改动
```

---

### 任务 1：数据模型扩展

**文件：**
- 修改：`miniprogram/package-fitness/types.ts:1-23`
- 修改：`miniprogram/package-fitness/utils.ts:96-121`

- [ ] **步骤 1：在 types.ts 中新增 SubMuscleGroup/Equipment/SetType 类型并扩展 ExerciseDef**

在 `types.ts` 的现有 `MuscleGroup` 之后插入：

```typescript
export type SubMuscleGroup =
  | '上胸' | '中胸' | '下胸'
  | '宽度' | '厚度'
  | '前束' | '中束' | '后束'
  | '股四头' | '股二头' | '臀'
  | '二头' | '三头'
  | '腹' | '有氧';

export type Equipment =
  | '杠铃' | '哑铃' | '绳索' | '悍马机' | '固定器械' | '徒手' | '有氧器械';

export type SetType = 'warmup' | 'normal' | 'drop' | 'failure';
```

更新 `ExerciseDef` 接口：

```typescript
export interface ExerciseDef {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  subMuscleGroup: SubMuscleGroup;
  equipment: Equipment;
  type: ExerciseType;
  description?: string;
  imageUrl?: string;
  tags?: string[];
  isCustom?: boolean;
}
```

更新 `WorkoutSet`：

```typescript
export interface WorkoutSet {
  weight: number;
  reps: number;
  type?: SetType;
  note?: string;
}
```

更新 `WorkoutExercise`：

```typescript
export interface WorkoutExercise {
  exerciseName: string;
  muscleGroup: MuscleGroup;
  subMuscleGroup?: SubMuscleGroup;
  equipment?: Equipment;
  sets: WorkoutSet[];
  difficulty?: 'easy' | 'normal' | 'hard';
}
```

- [ ] **步骤 2：在 utils.ts 中新增动作历史查询函数**

```typescript
export function getExerciseHistory(exerciseName: string): WorkoutSession[] {
  return getWorkoutSessions().filter((s) =>
    s.exercises.some((ex) => ex.exerciseName === exerciseName)
  );
}

export function getExerciseMaxWeight(exerciseName: string): number {
  let max = 0;
  for (const s of getWorkoutSessions()) {
    for (const ex of s.exercises) {
      if (ex.exerciseName === exerciseName) {
        for (const set of ex.sets) {
          if (set.weight > max) max = set.weight;
        }
      }
    }
  }
  return max;
}

export function getExerciseMaxVolume(exerciseName: string): number {
  let max = 0;
  for (const s of getWorkoutSessions()) {
    for (const ex of s.exercises) {
      if (ex.exerciseName === exerciseName) {
        const vol = ex.sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
        if (vol > max) max = vol;
      }
    }
  }
  return max;
}
```

- [ ] **步骤 3：Commit**

```bash
git add miniprogram/package-fitness/types.ts miniprogram/package-fitness/utils.ts
git commit -m "feat: extend data model with subMuscleGroup, equipment, setType, and exercise history queries"
```

---

### 任务 2：预设动作库扩展

**文件：**
- 修改：`miniprogram/config/exercises.ts`

- [ ] **步骤 1：用全新数据结构替换 presetExercises**

按设计文档第六章的表格重写整个 `presetExercises` 数组，从 45 个扩展到 80 个动作，每个动作增加 `subMuscleGroup`、`equipment`、`description` 字段。

关键数据（节选格式，完整 80 条见设计文档第六章）：

```typescript
export const presetExercises: ExerciseDef[] = [
  // === 胸部 (15) ===
  { id: 'incline-bb-bench', name: '上斜杠铃卧推', muscleGroup: '胸', subMuscleGroup: '上胸', equipment: '杠铃', type: '推', imageUrl: '', tags: ['推力', '上肢'] },
  { id: 'incline-db-bench', name: '上斜哑铃卧推', muscleGroup: '胸', subMuscleGroup: '上胸', equipment: '哑铃', type: '推', imageUrl: '', tags: ['推力', '上肢'] },
  { id: 'incline-smith-bench', name: '上斜史密斯卧推', muscleGroup: '胸', subMuscleGroup: '上胸', equipment: '固定器械', type: '推' },
  { id: 'flat-bb-bench', name: '平板杠铃卧推', muscleGroup: '胸', subMuscleGroup: '中胸', equipment: '杠铃', type: '推', imageUrl: '', tags: ['推力', '上肢'] },
  { id: 'flat-db-bench', name: '平板哑铃卧推', muscleGroup: '胸', subMuscleGroup: '中胸', equipment: '哑铃', type: '推', imageUrl: '', tags: ['推力', '上肢'] },
  { id: 'hs-bench', name: '悍马机卧推', muscleGroup: '胸', subMuscleGroup: '中胸', equipment: '悍马机', type: '推' },
  { id: 'machine-bench', name: '器械卧推', muscleGroup: '胸', subMuscleGroup: '中胸', equipment: '固定器械', type: '推' },
  { id: 'decline-bb-bench', name: '下斜杠铃卧推', muscleGroup: '胸', subMuscleGroup: '下胸', equipment: '杠铃', type: '推' },
  { id: 'decline-db-bench', name: '下斜哑铃卧推', muscleGroup: '胸', subMuscleGroup: '下胸', equipment: '哑铃', type: '推' },
  { id: 'dip-chest', name: '双杠臂屈伸', muscleGroup: '胸', subMuscleGroup: '下胸', equipment: '徒手', type: '推' },
  { id: 'db-fly', name: '哑铃飞鸟', muscleGroup: '胸', subMuscleGroup: '中胸', equipment: '哑铃', type: '推' },
  { id: 'cable-fly', name: '绳索夹胸', muscleGroup: '胸', subMuscleGroup: '中胸', equipment: '绳索', type: '推' },
  { id: 'cable-cross', name: '龙门架飞鸟', muscleGroup: '胸', subMuscleGroup: '下胸', equipment: '绳索', type: '推' },
  { id: 'pushup', name: '俯卧撑', muscleGroup: '胸', subMuscleGroup: '中胸', equipment: '徒手', type: '推' },
  { id: 'wide-pushup', name: '宽距俯卧撑', muscleGroup: '胸', subMuscleGroup: '上胸', equipment: '徒手', type: '推' },
  // === 背部 (12) ===
  { id: 'pullup', name: '引体向上', muscleGroup: '背', subMuscleGroup: '宽度', equipment: '徒手', type: '拉', imageUrl: '', tags: ['拉力', '上肢'] },
  { id: 'lat-pulldown', name: '高位下拉', muscleGroup: '背', subMuscleGroup: '宽度', equipment: '绳索', type: '拉', imageUrl: '', tags: ['拉力', '上肢'] },
  { id: 'wide-seated-row', name: '宽距坐姿划船', muscleGroup: '背', subMuscleGroup: '宽度', equipment: '绳索', type: '拉' },
  { id: 'bb-row', name: '杠铃划船', muscleGroup: '背', subMuscleGroup: '厚度', equipment: '杠铃', type: '拉', imageUrl: '', tags: ['拉力', '上肢'] },
  { id: 'db-row', name: '哑铃划船', muscleGroup: '背', subMuscleGroup: '厚度', equipment: '哑铃', type: '拉', imageUrl: '', tags: ['拉力', '上肢'] },
  { id: 'tbar-row', name: 'T杠划船', muscleGroup: '背', subMuscleGroup: '厚度', equipment: '杠铃', type: '拉' },
  { id: 'seated-row', name: '坐姿划船', muscleGroup: '背', subMuscleGroup: '厚度', equipment: '绳索', type: '拉' },
  { id: 'one-arm-db-row', name: '单臂哑铃划船', muscleGroup: '背', subMuscleGroup: '厚度', equipment: '哑铃', type: '拉' },
  { id: 'straight-arm-pulldown', name: '直臂下压', muscleGroup: '背', subMuscleGroup: '宽度', equipment: '绳索', type: '拉' },
  { id: 'hyperextension', name: '山羊挺身', muscleGroup: '背', subMuscleGroup: '厚度', equipment: '徒手', type: '拉' },
  { id: 'hs-row', name: '悍马机划船', muscleGroup: '背', subMuscleGroup: '厚度', equipment: '悍马机', type: '拉' },
  { id: 'machine-row', name: '器械划船', muscleGroup: '背', subMuscleGroup: '厚度', equipment: '固定器械', type: '拉' },
  // === 肩部 (10) ===
  { id: 'bb-ohp', name: '杠铃推举', muscleGroup: '肩', subMuscleGroup: '前束', equipment: '杠铃', type: '推', imageUrl: '', tags: ['推力', '上肢'] },
  { id: 'db-ohp', name: '哑铃推举', muscleGroup: '肩', subMuscleGroup: '前束', equipment: '哑铃', type: '推', imageUrl: '', tags: ['推力', '上肢'] },
  { id: 'arnold-press', name: '阿诺德推举', muscleGroup: '肩', subMuscleGroup: '前束', equipment: '哑铃', type: '推' },
  { id: 'smith-ohp', name: '史密斯推举', muscleGroup: '肩', subMuscleGroup: '前束', equipment: '固定器械', type: '推' },
  { id: 'lat-raise', name: '侧平举', muscleGroup: '肩', subMuscleGroup: '中束', equipment: '哑铃', type: '推', imageUrl: '', tags: ['推力', '上肢'] },
  { id: 'upright-row', name: '杠铃提拉', muscleGroup: '肩', subMuscleGroup: '中束', equipment: '杠铃', type: '推' },
  { id: 'cable-lat-raise', name: '绳索侧平举', muscleGroup: '肩', subMuscleGroup: '中束', equipment: '绳索', type: '推' },
  { id: 'face-pull', name: '面拉', muscleGroup: '肩', subMuscleGroup: '后束', equipment: '绳索', type: '拉', imageUrl: '', tags: ['拉力', '上肢'] },
  { id: 'reverse-fly', name: '反向飞鸟', muscleGroup: '肩', subMuscleGroup: '后束', equipment: '固定器械', type: '拉' },
  { id: 'pec-reverse-fly', name: '蝴蝶机反向飞鸟', muscleGroup: '肩', subMuscleGroup: '后束', equipment: '固定器械', type: '拉' },
  // === 腿部 (12) ===
  { id: 'bb-squat', name: '杠铃深蹲', muscleGroup: '腿', subMuscleGroup: '股四头', equipment: '杠铃', type: '腿', imageUrl: '', tags: ['腿部', '复合'] },
  { id: 'front-squat', name: '前蹲', muscleGroup: '腿', subMuscleGroup: '股四头', equipment: '杠铃', type: '腿' },
  { id: 'leg-press', name: '腿举', muscleGroup: '腿', subMuscleGroup: '股四头', equipment: '固定器械', type: '腿', imageUrl: '', tags: ['腿部', '推'] },
  { id: 'leg-extension', name: '腿屈伸', muscleGroup: '腿', subMuscleGroup: '股四头', equipment: '固定器械', type: '腿' },
  { id: 'bulgarian-split-squat', name: '保加利亚分腿蹲', muscleGroup: '腿', subMuscleGroup: '股四头', equipment: '哑铃', type: '腿' },
  { id: 'goblet-squat', name: '高脚杯深蹲', muscleGroup: '腿', subMuscleGroup: '股四头', equipment: '哑铃', type: '腿' },
  { id: 'rdl', name: '罗马尼亚硬拉', muscleGroup: '腿', subMuscleGroup: '股二头', equipment: '杠铃', type: '拉', imageUrl: '', tags: ['拉力', '下肢'] },
  { id: 'leg-curl', name: '腿弯举', muscleGroup: '腿', subMuscleGroup: '股二头', equipment: '固定器械', type: '腿' },
  { id: 'machine-leg-curl', name: '器械腿弯举', muscleGroup: '腿', subMuscleGroup: '股二头', equipment: '固定器械', type: '腿' },
  { id: 'hip-thrust', name: '臀推', muscleGroup: '腿', subMuscleGroup: '臀', equipment: '杠铃', type: '推' },
  { id: 'glute-bridge', name: '臀桥', muscleGroup: '腿', subMuscleGroup: '臀', equipment: '徒手', type: '推' },
  { id: 'single-glute-bridge', name: '单腿臀推', muscleGroup: '腿', subMuscleGroup: '臀', equipment: '哑铃', type: '推' },
  // === 手臂 (10) ===
  { id: 'bb-curl', name: '杠铃弯举', muscleGroup: '手臂', subMuscleGroup: '二头', equipment: '杠铃', type: '拉', imageUrl: '', tags: ['拉力', '手臂'] },
  { id: 'db-curl', name: '哑铃弯举', muscleGroup: '手臂', subMuscleGroup: '二头', equipment: '哑铃', type: '拉' },
  { id: 'preacher-curl', name: '牧师凳弯举', muscleGroup: '手臂', subMuscleGroup: '二头', equipment: '固定器械', type: '拉' },
  { id: 'hammer-curl', name: '锤式弯举', muscleGroup: '手臂', subMuscleGroup: '二头', equipment: '哑铃', type: '拉' },
  { id: 'cable-curl', name: '绳索弯举', muscleGroup: '手臂', subMuscleGroup: '二头', equipment: '绳索', type: '拉' },
  { id: 'tricep-pushdown', name: '三头下压', muscleGroup: '手臂', subMuscleGroup: '三头', equipment: '绳索', type: '推', imageUrl: '', tags: ['推力', '手臂'] },
  { id: 'close-grip-bench', name: '窄距卧推', muscleGroup: '手臂', subMuscleGroup: '三头', equipment: '杠铃', type: '推' },
  { id: 'french-press', name: '法式弯举', muscleGroup: '手臂', subMuscleGroup: '三头', equipment: '哑铃', type: '推' },
  { id: 'overhead-extension', name: '颈后臂屈伸', muscleGroup: '手臂', subMuscleGroup: '三头', equipment: '哑铃', type: '推' },
  { id: 'dip-tricep', name: '双杠臂屈伸（三头版）', muscleGroup: '手臂', subMuscleGroup: '三头', equipment: '徒手', type: '推' },
  // === 核心 (6) ===
  { id: 'crunch', name: '卷腹', muscleGroup: '腹', subMuscleGroup: '腹', equipment: '徒手', type: '核心' },
  { id: 'hanging-leg-raise', name: '悬垂举腿', muscleGroup: '腹', subMuscleGroup: '腹', equipment: '徒手', type: '核心' },
  { id: 'plank', name: '平板支撑', muscleGroup: '腹', subMuscleGroup: '腹', equipment: '徒手', type: '核心', imageUrl: '', tags: ['核心', '静态'] },
  { id: 'russian-twist', name: '俄罗斯转体', muscleGroup: '腹', subMuscleGroup: '腹', equipment: '徒手', type: '核心' },
  { id: 'cable-crunch', name: '绳索卷腹', muscleGroup: '腹', subMuscleGroup: '腹', equipment: '绳索', type: '核心' },
  { id: 'machine-crunch', name: '器械卷腹', muscleGroup: '腹', subMuscleGroup: '腹', equipment: '固定器械', type: '核心' },
  // === 有氧 (6) ===
  { id: 'incline-walk', name: '爬坡走', muscleGroup: '有氧', subMuscleGroup: '有氧', equipment: '有氧器械', type: '有氧' },
  { id: 'running', name: '跑步', muscleGroup: '有氧', subMuscleGroup: '有氧', equipment: '有氧器械', type: '有氧' },
  { id: 'cycling', name: '单车', muscleGroup: '有氧', subMuscleGroup: '有氧', equipment: '有氧器械', type: '有氧' },
  { id: 'rowing', name: '划船机', muscleGroup: '有氧', subMuscleGroup: '有氧', equipment: '有氧器械', type: '有氧' },
  { id: 'elliptical', name: '椭圆机', muscleGroup: '有氧', subMuscleGroup: '有氧', equipment: '有氧器械', type: '有氧' },
  { id: 'battle-rope', name: '战绳', muscleGroup: '有氧', subMuscleGroup: '有氧', equipment: '徒手', type: '有氧' },
];
```

同时更新 `getAllExercises` 函数——它返回 `ExerciseDef[]`，新字段会自动包含，无需改动逻辑。但可能需要处理旧数据兼容（如果已有 `getCustomExercises` 存的是旧格式），在 `getCustomExercises` 读取时补默认值：

```typescript
export function getCustomExercises(): ExerciseDef[] {
  const raw = loadJSON<ExerciseDef[]>(K.CUSTOM_EXERCISES, []);
  return raw.map((ex) => ({
    ...ex,
    subMuscleGroup: ex.subMuscleGroup ?? (ex.muscleGroup === '胸' ? '中胸' : ex.muscleGroup === '背' ? '厚度' : ex.muscleGroup === '肩' ? '前束' : ex.muscleGroup === '腿' ? '股四头' : ex.muscleGroup === '臂' ? '二头' : '腹') as SubMuscleGroup,
    equipment: ex.equipment ?? '徒手' as Equipment,
  }));
}
```

注意：`MuscleGroup` 中的 `'臂'` 在新分类中改为 `'手臂'`。为了向后兼容，在 `getCustomExercises` 中做映射：旧数据中的 `'臂'` 映射到 `'手臂'`。

- [ ] **步骤 2：Commit**

```bash
git add miniprogram/config/exercises.ts miniprogram/package-fitness/utils.ts
git commit -m "feat: expand preset exercise database to 80 entries with subMuscleGroup and equipment"
```

---

### 任务 3：动作浏览器 UI（左树 + 右网格 + 器材 Tab）

**文件：**
- 重写：`miniprogram/package-fitness/workout/index.wxml`
- 重写：`miniprogram/package-fitness/workout/index.wxss`
- 重写：`miniprogram/package-fitness/workout/index.ts`

这是最大的任务，实现动作浏览器的核心 UI。

- [ ] **步骤 1：在 index.ts 中新增浏览器相关 data 和方法**

新增 data 字段：

```typescript
data: {
  themeClass: 'theme-light',
  state: 'browse' as 'browse' | 'select' | 'active' | 'completed',
  // 动作浏览器
  muscleTree: [
    { name: '胸', expanded: true, children: ['上胸', '中胸', '下胸'] },
    { name: '背', expanded: false, children: ['宽度', '厚度'] },
    { name: '肩', expanded: false, children: ['前束', '中束', '后束'] },
    { name: '腿', expanded: false, children: ['股四头', '股二头', '臀'] },
    { name: '手臂', expanded: false, children: ['二头', '三头'] },
    { name: '腹', expanded: false, children: [] as string[] },
    { name: '有氧', expanded: false, children: [] as string[] },
  ],
  selectedMuscleGroup: '胸' as string,
  selectedSubGroup: '上胸' as string,
  equipmentTabs: ['杠铃', '哑铃', '绳索', '悍马机', '固定器械', '徒手'] as string[],
  activeEquipmentTab: 0,
  browserExercises: [] as ExerciseDef[],
  // 已选动作（选择模式）
  selectedExercises: [] as WorkoutExercise[],
  // 训练模式
  currentExerciseIdx: 0,
  weightInput: '',
  repsInput: '',
  noteInput: '',
  completedSets: 0,
  totalVolume: 0,
  // 详情弹窗
  showDetail: false,
  detailExercise: null as ExerciseDef | null,
  // 动作历史
  showExerciseHistory: false,
  exerciseHistoryData: null as WorkoutSession[] | null,
  latestSessionId: '',
}
```

新增方法——树操作：

```typescript
toggleTreeGroup(e: WechatMiniprogram.TouchEvent) {
  const name = e.currentTarget.dataset.name as string;
  const tree = this.data.muscleTree.map((g) =>
    g.name === name ? { ...g, expanded: !g.expanded } : g
  );
  // 如果收起的是当前选中的主肌群，自动展开第一个
  this.setData({ muscleTree: tree });
},

selectSubGroup(e: WechatMiniprogram.TouchEvent) {
  const subGroup = e.currentTarget.dataset.subgroup as string;
  const parent = this.data.muscleTree.find(
    (g) => g.children.includes(subGroup) || (g.children.length === 0 && g.name === subGroup)
  )!;
  this.setData({
    selectedMuscleGroup: parent.name,
    selectedSubGroup: subGroup,
    activeEquipmentTab: 0,
  });
  this._refreshBrowser();
},

selectEquipmentTab(e: WechatMiniprogram.TouchEvent) {
  const idx = Number(e.currentTarget.dataset.idx);
  this.setData({ activeEquipmentTab: idx });
  this._refreshBrowser();
},
```

新增 `_refreshBrowser` 方法：

```typescript
_refreshBrowser() {
  const { selectedSubGroup, equipmentTabs, activeEquipmentTab } = this.data;
  const all = getAllExercises();
  // 先按子肌群筛选
  let filtered = all.filter((ex) => ex.subMuscleGroup === selectedSubGroup);
  // 再按器材 Tab 筛选
  const equipment = equipmentTabs[activeEquipmentTab];
  filtered = filtered.filter((ex) => ex.equipment === equipment);
  this.setData({ browserExercises: filtered });
},
```

新增浏览/选择模式方法：

```typescript
startNewWorkout() {
  this.setData({
    state: 'select',
    selectedExercises: [],
  });
},

addToSelection(e: WechatMiniprogram.TouchEvent) {
  if (this.data.state !== 'select') return;
  const name = e.currentTarget.dataset.name as string;
  const all = getAllExercises();
  const def = all.find((ex) => ex.name === name);
  if (this.data.selectedExercises.some((ex) => ex.exerciseName === name)) {
    wx.showToast({ title: '已添加', icon: 'none' });
    return;
  }
  const exercises = [...this.data.selectedExercises, {
    exerciseName: name,
    muscleGroup: def?.muscleGroup ?? '全身',
    subMuscleGroup: def?.subMuscleGroup,
    equipment: def?.equipment,
    sets: [
      { weight: 0, reps: 0, type: 'warmup' },
      { weight: 0, reps: 0 },
      { weight: 0, reps: 0 },
      { weight: 0, reps: 0 },
      { weight: 0, reps: 0 },
    ],
    difficulty: undefined,
  }];
  this.setData({ selectedExercises: exercises });
},

removeFromSelection(e: WechatMiniprogram.TouchEvent) {
  const idx = Number(e.currentTarget.dataset.idx);
  const exercises = [...this.data.selectedExercises];
  exercises.splice(idx, 1);
  this.setData({ selectedExercises: exercises });
},

beginTraining() {
  if (this.data.selectedExercises.length === 0) {
    wx.showToast({ title: '请先选择动作', icon: 'none' });
    return;
  }
  this.setData({
    state: 'active',
    exercises: this.data.selectedExercises,
    currentExerciseIdx: 0,
    weightInput: '',
    repsInput: '',
    noteInput: '',
    completedSets: 0,
    totalVolume: 0,
  });
},
```

新增详情弹窗方法：

```typescript
showExerciseDetail(e: WechatMiniprogram.TouchEvent) {
  const name = e.currentTarget.dataset.name as string;
  const all = getAllExercises();
  const def = all.find((ex) => ex.name === name);
  if (!def) return;
  this.setData({ showDetail: true, detailExercise: def });
},

closeDetail() {
  this.setData({ showDetail: false, detailExercise: null });
},
```

新增动作历史方法：

```typescript
showExerciseHistory(e: WechatMiniprogram.TouchEvent) {
  const name = e.currentTarget.dataset.name as string;
  const history = getExerciseHistory(name);
  this.setData({ showExerciseHistory: true, exerciseHistoryData: history });
},

closeExerciseHistory() {
  this.setData({ showExerciseHistory: false, exerciseHistoryData: null });
},
```

难度选择方法：

```typescript
setDifficulty(e: WechatMiniprogram.TouchEvent) {
  const level = e.currentTarget.dataset.level as 'easy' | 'normal' | 'hard';
  const exercises = [...this.data.exercises];
  const idx = this.data.currentExerciseIdx;
  exercises[idx] = { ...exercises[idx], difficulty: level };
  this.setData({ exercises });
},
```

更新 `finishWorkout` 保存难度数据。

- [ ] **步骤 2：重写 index.wxml — 动作浏览器（浏览/选择模式）**

替换为完整模板，包含：
1. **browse 状态**：左右两栏（树 + 网格）
2. **select 状态**：同上 + "+" 按钮 + 底部已选栏
3. **active 状态**：改进的训练面板（默认5组/热身/难度/新增组/动作历史）
4. **completed 状态**：不变

```xml
<view class="page {{themeClass}}">
  <!-- ===== 状态：动作浏览器（浏览/选择模式共用布局） ===== -->
  <block wx:if="{{state === 'browse' || state === 'select'}}">
    <view class="browser-header">
      <text class="browser-title">自由训练</text>
      <view class="browser-actions">
        <button class="btn-header" wx:if="{{state === 'browse'}}" bindtap="startNewWorkout">新建训练</button>
        <button class="btn-header" bindtap="openHistory">历史记录</button>
      </view>
    </view>

    <!-- 选择模式下底部已选栏 -->
    <view wx:if="{{state === 'select' && selectedExercises.length > 0}}" class="selection-bar">
      <text class="selection-text">已选 {{selectedExercises.length}} 个动作</text>
      <button class="btn-start" bindtap="beginTraining">开始训练</button>
    </view>

    <view class="browser-body" style="{{state === 'select' && selectedExercises.length > 0 ? 'padding-bottom: 60px' : ''}}">
      <!-- 左侧：肌群树 -->
      <scroll-view class="tree-panel" scroll-y>
        <view class="tree-group" wx:for="{{muscleTree}}" wx:key="name">
          <view class="tree-group-header" data-name="{{item.name}}" bindtap="toggleTreeGroup">
            <text class="tree-arrow">{{item.expanded ? '▾' : '▸'}}</text>
            <text class="tree-group-name">{{item.name}}</text>
          </view>
          <view wx:if="{{item.expanded}}" class="tree-children">
            <view class="tree-child {{selectedSubGroup === child ? 'active' : ''}}"
              wx:for="{{item.children.length > 0 ? item.children : [item.name]}}" wx:key="*this"
              data-subgroup="{{item}}" bindtap="selectSubGroup">
              <text class="tree-child-text">{{item}}</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 右侧：器材 Tab + 动作网格 -->
      <view class="browser-content">
        <scroll-view class="equipment-tabs" scroll-x enable-flex>
          <view class="equipment-tab {{activeEquipmentTab === idx ? 'active' : ''}}"
            wx:for="{{equipmentTabs}}" wx:key="*this" data-idx="{{idx}}" bindtap="selectEquipmentTab">
            <text class="tab-text">{{item}}</text>
          </view>
        </scroll-view>

        <scroll-view class="exercise-grid" scroll-y>
          <view class="grid-empty" wx:if="{{browserExercises.length === 0}}">
            <text class="empty-text">该分类暂无动作</text>
          </view>
          <view class="grid-card" wx:for="{{browserExercises}}" wx:key="id"
            data-name="{{item.name}}" bindtap="{{state === 'select' ? 'addToSelection' : 'showExerciseDetail'}}">
            <view class="card-image">{{item.name.slice(0, 2)}}</view>
            <text class="card-name">{{item.name}}</text>
            <text class="card-tag">{{item.subMuscleGroup}} · {{item.equipment}}</text>
            <view wx:if="{{state === 'select'}}" class="card-add-btn">
              <text wx:if="{{selectedExercises.some(ex => ex.exerciseName === item.name)}}" class="check-mark">✓</text>
              <text wx:else class="plus-mark">+</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </block>

  <!-- ===== 详情弹窗 ===== -->
  <block wx:if="{{showDetail && detailExercise}}">
    <view class="mask" bindtap="closeDetail"></view>
    <view class="detail-panel">
      <view class="detail-header">
        <text class="detail-title">动作详情</text>
        <text class="detail-close" bindtap="closeDetail">✕</text>
      </view>
      <view class="detail-image">{{detailExercise.name}}</view>
      <view class="detail-info">
        <text class="detail-name">{{detailExercise.name}}</text>
        <text class="detail-meta">目标肌群: {{detailExercise.subMuscleGroup}}</text>
        <text class="detail-meta">器材: {{detailExercise.equipment}}</text>
        <text class="detail-meta">类型: {{detailExercise.type}}</text>
        <text class="detail-desc" wx:if="{{detailExercise.description}}">{{detailExercise.description}}</text>
      </view>
      <button class="btn-detail-add" wx:if="{{state === 'select'}}" data-name="{{detailExercise.name}}" bindtap="addToSelection">
        {{selectedExercises.some(ex => ex.exerciseName === detailExercise.name) ? '✓ 已添加' : '+ 添加到本次训练'}}
      </button>
    </view>
  </block>

  <!-- ===== 动作历史弹窗 ===== -->
  <block wx:if="{{showExerciseHistory && exerciseHistoryData}}">
    <view class="mask" bindtap="closeExerciseHistory"></view>
    <view class="history-panel">
      <view class="detail-header">
        <text class="detail-title">动作历史</text>
        <text class="detail-close" bindtap="closeExerciseHistory">✕</text>
      </view>
      <view wx:if="{{exerciseHistoryData.length === 0}}" class="empty">暂无历史记录</view>
      <view class="history-session" wx:for="{{exerciseHistoryData}}" wx:key="id">
        <text class="history-date">{{item.date}}</text>
        <view class="history-sets">
          <text class="history-set" wx:for="{{item.exercises.find(ex => ex.exerciseName === detailExercise?.name)?.sets || []}}" wx:for-index="sIdx" wx:key="*this">
            {{sIdx + 1}}.{{item.weight}}kg × {{item.reps}}
          </text>
        </view>
      </view>
    </view>
  </block>

  <!-- ===== 状态：训练中 ===== -->
  <block wx:elif="{{state === 'active'}}">
    ...（训练面板，见下一任务）...
  </block>

  <!-- ===== 状态：训练完成 ===== -->
  <block wx:elif="{{state === 'completed'}}">
    ...（完成页，与现有一致）...
  </block>
</view>
```

- [ ] **步骤 3：重写 index.wxss — 双栏布局、网格、弹窗**

```css
/* 浏览器布局 */
.browser-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; }
.browser-title { font-size: 20px; font-weight: 700; color: #333; }
.theme-dark .browser-title { color: #e0e0e0; }
.browser-actions { display: flex; gap: 8px; }
.btn-header { height: 32px; line-height: 32px; padding: 0 14px; font-size: 13px; border-radius: 6px; background: #1677ff; color: #fff; border: none; }
.btn-header:last-child { background: transparent; color: #1677ff; border: 1px solid #d6e4ff; }

.browser-body { display: flex; gap: 12px; }

/* 左侧树 */
.tree-panel { width: 100px; flex-shrink: 0; height: calc(100vh - 140px); }
.tree-group { margin-bottom: 4px; }
.tree-group-header { display: flex; align-items: center; padding: 8px 6px; border-radius: 6px; }
.tree-arrow { font-size: 10px; color: #999; width: 16px; }
.tree-group-name { font-size: 14px; font-weight: 500; color: #333; }
.theme-dark .tree-group-name { color: #e0e0e0; }
.tree-children { margin-left: 16px; }
.tree-child { padding: 6px 8px; border-radius: 6px; margin-bottom: 2px; }
.tree-child.active { background: #e6f4ff; }
.theme-dark .tree-child.active { background: #1a3a5c; }
.tree-child-text { font-size: 13px; color: #666; }
.tree-child.active .tree-child-text { color: #1677ff; font-weight: 500; }
.theme-dark .tree-child.active .tree-child-text { color: #66aaff; }

/* 右侧内容 */
.browser-content { flex: 1; display: flex; flex-direction: column; }

/* 器材 Tab */
.equipment-tabs { white-space: nowrap; margin-bottom: 8px; }
.equipment-tab { display: inline-flex; height: 30px; padding: 0 12px; margin-right: 6px; border-radius: 6px; background: #f5f6f8; align-items: center; }
.theme-dark .equipment-tab { background: #1a1a2e; }
.equipment-tab.active { background: #1677ff; }
.tab-text { font-size: 12px; color: #666; }
.equipment-tab.active .tab-text { color: #fff; }

/* 动作网格 */
.exercise-grid { display: flex; flex-wrap: wrap; gap: 10px; padding-top: 4px; height: calc(100vh - 190px); align-content: flex-start; }
.grid-card { width: calc(50% - 5px); border-radius: 10px; background: #fff; padding: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); position: relative; }
.theme-dark .grid-card { background: #16213e; }
.card-image { height: 80px; border-radius: 6px; background: #f0f5ff; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #1677ff; margin-bottom: 8px; }
.theme-dark .card-image { background: #1a3a5c; }
.card-name { font-size: 13px; font-weight: 500; color: #333; display: block; }
.theme-dark .card-name { color: #e0e0e0; }
.card-tag { font-size: 11px; color: #999; display: block; margin-top: 2px; }
.card-add-btn { position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; border-radius: 50%; background: #1677ff; display: flex; align-items: center; justify-content: center; }
.check-mark, .plus-mark { color: #fff; font-size: 14px; font-weight: 600; }

/* 空状态 */
.grid-empty { width: 100%; display: flex; justify-content: center; padding: 40px 0; }

/* 选择栏 */
.selection-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 16px; background: #fff; border-top: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; z-index: 10; }
.theme-dark .selection-bar { background: #16213e; border-color: #2a2a3e; }
.selection-text { font-size: 14px; color: #333; }
.btn-start { height: 40px; line-height: 40px; padding: 0 24px; background: #1677ff; color: #fff; border-radius: 8px; font-size: 14px; border: none; }

/* 详情弹窗 */
.detail-panel { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-radius: 16px 16px 0 0; padding: 20px; z-index: 101; max-height: 80vh; overflow-y: auto; }
.theme-dark .detail-panel { background: #16213e; }
.detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.detail-title { font-size: 16px; font-weight: 600; color: #333; }
.detail-close { font-size: 18px; color: #999; padding: 4px; }
.detail-image { height: 160px; background: #f0f5ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #1677ff; margin-bottom: 16px; }
.detail-info { }
.detail-name { font-size: 18px; font-weight: 600; color: #333; display: block; }
.detail-meta { font-size: 13px; color: #666; margin-top: 6px; display: block; }
.detail-desc { font-size: 14px; color: #555; margin-top: 12px; line-height: 1.6; display: block; }
.btn-detail-add { width: 100%; height: 42px; line-height: 42px; background: #1677ff; color: #fff; border-radius: 10px; font-size: 15px; border: none; margin-top: 16px; }

/* 历史弹窗 */
.history-panel { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-radius: 16px 16px 0 0; padding: 20px; z-index: 101; max-height: 60vh; overflow-y: auto; }
.theme-dark .history-panel { background: #16213e; }
.history-session { padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.history-date { font-size: 13px; color: #999; display: block; }
.history-sets { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.history-set { font-size: 13px; color: #333; }

/* 选择模式已选列表弹窗 */
.selected-list { position: fixed; bottom: 60px; left: 16px; right: 16px; background: #fff; border-radius: 12px; padding: 16px; z-index: 11; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.theme-dark .selected-list { background: #16213e; }
.selected-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.selected-item-name { font-size: 14px; color: #333; }
.btn-remove-small { font-size: 12px; color: #ff4d4f; padding: 2px 6px; }
```

- [ ] **步骤 4：初始化浏览器数据**

在 `onLoad` 中调用 `_refreshBrowser()`：

```typescript
onLoad() {
  this._refreshBrowser();
},
```

- [ ] **步骤 5：Commit**

```bash
git add miniprogram/package-fitness/workout/
git commit -m "feat: implement exercise browser with left tree, equipment tabs, and exercise grid"
```

---

### 任务 4：训练模式改进（默认5组/热身/难度/新增组/历史）

**文件：**
- 修改：`miniprogram/package-fitness/workout/index.ts`
- 修改：`miniprogram/package-fitness/workout/index.wxml`
- 修改：`miniprogram/package-fitness/workout/index.wxss`

- [ ] **步骤 1：在 index.wxml 中替换训练中面板**

将 `state === 'active'` 块替换为改进后的训练面板：

```xml
<block wx:if="{{state === 'active'}}">
  <view class="training-header">
    <text class="training-title">自由训练</text>
    <text class="training-progress">已完成 {{completedSets}} 组 · 总容量 {{totalVolume}} kg</text>
  </view>

  <!-- 动作切换卡 -->
  <scroll-view class="exercise-tabs" scroll-x enable-flex>
    <view class="exercise-tab {{currentExerciseIdx === idx ? 'active' : ''}}"
      wx:for="{{exercises}}" wx:key="idx" data-idx="{{idx}}" bindtap="switchExercise">
      <text class="tab-name">{{item.exerciseName}}</text>
      <text class="tab-sets">{{item.sets.filter(s => s.weight > 0).length}}组</text>
    </view>
  </scroll-view>

  <view class="exercise-card">
    <view class="exercise-name-row">
      <text class="exercise-name">{{exercises[currentExerciseIdx].exerciseName}}</text>
      <text class="exercise-count">{{currentExerciseIdx+1}}/{{exercises.length}}</text>
    </view>

    <!-- 组列表 -->
    <view class="sets-list">
      <view class="set-row header">
        <text class="set-col">组号</text>
        <text class="set-col">重量(kg)</text>
        <text class="set-col">次数</text>
        <text class="set-col">备注</text>
      </view>
      <view class="set-row" wx:for="{{exercises[currentExerciseIdx].sets}}" wx:for-index="sIdx" wx:key="*this">
        <text class="set-col">
          <text wx:if="{{item.type === 'warmup'}}" class="warmup-badge">🔥</text>
          {{sIdx + 1}}
        </text>
        <text class="set-col">{{item.weight || '-'}}</text>
        <text class="set-col">{{item.reps || '-'}}</text>
        <text class="set-col">{{item.note || '-'}}</text>
      </view>
    </view>

    <!-- 难度评级 -->
    <view class="difficulty-row">
      <text class="difficulty-label">本组感受:</text>
      <view class="difficulty-options">
        <text class="difficulty-option {{exercises[currentExerciseIdx].difficulty === 'easy' ? 'selected' : ''}}"
          data-level="easy" bindtap="setDifficulty">○ 简单</text>
        <text class="difficulty-option {{exercises[currentExerciseIdx].difficulty === 'normal' ? 'selected' : ''}}"
          data-level="normal" bindtap="setDifficulty">● 正常</text>
        <text class="difficulty-option {{exercises[currentExerciseIdx].difficulty === 'hard' ? 'selected' : ''}}"
          data-level="hard" bindtap="setDifficulty">● 困难</text>
      </view>
    </view>

    <!-- 录入 -->
    <view class="input-row">
      <input class="set-input weight" type="digit" placeholder="重量" value="{{weightInput}}" bindinput="onWeightInput" />
      <text class="input-x">×</text>
      <input class="set-input reps" type="digit" placeholder="次数" value="{{repsInput}}" bindinput="onRepsInput" />
      <input class="set-input note" placeholder="备注" value="{{noteInput}}" bindinput="onNoteInput" />
    </view>

    <button class="btn-add" bindtap="addSet">✓ 完成本组</button>

    <!-- 新增一组 -->
    <button class="btn-add-set" bindtap="addEmptySet">+ 新增一组</button>

    <!-- 操作栏 -->
    <view class="action-row">
      <button class="btn-action" data-name="{{exercises[currentExerciseIdx].exerciseName}}" bindtap="showExerciseHistory">📊 动作历史</button>
      <button class="btn-finish" bindtap="finishWorkout">✓ 结束训练</button>
    </view>
  </view>
</block>
```

- [ ] **步骤 2：在 index.ts 中新增 addEmptySet 方法**

```typescript
addEmptySet() {
  const exercises = [...this.data.exercises];
  const idx = this.data.currentExerciseIdx;
  const newSet: WorkoutSet = { weight: 0, reps: 0, type: 'normal' };
  exercises[idx] = { ...exercises[idx], sets: [...exercises[idx].sets, newSet] };
  this.setData({ exercises });
},
```

- [ ] **步骤 3：添加训练模式相关样式**

```css
/* 动作 Tab 切换 */
.exercise-tabs { white-space: nowrap; margin-bottom: 12px; }
.exercise-tab { display: inline-flex; flex-direction: column; height: 44px; padding: 0 14px; margin-right: 6px; border-radius: 8px; background: #f5f6f8; align-items: center; justify-content: center; }
.theme-dark .exercise-tab { background: #1a1a2e; }
.exercise-tab.active { background: #e6f4ff; }
.theme-dark .exercise-tab.active { background: #1a3a5c; }
.tab-name { font-size: 13px; color: #666; }
.exercise-tab.active .tab-name { color: #1677ff; font-weight: 500; }
.tab-sets { font-size: 11px; color: #999; }

/* 热身标识 */
.warmup-badge { font-size: 12px; margin-right: 2px; }

/* 难度评级 */
.difficulty-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 10px 0; border-top: 1px solid #f0f0f0; }
.theme-dark .difficulty-row { border-color: #2a2a3e; }
.difficulty-label { font-size: 13px; color: #666; white-space: nowrap; }
.difficulty-options { display: flex; gap: 12px; }
.difficulty-option { font-size: 13px; color: #999; padding: 4px 10px; border-radius: 14px; }
.difficulty-option.selected { background: #f0f5ff; color: #1677ff; font-weight: 500; }

/* 新增一组 */
.btn-add-set { width: 100%; height: 36px; line-height: 36px; border-radius: 8px; font-size: 13px; border: 1px dashed #d6e4ff; background: transparent; color: #1677ff; margin-bottom: 8px; }

/* 底部操作行 */
.action-row { display: flex; gap: 8px; }
.btn-action { flex: 1; height: 38px; line-height: 38px; border-radius: 8px; font-size: 13px; border: 1px solid #e0e0e0; background: #fff; color: #333; padding: 0; }
```

- [ ] **步骤 4：Commit**

```bash
git add miniprogram/package-fitness/workout/
git commit -m "feat: improve training flow with default 5 sets, warmup marker, difficulty rating, and exercise history"
```

---

### 任务 5：历史记录 & 收尾

**文件：**
- 修改：`miniprogram/package-fitness/workout/index.ts`
- 修改：`miniprogram/package-fitness/workout/index.wxml`
- 修改：`miniprogram/package-fitness/workout/index.wxss`

- [ ] **步骤 1：在 index.wxml 中添加完成页和历史记录弹窗**

在 `state === 'completed'` 中添加动作明细的折叠摘要，复用现有完成页大致结构。

新增历史记录弹窗（与动作历史不同，这是训练总体历史）：

```xml
<block wx:if="{{showHistoryList}}">
  <view class="mask" bindtap="closeHistory"></view>
  <view class="history-panel">
    <view class="detail-header">
      <text class="detail-title">训练历史</text>
      <text class="detail-close" bindtap="closeHistory">✕</text>
    </view>
    <view wx:if="{{historyList.length === 0}}" class="empty">暂无记录</view>
    <view class="history-session" wx:for="{{historyList}}" wx:key="id" data-id="{{item.id}}" bindtap="viewSession">
      <text class="history-date">{{item.date}} · {{item.templateName}}</text>
      <text class="history-meta">{{item.totalSets}}组 · {{item.totalVolume}}kg</text>
      <text class="history-exercises">{{item.exercises.map(e => e.exerciseName).join('、')}}</text>
    </view>
  </view>
</block>
```

- [ ] **步骤 2：在 index.ts 中添加历史记录相关方法**

```typescript
data: {
  // ... 追加到 data 末尾
  showHistoryList: false,
  historyList: [] as WorkoutSession[],
},

openHistory() {
  const historyList = getWorkoutSessions().slice(0, 30);
  this.setData({ showHistoryList: true, historyList });
},

closeHistory() {
  this.setData({ showHistoryList: false });
},

viewSession(e: WechatMiniprogram.TouchEvent) {
  const id = e.currentTarget.dataset.id as string;
  const session = getWorkoutSessions().find((s) => s.id === id);
  if (!session) return;
  const detail = session.exercises.map((ex) =>
    `${ex.exerciseName}: ${ex.sets.filter(s => s.weight > 0).map((s) => `${s.weight}kg×${s.reps}`).join(', ')}`
  ).join('\n');
  wx.showModal({
    title: session.templateName + ' ' + session.date,
    content: `总组数: ${session.totalSets}\n总容量: ${session.totalVolume}kg\n\n${detail}`,
    showCancel: false,
  });
},
```

- [ ] **步骤 3：添加完成页总结面板样式**

```css
/* 完成页改进 */
.completed-summary { width: 100%; margin-top: 24px; }
.completed-exercise { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.completed-ex-name { font-size: 14px; font-weight: 500; color: #333; display: block; }
.completed-ex-sets { font-size: 12px; color: #999; margin-top: 4px; display: block; }

/* 历史弹窗扩展 */
.history-exercises { font-size: 12px; color: #999; margin-top: 2px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
```

- [ ] **步骤 4：Commit**

```bash
git add miniprogram/package-fitness/workout/
git commit -m "feat: add training history panel and enhanced completion summary"
```

---

### 任务 6：仪表盘适配（更新今日训练卡片引用）

**文件：**
- 修改：`miniprogram/package-fitness/index/index.ts`

当前仪表盘引用 `state: 'idle'` 等旧逻辑，需要确认无影响——页面是独立路由，workout 页面重构后仪表盘只通过 `wx.navigateTo` 跳转，不影响。只需检查 `todayWorkout` 摘要计算是否兼容新数据格式（`WorkoutSession.exercises[].difficulty` 等新字段是可选字段，不影响聚合）。

- [ ] **步骤 1：验证仪表盘兼容性**

确认 `dashboard/index.ts` 中 `getTodayWorkout` 不依赖旧数据格式。新字段全部为可选 (`?`)，无需变更。

- [ ] **步骤 2：Commit（可选，无代码变更直接跳过）**
