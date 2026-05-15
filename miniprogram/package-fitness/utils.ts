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
    if (raw === '') return fallback;
    if (Array.isArray(fallback)) {
      return (Array.isArray(raw) ? raw : fallback) as T;
    }
    return raw as T;
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

export function getWorkoutTemplates(): WorkoutTemplate[] {
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
  const today = new Date().toISOString().slice(0, 10);
  return getWorkoutSessions().find((s) => s.date === today) ?? null;
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

export function getRecentBodyMeasurements(limit = 30): BodyMeasurement[] {
  return getBodyMeasurements().slice(0, limit);
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
