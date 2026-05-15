import type { ToolDef } from '../../config/tools';

Component({
  properties: {
    tool: {
      type: Object,
      value: {} as ToolDef,
    },
    favorited: {
      type: Boolean,
      value: false,
    },
  },
  methods: {
    onTap() {
      this.triggerEvent('open', { id: this.properties.tool.id });
    },
    onLongPress() {
      this.triggerEvent('detail', { id: this.properties.tool.id });
    },
  },
});
