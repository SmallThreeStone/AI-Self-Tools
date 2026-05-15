import { applyThemeForToolPage } from '../../utils/nav-theme';
import { buildToolShareMessage } from '../../utils/tool-share';
import {
  getWorkoutSessions,
  saveWorkoutSession,
  getCustomExercises,
} from '../utils';
import { getAllExercises } from '../../config/exercises';
import type { WorkoutSession, WorkoutExercise, WorkoutSet, ExerciseDef } from '../types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** 从历史记录中提取最常用的动作名，按频率降序，不足则用预设补齐 */
function getSuggestedExerciseNames(limit = 10): string[] {
  const sessions = getWorkoutSessions();
  const freq: Record<string, number> = {};
  for (const s of sessions) {
    for (const ex of s.exercises) {
      freq[ex.exerciseName] = (freq[ex.exerciseName] || 0) + 1;
    }
  }
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  if (sorted.length >= limit) return sorted.slice(0, limit);

  // 不足则用预设动作补齐
  const all = getAllExercises();
  const used = new Set(sorted);
  const fallback = ['平板哑铃卧推', '杠铃深蹲', '杠铃划船', '哑铃推举', '引体向上',
    '杠铃弯举', '三头下压', '爬坡走', '卷腹', '哑铃飞鸟'];
  for (const name of fallback) {
    if (sorted.length >= limit) break;
    if (!used.has(name) && all.some((e) => e.name === name)) {
      sorted.push(name);
      used.add(name);
    }
  }
  // 再用剩余预设补齐
  for (const ex of all) {
    if (sorted.length >= limit) break;
    if (!used.has(ex.name)) {
      sorted.push(ex.name);
      used.add(ex.name);
    }
  }
  return sorted;
}

Page({
  data: {
    themeClass: 'theme-light',
    state: 'active' as 'active' | 'completed',
    // 已选动作
    exercises: [] as WorkoutExercise[],
    currentExerciseIdx: 0,
    latestSessionId: '',
    // 组录入
    weightInput: '',
    repsInput: '',
    noteInput: '',
    completedSets: 0,
    totalVolume: 0,
    // 推荐动作（顶部横滚）
    suggestedExercises: [] as string[],
    // 动作搜索
    searchKeyword: '',
    searchResults: [] as ExerciseDef[],
    showSearch: false,
  },

  onShow() {
    this.setData(applyThemeForToolPage());
  },

  onLoad() {
    this.setData({
      suggestedExercises: getSuggestedExerciseNames(10),
    });
  },

  // ===== 动作管理 =====
  addExercise(e: WechatMiniprogram.TouchEvent) {
    const name = e.currentTarget.dataset.name as string;
    const exercises = [...this.data.exercises];
    // 去重
    if (exercises.some((ex) => ex.exerciseName === name)) {
      wx.showToast({ title: '该动作已在列表中', icon: 'none' });
      return;
    }
    const all = [...getAllExercises(), ...getCustomExercises()];
    const def = all.find((ex) => ex.name === name);
    exercises.push({
      exerciseName: name,
      muscleGroup: def?.muscleGroup ?? '全身' as any,
      sets: [],
    });
    // 自动切换到新动作
    this.setData({
      exercises,
      currentExerciseIdx: exercises.length - 1,
      weightInput: '',
      repsInput: '',
      noteInput: '',
    });
  },

  switchExercise(e: WechatMiniprogram.TouchEvent) {
    const idx = Number(e.currentTarget.dataset.idx);
    if (!Number.isNaN(idx) && idx >= 0 && idx < this.data.exercises.length) {
      this.setData({
        currentExerciseIdx: idx,
        weightInput: '',
        repsInput: '',
        noteInput: '',
      });
    }
  },

  removeExercise(e: WechatMiniprogram.TouchEvent) {
    const idx = Number(e.currentTarget.dataset.idx);
    if (Number.isNaN(idx)) return;
    const exercises = [...this.data.exercises];
    exercises.splice(idx, 1);
    let cur = this.data.currentExerciseIdx;
    if (exercises.length === 0) cur = 0;
    else if (cur >= exercises.length) cur = exercises.length - 1;
    this.setData({ exercises, currentExerciseIdx: cur });
  },

  // ===== 组录入 =====
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
    if (this.data.exercises.length === 0) {
      wx.showToast({ title: '请先添加动作', icon: 'none' });
      return;
    }

    const exercises = [...this.data.exercises];
    const idx = this.data.currentExerciseIdx;
    const set: WorkoutSet = { weight, reps, note: this.data.noteInput || undefined };
    exercises[idx] = { ...exercises[idx], sets: [...exercises[idx].sets, set] };

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

  // ===== 保存 & 结束 =====
  finishWorkout() {
    if (this.data.exercises.length === 0) {
      wx.showToast({ title: '还没有任何训练记录', icon: 'none' });
      return;
    }
    const session: WorkoutSession = {
      id: generateId(),
      templateName: '自由训练',
      date: new Date().toISOString().slice(0, 10),
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      exercises: this.data.exercises,
      totalSets: this.data.completedSets,
      totalVolume: this.data.totalVolume,
    };
    saveWorkoutSession(session);
    this.setData({ state: 'completed', latestSessionId: session.id });
    wx.showToast({ title: '训练已保存', icon: 'success' });
  },

  newWorkout() {
    this.setData({
      state: 'active',
      exercises: [],
      currentExerciseIdx: 0,
      weightInput: '',
      repsInput: '',
      noteInput: '',
      completedSets: 0,
      totalVolume: 0,
      suggestedExercises: getSuggestedExerciseNames(10),
    });
  },

  // ===== 动作搜索 =====
  openSearch() {
    this.setData({ showSearch: true, searchKeyword: '', searchResults: [] });
  },

  closeSearch() {
    this.setData({ showSearch: false, searchKeyword: '', searchResults: [] });
  },

  onSearchInput(e: WechatMiniprogram.Input) {
    const keyword = e.detail.value;
    if (!keyword.trim()) {
      this.setData({ searchResults: [] });
      return;
    }
    const all = getAllExercises();
    const custom = getCustomExercises();
    const results = [...all, ...custom].filter((ex) =>
      ex.name.includes(keyword) || ex.muscleGroup.includes(keyword)
    );
    this.setData({ searchResults: results.slice(0, 10), searchKeyword: keyword });
  },

  selectSearchResult(e: WechatMiniprogram.TouchEvent) {
    const name = e.currentTarget.dataset.name as string;
    const exercises = [...this.data.exercises];
    if (exercises.some((ex) => ex.exerciseName === name)) {
      wx.showToast({ title: '该动作已在列表中', icon: 'none' });
      return;
    }
    const all = [...getAllExercises(), ...getCustomExercises()];
    const def = all.find((ex) => ex.name === name);
    exercises.push({
      exerciseName: name,
      muscleGroup: def?.muscleGroup ?? '全身' as any,
      sets: [],
    });
    this.setData({
      exercises,
      currentExerciseIdx: exercises.length - 1,
      showSearch: false,
      searchKeyword: '',
      searchResults: [],
    });
  },

  onShareAppMessage() {
    return buildToolShareMessage('fitness', '健身记录');
  },
});
