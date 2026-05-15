import { applyThemeForToolPage } from '../../utils/nav-theme';
import { buildToolShareMessage } from '../../utils/tool-share';
import {
  getWorkoutSessions,
  saveWorkoutSession,
  getCustomExercises,
  getExerciseHistory,
} from '../utils';
import { getAllExercises } from '../../config/exercises';
import type { WorkoutSession, WorkoutExercise, WorkoutSet, ExerciseDef } from '../types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

Page({
  data: {
    themeClass: 'theme-light',
    state: 'browse' as 'browse' | 'select' | 'active' | 'completed',
    // 动作浏览器 - 肌群树
    muscleTree: [
      { name: '胸', expanded: true, children: ['上胸', '中胸', '下胸'] },
      { name: '背', expanded: false, children: ['宽度', '厚度'] },
      { name: '肩', expanded: false, children: ['前束', '中束', '后束'] },
      { name: '腿', expanded: false, children: ['股四头', '股二头', '臀'] },
      { name: '手臂', expanded: false, children: ['二头', '三头'] },
      { name: '腹', expanded: false, children: [] as string[] },
      { name: '有氧', expanded: false, children: [] as string[] },
    ],
    selectedMuscleGroup: '胸',
    selectedSubGroup: '上胸',
    equipmentTabs: ['杠铃', '哑铃', '绳索', '悍马机', '固定器械', '徒手'],
    activeEquipmentTab: 0,
    browserExercises: [] as ExerciseDef[],
    // 选择模式
    selectedExercises: [] as WorkoutExercise[],
    // 训练模式
    exercises: [] as WorkoutExercise[],
    currentExerciseIdx: 0,
    weightInput: '',
    repsInput: '',
    noteInput: '',
    completedSets: 0,
    totalVolume: 0,
    latestSessionId: '',
    // 详情弹窗
    showDetail: false,
    detailExercise: null as ExerciseDef | null,
    _detailInSelection: false,
    // 动作历史弹窗
    showExerciseHistory: false,
    exerciseHistoryData: null as WorkoutSession[] | null,
    // 已选列表浮层（选择模式）
    showSelectedList: false,
    // 训练历史弹窗
    showHistoryList: false,
    historyList: [] as WorkoutSession[],
  },

  onShow() {
    this.setData(applyThemeForToolPage());
  },

  onLoad() {
    this._refreshBrowser();
  },

  // ===== 动作浏览器 =====
  _refreshBrowser() {
    const { selectedSubGroup, equipmentTabs, activeEquipmentTab, selectedExercises } = this.data;
    const all = getAllExercises();
    let filtered = all.filter((ex) => ex.subMuscleGroup === selectedSubGroup);
    const equipment = equipmentTabs[activeEquipmentTab];
    filtered = filtered.filter((ex) => ex.equipment === equipment);
    const selectedNames = new Set(selectedExercises.map((ex) => ex.exerciseName));
    const browserExercises = filtered.map((ex) => ({
      ...ex,
      _selected: selectedNames.has(ex.name),
      _icon: ex.name.slice(0, 2),
    }));
    this.setData({ browserExercises: browserExercises as any });
  },

  toggleTreeGroup(e: WechatMiniprogram.TouchEvent) {
    const name = e.currentTarget.dataset.name as string;
    const tree = this.data.muscleTree.map((g) =>
      g.name === name ? { ...g, expanded: !g.expanded } : g
    );
    this.setData({ muscleTree: tree });
  },

  selectSubGroup(e: WechatMiniprogram.TouchEvent) {
    const subGroup = e.currentTarget.dataset.subgroup as string;
    if (subGroup === '腹' || subGroup === '有氧') {
      this.setData({
        selectedMuscleGroup: subGroup,
        selectedSubGroup: subGroup,
        activeEquipmentTab: 0,
      });
      this._refreshBrowser();
      return;
    }
    const parent = this.data.muscleTree.find(
      (g) => g.children.includes(subGroup as any)
    );
    if (!parent) return;
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

  // ===== 浏览/选择模式 =====
  startNewWorkout() {
    this.setData({ state: 'select', selectedExercises: [] });
  },

  addToSelection(e: WechatMiniprogram.TouchEvent) {
    if (this.data.state !== 'select') return;
    const name = e.currentTarget.dataset.name as string;
    if (this.data.selectedExercises.some((ex) => ex.exerciseName === name)) {
      wx.showToast({ title: '已添加', icon: 'none' });
      return;
    }
    const all = getAllExercises();
    const def = all.find((ex) => ex.name === name);
    const exercises = [...this.data.selectedExercises, {
      exerciseName: name,
      muscleGroup: def?.muscleGroup ?? '全身',
      subMuscleGroup: def?.subMuscleGroup,
      equipment: def?.equipment,
      sets: [
        { weight: 0, reps: 0, type: 'warmup' as const },
        { weight: 0, reps: 0 },
        { weight: 0, reps: 0 },
        { weight: 0, reps: 0 },
        { weight: 0, reps: 0 },
      ],
      difficulty: undefined,
    }];
    this.setData({ selectedExercises: exercises, _detailInSelection: true });
    this._refreshBrowser();
  },

  removeFromSelection(e: WechatMiniprogram.TouchEvent) {
    const idx = Number(e.currentTarget.dataset.idx);
    const exercises = [...this.data.selectedExercises];
    exercises.splice(idx, 1);
    const update: any = { selectedExercises: exercises };
    if (this.data.showDetail && this.data.detailExercise) {
      update._detailInSelection = exercises.some((ex) => ex.exerciseName === this.data.detailExercise!.name);
    }
    this.setData(update);
    this._refreshBrowser();
  },

  toggleSelectedList() {
    this.setData({ showSelectedList: !this.data.showSelectedList });
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

  // ===== 详情弹窗 =====
  showExerciseDetail(e: WechatMiniprogram.TouchEvent) {
    const name = e.currentTarget.dataset.name as string;
    const all = getAllExercises();
    const def = all.find((ex) => ex.name === name);
    if (!def) return;
    const inSelection = this.data.selectedExercises.some((ex) => ex.exerciseName === name);
    this.setData({ showDetail: true, detailExercise: def, _detailInSelection: inSelection });
  },

  closeDetail() {
    this.setData({ showDetail: false, detailExercise: null });
  },

  // ===== 动作管理（训练模式） =====
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

    const completedSets = exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.weight > 0).length, 0);
    const totalVolume = exercises.reduce((sum, ex) =>
      sum + ex.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0);

    this.setData({
      exercises, completedSets, totalVolume,
      weightInput: '', repsInput: '', noteInput: '',
    });
  },

  addEmptySet() {
    const exercises = [...this.data.exercises];
    const idx = this.data.currentExerciseIdx;
    const newSet: WorkoutSet = { weight: 0, reps: 0, type: 'normal' };
    exercises[idx] = { ...exercises[idx], sets: [...exercises[idx].sets, newSet] };
    this.setData({ exercises });
  },

  // ===== 难度评级 =====
  setDifficulty(e: WechatMiniprogram.TouchEvent) {
    const level = e.currentTarget.dataset.level as 'easy' | 'normal' | 'hard';
    const exercises = [...this.data.exercises];
    const idx = this.data.currentExerciseIdx;
    exercises[idx] = { ...exercises[idx], difficulty: level };
    this.setData({ exercises });
  },

  // ===== 动作历史 =====
  showExerciseHistory(e: WechatMiniprogram.TouchEvent) {
    const name = e.currentTarget.dataset.name as string;
    const history = getExerciseHistory(name);
    // 预计算展示字符串（WXML 不支持 .map/.find）
    const exerciseHistoryData = history.map((session) => {
      const exercise = session.exercises.find((ex) => ex.exerciseName === name);
      const setStrs = (exercise?.sets ?? [])
        .filter((s) => s.weight > 0)
        .map((s, i) => `${i + 1}. ${s.weight}kg × ${s.reps}`);
      return {
        date: session.date,
        templateName: session.templateName,
        sets: setStrs.join('  '),
      };
    });
    this.setData({ showExerciseHistory: true, exerciseHistoryData: exerciseHistoryData as any });
  },

  closeExerciseHistory() {
    this.setData({ showExerciseHistory: false, exerciseHistoryData: null });
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
      state: 'browse',
      exercises: [],
      selectedExercises: [],
      currentExerciseIdx: 0,
      weightInput: '', repsInput: '', noteInput: '',
      completedSets: 0, totalVolume: 0,
    });
    this._refreshBrowser();
  },

  // ===== 训练历史 =====
  openHistory() {
    const list = getWorkoutSessions().slice(0, 30);
    const historyList = list.map((s) => ({
      ...s,
      _nameStr: s.exercises.map((ex) => ex.exerciseName).join('、'),
    }));
    this.setData({ showHistoryList: true, historyList: historyList as any });
  },

  closeHistory() {
    this.setData({ showHistoryList: false });
  },

  viewSession(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    const session = getWorkoutSessions().find((s) => s.id === id);
    if (!session) return;
    const detail = session.exercises.map((ex) =>
      `${ex.exerciseName}: ${ex.sets.filter((s) => s.weight > 0).map((s) => `${s.weight}kg×${s.reps}`).join(', ')}`
    ).join('\n');
    wx.showModal({
      title: session.templateName + ' ' + session.date,
      content: `总组数: ${session.totalSets}\n总容量: ${session.totalVolume}kg\n\n${detail}`,
      showCancel: false,
    });
  },

  onShareAppMessage() {
    return buildToolShareMessage('fitness', '健身记录');
  },
});
