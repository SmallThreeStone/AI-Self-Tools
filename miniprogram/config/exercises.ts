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
