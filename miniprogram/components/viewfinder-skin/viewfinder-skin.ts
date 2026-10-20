// Viewfinder skin (CLAUDE.md §7.2): the status row (frames left · camera name · format) and the frame
// overlay drawn over the WebGL canvas. Presentation only; the page drives the swap sequence by toggling
// `black` and `linesHidden`, and types the title. Colours follow --accent, injected by the page.
import { formatGlyph } from '../../core/camera/frameLayout';
import { parseAspect } from '../../core/pack/FilterParams';

// Format glyph fits in a square of this many px (status row caption height).
const GLYPH_PX = 12;

Component({
  options: {
    addGlobalClass: true,
  },

  properties: {
    statusTop: { type: Number, value: 0 },
    statusHeight: { type: Number, value: 0 },
    /** Space to keep clear on the right for the capsule menu button, in px. */
    statusRight: { type: Number, value: 0 },
    frame: { type: Object, value: { left: 0, top: 0, width: 0, height: 0 } },
    counter: { type: String, value: '' },
    title: { type: String, value: '' },
    format: { type: String, value: '3:4' },
    black: { type: Boolean, value: false },
    linesHidden: { type: Boolean, value: false },
  },

  data: {
    glyph: formatGlyph(3 / 4, GLYPH_PX),
  },

  observers: {
    format(format: string) {
      const aspect = parseAspect(format);
      if (!Number.isNaN(aspect)) this.setData({ glyph: formatGlyph(aspect, GLYPH_PX) });
    },
  },

  methods: {
    onStatusLongPress() {
      this.triggerEvent('statuslongpress');
    },
  },
});
