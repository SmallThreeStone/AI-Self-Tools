import type { ToolDef } from '../../config/tools';

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    tool: {
      type: Object,
      value: {} as ToolDef,
    },
    favorited: {
      type: Boolean,
      value: false,
    },
    pinned: {
      type: Boolean,
      value: false,
    },
    /** 是否展示「固定到常用」（首页） */
    showPin: {
      type: Boolean,
      value: true,
    },
    tagLine: {
      type: String,
      value: '',
    },
    permissionText: {
      type: String,
      value: '',
    },
    lastUsedText: {
      type: String,
      value: '',
    },
  },

  methods: {
    onMaskTap() {
      this.triggerEvent('close');
    },
    onClose() {
      this.triggerEvent('close');
    },
    onOpen() {
      this.triggerEvent('open', { id: this.properties.tool.id });
    },
    onToggleFav() {
      this.triggerEvent('togglefav', { id: this.properties.tool.id });
    },
    onTogglePin() {
      this.triggerEvent('togglepin', { id: this.properties.tool.id });
    },
    noop() {},
  },
});
