import { buildToolShareMessage } from '../../utils/tool-share';
import { applyThemeForToolPage } from '../../utils/nav-theme';

const GRID = 20;
const HIGH_KEY = 'tool_snake_highscore_v1';
const INTRO_KEY = 'tool_snake_intro_seen_v1';

/** 整体略放慢，开局另有倒计时缓冲 */
const SPEEDS_MS = [300, 210, 130];
const SPEED_LABELS = ['慢', '标准', '快'];

/** 上右下左 */
type Dir = 0 | 1 | 2 | 3;
const DIR_VEC: { x: number; y: number }[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

function opposite(a: Dir, b: Dir): boolean {
  return (a + 2) % 4 === b;
}

function readHigh(): number {
  try {
    const v = wx.getStorageSync(HIGH_KEY);
    const n = typeof v === 'number' ? v : parseInt(String(v), 10);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function writeHigh(n: number) {
  try {
    wx.setStorageSync(HIGH_KEY, n);
  } catch {
    /* ignore */
  }
}

function palette(dark: boolean) {
  return {
    bg: dark ? '#141414' : '#ffffff',
    grid: dark ? '#262626' : '#f3f4f6',
    snake: dark ? '#4096ff' : '#1677ff',
    snakeHead: dark ? '#69b1ff' : '#0958d9',
    food: dark ? '#fa8c16' : '#fa541c',
  };
}

Page({
  data: {
    themeClass: 'theme-light',
    canvasWrapStyle: '',
    score: 0,
    highScore: 0,
    paused: false,
    playing: false,
    gameOver: false,
    newRecord: false,
    finalScore: 0,
    speedIndex: 1,
    speedOptions: SPEED_LABELS,
    /** 开局倒计时 >0 时不移动蛇 */
    countdown: 0,
  },

  timer: 0 as number,
  countdownTimer: 0 as number,
  ctx: null as WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D | null,
  logicalW: 300,
  logicalH: 300,
  cellSize: 15,
  snake: [] as { x: number; y: number }[],
  dir: 1 as Dir,
  pendingDir: null as Dir | null,
  food: { x: 0, y: 0 },
  touchStart: null as { x: number; y: number } | null,
  canvasReady: false,
  introOnce: false,

  onLoad() {
    const sys = wx.getWindowInfo?.() ?? wx.getSystemInfoSync();
    const w = sys.windowWidth || 375;
    const rpx = w / 750;
    const side = Math.floor(w - 48 * rpx * 2);
    this.setData({
      canvasWrapStyle: `height:${side}px`,
      highScore: readHigh(),
    });
  },

  onReady() {
    const query = wx.createSelectorQuery().in(this);
    query
      .select('#snakeCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const hit = res && res[0];
        if (!hit || !hit.node) return;
        const canvas = hit.node as WechatMiniprogram.Canvas;
        const ctx = canvas.getContext(
          '2d'
        ) as WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D | null;
        if (!ctx) return;
        const dpr = wx.getSystemInfoSync().pixelRatio || 1;
        const width = hit.width as number;
        const height = hit.height as number;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        this.ctx = ctx;
        this.logicalW = width;
        this.logicalH = height;
        this.cellSize = width / GRID;
        this.canvasReady = true;
        this.resetRoundState();
        this.setData({ playing: true, paused: false, gameOver: false });
        this.startCountdown();
        this.draw();
      });
  },

  onShow() {
    this.setData({
      ...applyThemeForToolPage(),
      highScore: readHigh(),
    });
    if (this.canvasReady) this.draw();
  },

  onHide() {
    this.clearCountdownTimer();
    if (this.data.countdown > 0) {
      this.setData({ countdown: 0 });
      if (this.data.playing && !this.data.gameOver) {
        this.startTimer();
        this.draw();
      }
      return;
    }
    if (this.data.playing && !this.data.gameOver) {
      this.clearTimer();
      this.setData({ paused: true });
    }
  },

  onUnload() {
    this.clearAllTimers();
  },

  /** 首轮开局倒计时结束后弹出一次玩法说明（仅未读过说明的用户） */
  maybeShowIntroAfterCountdown() {
    if (this.introOnce) return;
    try {
      if (wx.getStorageSync(INTRO_KEY)) {
        this.introOnce = true;
        return;
      }
    } catch {
      /* 存储异常时仍尝试展示一次 */
    }
    this.introOnce = true;
    wx.showModal({
      title: '玩法说明',
      content:
        '开局有几秒倒计时再开始移动。可在区域内滑动转向，或使用下方方向键。吃到食物会变长；撞墙或撞到自己则结束。得分等于吃掉的食物个数，最高分仅存本机。',
      confirmText: '知道了',
      showCancel: false,
      success: () => {
        try {
          wx.setStorageSync(INTRO_KEY, 1);
        } catch {
          /* ignore */
        }
      },
    });
  },

  clearCountdownTimer() {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = 0;
    }
  },

  startCountdown() {
    this.clearTimer();
    this.clearCountdownTimer();
    this.setData({ countdown: 3 });
    this.draw();
    const step = (remain: number) => {
      if (remain <= 0) {
        this.setData({ countdown: 0 });
        this.startTimer();
        this.draw();
        this.maybeShowIntroAfterCountdown();
        return;
      }
      this.setData({ countdown: remain });
      this.draw();
      this.countdownTimer = setTimeout(() => step(remain - 1), 1000) as unknown as number;
    };
    this.countdownTimer = setTimeout(() => step(2), 1000) as unknown as number;
  },

  onShowHelp() {
    wx.showModal({
      title: '玩法说明',
      content:
        '开局倒计时结束后蛇才会移动。滑动屏幕或点方向键转弯；暂停可随时继续。速度可在上方切换。得分不离开本机。',
      confirmText: '好的',
      showCancel: false,
    });
  },

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = 0;
    }
  },

  clearAllTimers() {
    this.clearTimer();
    this.clearCountdownTimer();
  },

  intervalMs() {
    return SPEEDS_MS[this.data.speedIndex] ?? 150;
  },

  startTimer() {
    this.clearTimer();
    this.timer = setInterval(() => this.tick(), this.intervalMs()) as unknown as number;
  },

  restartTimer() {
    if (!this.data.playing || this.data.paused || this.data.gameOver || this.data.countdown > 0)
      return;
    this.startTimer();
  },

  resetRoundState() {
    const cx = Math.floor(GRID / 2);
    const cy = Math.floor(GRID / 2);
    this.snake = [
      { x: cx + 1, y: cy },
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
    ];
    this.dir = 1;
    this.pendingDir = null;
    this.placeFood();
    this.setData({ score: 0 });
  },

  placeFood() {
    const taken = new Set(this.snake.map((p) => `${p.x},${p.y}`));
    let x = 0;
    let y = 0;
    let guard = 0;
    do {
      x = Math.floor(Math.random() * GRID);
      y = Math.floor(Math.random() * GRID);
      guard += 1;
    } while (taken.has(`${x},${y}`) && guard < 800);
    this.food = { x, y };
  },

  tick() {
    if (!this.data.playing || this.data.paused || this.data.gameOver || this.data.countdown > 0)
      return;

    let dir = this.dir;
    if (this.pendingDir !== null && !opposite(this.pendingDir, dir)) {
      dir = this.pendingDir;
      this.dir = dir;
    }
    this.pendingDir = null;

    const head = this.snake[0];
    const v = DIR_VEC[dir];
    const nh = { x: head.x + v.x, y: head.y + v.y };

    if (nh.x < 0 || nh.x >= GRID || nh.y < 0 || nh.y >= GRID) {
      this.endGame();
      return;
    }
    const hitSelf = this.snake.some((seg, i) => i > 0 && seg.x === nh.x && seg.y === nh.y);
    if (hitSelf) {
      this.endGame();
      return;
    }

    this.snake.unshift(nh);
    const ate = nh.x === this.food.x && nh.y === this.food.y;
    if (ate) {
      const score = this.data.score + 1;
      this.setData({ score });
      this.placeFood();
    } else {
      this.snake.pop();
    }
    this.draw();
  },

  endGame() {
    this.clearTimer();
    const finalScore = this.data.score;
    const prev = readHigh();
    const isNew = finalScore > prev;
    if (isNew) writeHigh(finalScore);
    this.setData({
      gameOver: true,
      playing: false,
      paused: false,
      finalScore,
      newRecord: isNew,
      highScore: Math.max(prev, finalScore),
    });
    this.draw();
  },

  draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    const dark = this.data.themeClass === 'theme-dark';
    const pal = palette(dark);
    const cs = this.cellSize;
    const { logicalW, logicalH } = this;

    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, logicalW, logicalH);

    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      const p = i * cs;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, logicalH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(logicalW, p);
      ctx.stroke();
    }

    ctx.fillStyle = pal.food;
    ctx.fillRect(this.food.x * cs + 1, this.food.y * cs + 1, cs - 2, cs - 2);

    this.snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? pal.snakeHead : pal.snake;
      const pad = i === 0 ? 1 : 2;
      ctx.fillRect(seg.x * cs + pad, seg.y * cs + pad, cs - pad * 2, cs - pad * 2);
    });

  },

  queueDir(d: Dir) {
    if (!this.data.playing || this.data.paused || this.data.gameOver || this.data.countdown > 0)
      return;
    if (opposite(d, this.dir)) return;
    this.pendingDir = d;
  },

  onTouchStart(e: WechatMiniprogram.TouchEvent) {
    const t = e.changedTouches[0] || e.touches[0];
    if (!t) return;
    this.touchStart = { x: t.clientX, y: t.clientY };
  },

  onTouchEnd(e: WechatMiniprogram.TouchEvent) {
    const start = this.touchStart;
    this.touchStart = null;
    if (!start) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.queueDir(dx > 0 ? 1 : 3);
    } else {
      this.queueDir(dy > 0 ? 2 : 0);
    }
  },

  onPadDir(e: WechatMiniprogram.TouchEvent) {
    const raw = e.currentTarget.dataset.dir;
    const d = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    if (d >= 0 && d <= 3) this.queueDir(d as Dir);
  },

  onPickSpeed(e: WechatMiniprogram.TouchEvent) {
    const raw = e.currentTarget.dataset.index;
    const idx = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    if (idx !== 0 && idx !== 1 && idx !== 2) return;
    if (idx === this.data.speedIndex) return;
    this.setData({ speedIndex: idx });
    this.restartTimer();
  },

  onTogglePause() {
    if (!this.data.playing || this.data.gameOver || this.data.countdown > 0) return;
    if (this.data.paused) {
      this.setData({ paused: false });
      this.startTimer();
      this.draw();
    } else {
      this.clearTimer();
      this.setData({ paused: true });
    }
  },

  onRestart() {
    if (!this.canvasReady) return;
    const go = () => {
      this.resetRoundState();
      this.setData({
        playing: true,
        paused: false,
        gameOver: false,
        newRecord: false,
        finalScore: 0,
      });
      this.startCountdown();
      this.draw();
    };
    if (this.data.playing && !this.data.gameOver) {
      wx.showModal({
        title: '重开一局？',
        content: '当前进度将清除。',
        confirmText: '重开',
        success: (res) => {
          if (res.confirm) go();
        },
      });
      return;
    }
    go();
  },

  onPlayAgain() {
    this.onRestart();
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onShareAppMessage() {
    return buildToolShareMessage('snake', '贪吃蛇');
  },
});
