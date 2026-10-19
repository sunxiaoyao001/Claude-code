// Dev-only overlay for real-device checks: the camera test matrix (docs/research/01-camera-baseline.md)
// and the M2 export self-check.
// Presentation only: every tap is forwarded as an `action` event with { type, value }.
Component({
  options: {
    addGlobalClass: true,
  },

  properties: {
    model: { type: Object, value: { lines: [], settings: {}, results: [] } },
  },

  data: {
    frameSizes: ['small', 'medium', 'large'],
    resolutions: ['low', 'medium', 'high'],
    qualities: ['original', 'high', 'normal'],
  },

  methods: {
    onAction(event: WechatMiniprogram.TouchEvent) {
      const { type, value } = event.currentTarget.dataset as { type?: string; value?: string };
      if (type) this.triggerEvent('action', { type, value });
    },

    noop() {
      // Keeps touchmove from reaching the viewfinder underneath.
    },
  },
});
