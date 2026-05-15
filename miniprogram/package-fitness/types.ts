// ===== 训练记录 =====
export type MuscleGroup = '胸' | '背' | '肩' | '腿' | '臂' | '腹' | '有氧' | '全身';
export type ExerciseType = '推' | '拉' | '腿' | '核心' | '有氧' | '其他';

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

export interface WorkoutSet {
  weight: number;
  reps: number;
  type?: SetType;
  note?: string;
}

export interface WorkoutExercise {
  exerciseName: string;
  muscleGroup: MuscleGroup;
  subMuscleGroup?: SubMuscleGroup;
  equipment?: Equipment;
  sets: WorkoutSet[];
  difficulty?: 'easy' | 'normal' | 'hard';
}

export interface WorkoutSession {
  id: string;
  templateName: string;
  /** 日期，格式 YYYY-MM-DD */
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
  /** 日期，格式 YYYY-MM-DD */
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
