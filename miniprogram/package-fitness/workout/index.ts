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
    totalVolume: 0 as number,
    // 历史记录
    history: [] as WorkoutSession[],
    showHistory: false,
    // 动作搜索
    searchKeyword: '',
    searchResults: [] as ExerciseDef[],
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
    const allTemps = [...this.data.templates, ...this.data.defaultTemplates];
    const template = allTemps.find((t) => t.id === id);
    if (!template) return;

    const exercises: WorkoutExercise[] = template.exerciseNames.map((name) => ({
      exerciseName: name,
      muscleGroup: '全身' as any,  // 简化，训练中不严格区分
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
        weightInput: '',
        repsInput: '',
        noteInput: '',
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
    this.setData({ state: 'completed' });
    wx.showToast({ title: '训练已保存', icon: 'success' });
  },

  newWorkout() {
    this.onLoad();
    this.setData({ state: 'idle', activeTemplate: null });
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
    const detail = session.exercises.map((ex) =>
      `${ex.exerciseName}: ${ex.sets.map((s) => `${s.weight}kg×${s.reps}`).join(', ')}`
    ).join('\n');
    wx.showModal({
      title: session.templateName + ' ' + session.date,
      content: `总组数: ${session.totalSets}\n总容量: ${session.totalVolume}kg\n\n${detail}`,
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
