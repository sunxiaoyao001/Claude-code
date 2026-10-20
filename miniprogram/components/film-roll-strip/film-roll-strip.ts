// Bottom film strip (CLAUDE.md §7.2). Presentation only: emits `select` with a pack id when a card is
// tapped or when scrolling stops with a card nearest the centre; the page owns switching and haptics.
// Snapping is done in JS because CSS scroll-snap inside scroll-view is not reliable across clients.
import type { StripItem } from '../../core/ui/stripModel';

// Scrolling counts as stopped after this long without a scroll event.
const SETTLE_MS = 140;

interface StripRect {
  left: number;
  width: number;
}

interface StripRuntime {
  targets: number[];
  scrollLeft: number;
  settleTimer: number;
  measured: boolean;
}

// Per-instance scratch state that must not go through setData.
const runtimes = new WeakMap<object, StripRuntime>();

function rt(instance: object): StripRuntime {
  let runtime = runtimes.get(instance);
  if (!runtime) {
    runtime = { targets: [], scrollLeft: 0, settleTimer: 0, measured: false };
    runtimes.set(instance, runtime);
  }
  return runtime;
}

Component({
  options: {
    addGlobalClass: true,
  },

  properties: {
    items: { type: Array, value: [] as StripItem[] },
    activeId: { type: String, value: '' },
    solid: { type: Boolean, value: false },
  },

  data: {
    scrollLeft: 0,
    animate: false,
  },

  lifetimes: {
    ready() {
      this.measure(() => this.centre(this.data.activeId, false));
    },
    detached() {
      clearTimeout(rt(this).settleTimer);
    },
  },

  observers: {
    items() {
      rt(this).measured = false;
      wx.nextTick(() => this.measure(() => this.centre(this.data.activeId, false)));
    },
    activeId(id: string) {
      if (rt(this).measured) this.centre(id, true);
    },
  },

  methods: {
    // Scroll offsets that centre each card, measured from the laid-out cards.
    measure(done: () => void) {
      this.createSelectorQuery()
        .selectAll('.strip-item').boundingClientRect()
        .select('.strip-scroll').boundingClientRect()
        .select('.strip-scroll').scrollOffset()
        .exec((results: [StripRect[] | null, StripRect | null, { scrollLeft: number } | null]) => {
          const [items, view, offset] = results;
          if (!items || !view || !offset) return;
          const scrollLeft = offset.scrollLeft;
          rt(this).targets = items.map((rect) => rect.left - view.left + scrollLeft + rect.width / 2 - view.width / 2);
          rt(this).scrollLeft = scrollLeft;
          rt(this).measured = true;
          done();
        });
    },

    centre(id: string, animate: boolean) {
      const index = (this.data.items as StripItem[]).findIndex((item) => item.id === id);
      const target = rt(this).targets[index];
      if (target === undefined) return;
      // scroll-left only applies when the bound value changes; nudge it so a repeat target still scrolls.
      const nudge = Math.abs(this.data.scrollLeft - target) < 0.01 ? 0.01 : 0;
      this.setData({ animate, scrollLeft: target + nudge });
    },

    onScroll(event: WechatMiniprogram.ScrollViewScroll) {
      rt(this).scrollLeft = event.detail.scrollLeft;
      clearTimeout(rt(this).settleTimer);
      rt(this).settleTimer = setTimeout(() => this.settle(), SETTLE_MS);
    },

    settle() {
      const { targets, scrollLeft } = rt(this);
      if (!targets.length) return;
      let nearest = 0;
      targets.forEach((target, index) => {
        if (Math.abs(target - scrollLeft) < Math.abs((targets[nearest] ?? 0) - scrollLeft)) nearest = index;
      });
      const item = (this.data.items as StripItem[])[nearest];
      if (!item) return;
      if (Math.abs((targets[nearest] ?? 0) - scrollLeft) > 1) this.centre(item.id, true);
      if (item.id !== this.data.activeId) this.triggerEvent('select', { id: item.id });
    },

    onTap(event: WechatMiniprogram.TouchEvent) {
      const id = String(event.currentTarget.dataset.id ?? '');
      if (!id) return;
      this.centre(id, true);
      if (id !== this.data.activeId) this.triggerEvent('select', { id });
    },
  },
});
