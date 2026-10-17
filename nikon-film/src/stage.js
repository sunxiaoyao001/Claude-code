// stage.js — sun disc + figure layer for one act. Draws into whatever context it is given.
'use strict';
const E = require('./engine');
const { ACTS } = require('./poses');
const { css, mix, view, drawFigure } = E;

// Disc colour for a theme; the 'moon' variant reads as a pale, cratered body on any hue.
function discColor(th, kind) {
  if (kind === 'moon') return th.kind === 'light' ? th.t[4] : mix(th.t[2], E.CREAM, 0.18);
  return th.disc;
}
// Draw the act's environment + figure(s). cx, cy = stage centre; U = figure unit (px).
function drawAct(ctx, name, b, th, cx, cy, U, opts = {}) {
  const act = ACTS[name](b, th);
  const st = act.stage || {};
  const s = st.figScale || 1, u = U * s;
  const dc = discColor(th, st.disc);
  const thLocal = Object.assign({}, th, { disc: dc });
  const v = view(cx + (st.figDx || 0) * U, cy + (st.figDy || 0) * U * 0 + (st.figDy || 0) * U, u, opts.f || 1);
  const vEnv = view(cx, cy, U, opts.f || 1);
  v.disc = vEnv.disc = { cx, cy, R: opts.R || U * 0.74 };
  if (act.env) act.env(ctx, st.figScale ? vEnv : v, thLocal);
  if (act.others) for (const o of act.others) {
    const vo = view(v.ox + o.dx * u, v.oy + (o.dy || 0) * u, u, v.f);
    drawFigure(ctx, vo, o.spec, mix(th.fig, dc, o.mixAmt), dc, null);
  }
  if (act.spec && !st.noFigure) drawFigure(ctx, v, act.spec, th.fig, dc, wrapProps(act.props, thLocal));
  if (act.envFront) act.envFront(ctx, st.figScale ? vEnv : v, thLocal);
  return { act, stage: st, disc: dc, view: v };
}
function wrapProps(p) { return p || null; }
function disc(ctx, th, kind, cx, cy, R) {
  ctx.fillStyle = css(discColor(th, kind)); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
}
module.exports = { drawAct, disc, discColor, ACTS };
