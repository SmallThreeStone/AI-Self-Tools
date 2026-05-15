# 健身记录模块 — 产品设计规格

## 一、概述

在现有自用工具箱小程序中新增"健身记录"工具入口，提供训练记录、身体数据、饮食记录三大功能，数据先本地存储，架构预留云端同步接口。

## 二、信息架构

```
小程序 Tab（不变: 首页 | 分类 | 我的）
  └── 工具列表 → 健身记录卡片
        └── 健身模块首页（仪表盘）
              ├── 训练记录
              ├── 身体数据
              └── 饮食记录
```

- 注册表 `config/tools.ts` 新增一条 `{ id: 'fitness', ... }`，入口出现在首页和分类页
- 分包 `package-fitness/` 承载所有健身相关页面，不增加主包体积
- 模块内部通过页面内切换（如 swiper 或顶部 tab）导航三块子功能

## 三、模块设计

### 3.1 仪表盘（首页）

进入健身模块的第一屏，功能定位为"今日快照 + 趋势摘要"。

**今日概览卡片区：**
- 训练状态：今日是否已有训练记录，有则显示"已完成 XX 组"，无则显示"今日尚未训练"
- 体重状态：今日是否已记录体重
- 饮食状态：今日已录入几餐/目标几餐

**趋势区（折线图 + 柱状图）：**
- 体重曲线：最近 7/30 天体重的变化折线
- 训练容量趋势：每日总训练容量（重量×次数 的总和）柱状图
- 热量净结余：当日摄入 vs 估算消耗的净结余

**快捷操作区：**
- "开始训练"按钮 → 进入训练记录
- "记录体重" → 快速录入今日体重
- "记录饮食" → 进入饮食记录

### 3.2 训练记录

参考训记的核心交互范式，针对四分化训练优化。

**动作库（基础数据）：**
- 内置常见健身动作（卧推、深蹲、硬拉、划船、推举、弯举等 50+ 个）
- 每个动作包含：名称、目标肌群（胸/背/肩/腿/臂/腹/有氧）、动作类型（推/拉/腿/核心/有氧）
- 用户可自定义动作，自定义动作自动进入"我的动作"
- 使用频率高的动作自动排在前面

**训练模板：**
- 预设模板：一键选择"练胸日"、"练背日"等模板
- 模板包含该日期的全部动作列表（动作名、目标组数）
- 模板可由用户自定义创建/编辑
- 每次训练基于模板启动，也可临时增删动作

**组录流程：**
1. 选择模板 → 进入训练中页面
2. 当前动作卡片：显示动作名、已完成的组
3. 快速录入：**重量(kg) + 次数**，点击"完成本组"追加记录
4. 自动切换到下一个动作
5. 可随时暂停/结束训练

**训练记录详情：**
- 一组数据：重量(kg)、次数、备注（力竭/递减/暂停等，可选）
- 一个完成组的计算方法：重量 × 次数（单组容量）
- 一次训练的汇总：总组数、总容量、各动作最大重量

**数据可视化：**
- 每个动作的"重量/次数进步曲线"（随时间推移）
- 每周训练频率（各部位训练次数）
- 每周总容量对比

**其他：**
- 训练倒计时 / 组间休息计时器（可选）
- 有氧训练单独记录模式（类型 + 时长 + 距离 + 消耗估算）

### 3.3 身体数据

**记录指标：**

| 指标 | 必填/可选 | 单位 |
|------|-----------|------|
| 体重 | 必填 | kg（保留 1 位小数） |
| 体脂率 | 可选 | % |
| 胸围 | 可选 | cm |
| 腰围 | 可选 | cm |
| 臀围 | 可选 | cm |
| 左臂围 | 可选 | cm |
| 右臂围 | 可选 | cm |
| 左大腿围 | 可选 | cm |
| 右大腿围 | 可选 | cm |
| 左小腿围 | 可选 | cm |
| 右小腿围 | 可选 | cm |

**录入体验：**
- 默认显示最新一条记录，数字键盘输入
- 自动带出日期（当天），无需手动选日期
- 体脂率不填时，如果有胸腰臀数据，估算体脂率（可选显示）
- 输入即保存，零额外操作

**数据看板：**
- 最近 7 条记录列表
- 折线图：体重周/月趋势、腰围趋势
- 自动计算：周均值、周变化、月均值、月变化
- 导出数据（JSON/CSV）

### 3.4 饮食记录

**按餐次录入：**
- 四大餐次：早餐、午餐、晚餐、加餐
- 每餐从食物库选择食物 + 填写克数
- 支持同一餐添加多个食物项

**食物库：**
- 内置常见食物 100+ 条（主食、肉类、蔬菜、水果、蛋奶、调味料等）
- 每条含：食物名、每 100g 热量、碳水、蛋白质、脂肪
- 高频食物自动进入"常用"列表
- 用户可自定义食物，自定义食物存本地/云端

**手动录入：**
- 食物库里没有的，手动输入：食物名 + 热量(kcal) + 碳水(g) + 蛋白质(g) + 脂肪(g) + 份量(g)
- 手动录入的食物自动保存为自定义食物

**自动计算：**
- 每餐汇总：总热量、总碳水量、总蛋白质量、总脂肪量
- 每日汇总：热量(kcal)、碳水(g)、蛋白质(g)、脂肪(g) + 碳蛋脂占比环形图
- 对比目标：摄入热量 vs 估算消耗（含基础代谢 + 训练消耗），显示净结余

**数据看板：**
- 今日饮食卡片（已录几餐、热量进度）
- 本周每日热量摄入趋势
- 三大营养素周均值分布

## 四、数据模型

```typescript
// 训练记录
interface WorkoutSession {
  id: string;
  templateName: string;
  date: string;           // YYYY-MM-DD
  startTime: string;
  endTime?: string;
  exercises: WorkoutExercise[];
  totalSets: number;
  totalVolume: number;    // kg
}

interface WorkoutExercise {
  exerciseName: string;
  muscleGroup: string;
  sets: WorkoutSet[];
}

interface WorkoutSet {
  weight: number;         // kg
  reps: number;
  note?: string;          // 如"力竭"、"递减"等
}

// 身体数据
interface BodyMeasurement {
  date: string;           // YYYY-MM-DD
  weight: number;         // kg
  bodyFat?: number;       // %
  chest?: number;         // cm
  waist?: number;         // cm
  hip?: number;           // cm
  leftArm?: number;       // cm
  rightArm?: number;      // cm
  leftThigh?: number;     // cm
  rightThigh?: number;    // cm
  leftCalf?: number;      // cm
  rightCalf?: number;     // cm
}

// 饮食记录
interface DietRecord {
  date: string;           // YYYY-MM-DD
  meals: Meal[];
  dailyTotal: NutritionSummary;
}

interface Meal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: FoodEntry[];
  subtotal: NutritionSummary;
}

interface FoodEntry {
  foodName: string;
  grams: number;
  nutrition: NutritionSummary;  // 按实际份量自动算
}

interface NutritionSummary {
  calories: number;       // kcal
  carbs: number;          // g
  protein: number;        // g
  fat: number;            // g
}

// 动作库
interface ExerciseDef {
  name: string;
  muscleGroup: MuscleGroup;
  type: ExerciseType;
  isCustom?: boolean;     // 用户自定义
}

// 食物库
interface FoodDef {
  name: string;
  per100g: NutritionSummary;
  isCustom?: boolean;
}
```

## 五、技术方案

### 5.1 分包结构

```
package-fitness/
  index/               ← 健身模块首页（仪表盘）
    index.ts
    index.wxml
    index.wxss
  workout/             ← 训练记录
    index.ts
    index.wxml
    index.wxss
  body-stats/          ← 身体数据
    index.ts
    index.wxml
    index.wxss
  diet/                ← 饮食记录
    index.ts
    index.wxml
    index.wxss
```

### 5.2 数据持久化

**第一期（纯本地）：**
- 使用 `wx.setStorage` / `wx.getStorage` 存储
- 键名前缀 `fitness_`，避免与小程序其他存储冲突
- 定期自动备份提示

**第二期（云端同步）：**
- 接入微信云开发（CloudBase），使用云数据库
- 数据模型与本地一致
- 首次启动同步、手动同步按钮
- 冲突策略：以最新版本为准

### 5.3 与现有架构的集成

- `config/tools.ts` 新增一条工具定义
- `app.json` 的 `subpackages` 新增 `package-fitness` 声明
- 复用现有的 `tool-card-grid` 和 `tool-row-card` 组件

## 六、产品路线（分期建议）

### 一期（MVP）
- 工具入口 + 分包配置
- 仪表盘（基础版）
- 训练记录：动作库 + 模板 + 组录（核心完整流程）
- 身体数据：体重/围度录入 + 列表/折线图
- 全部本地存储

### 二期
- 饮食记录：食物库 + 餐次录入 + 热量汇总 + 碳蛋脂环形图
- 与训练记录联动（估算消耗 → 净结余）

### 三期
- 云端同步（微信云开发）
- 模板市场 / 历史数据导出
- 更丰富的可视化（各部位训练频率、Pr 记录）

## 七、动作库预设清单（首批）

**胸部：** 平板杠铃卧推、平板哑铃卧推、上斜杠铃卧推、上斜哑铃卧推、下斜卧推、哑铃飞鸟、绳索夹胸、俯卧撑
**背部：** 引体向上、杠铃划船、哑铃划船、高位下拉、坐姿划船、直臂下压、山羊挺身
**肩部：** 杠铃推举、哑铃推举、侧平举、前平举、面拉、反向飞鸟
**手臂：** 杠铃弯举、哑铃弯举、牧师凳弯举、锤式弯举、三头下压、窄距卧推、法式弯举
**腿部：** 杠铃深蹲、前蹲、腿举、腿弯举、腿屈伸、罗马尼亚硬拉、保加利亚分腿蹲、提踵
**核心：** 平板支撑、卷腹、吊杠举腿、俄罗斯转体
**有氧：** 跑步、爬坡走、单车、划船机、椭圆机

## 八、食物库预设清单（首批约 30 条常见食物，略）

具体食物条目后续在配置文件中定义。粗略分类：主食（米饭、面条、红薯、燕麦）、肉类（鸡胸肉、牛肉、猪肉、鱼虾）、蔬菜（西兰花、菠菜、生菜、番茄）、水果（苹果、香蕉、蓝莓）、蛋奶（鸡蛋、牛奶、酸奶）、调味/其他（橄榄油、花生酱）。

## 九、UI/UX 要求

- 保持现有工具箱的设计风格
- 暗色模式跟随系统
- 输入尽量少点击，快（健身完手抖，操作要简单）
- 列表类页面支持下拉刷新
- 图表使用小程序 Canvas 或第三方轻量库（如 echarts-for-weixin 的轻量版本）
