// Minimal WXML/WXSS -> HTML/CSS renderer for screenshots of the real page templates (no WeChat client in
// the cloud). Supports what this project's templates use: {{ }} bindings, wx:if/elif/else, wx:for,
// <block>, custom components (properties, data, observers run once) and the built-in tags as HTML.
// Events and hover-class are ignored; everything visual comes from the actual .wxml/.wxss files.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { loadComponentDefinition } from './loadTs.mjs';

const VOID_TEXT = /^\s*$/;

export function parseWxml(src) {
  const root = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  let i = 0;
  while (i < src.length) {
    if (src.startsWith('<!--', i)) {
      i = src.indexOf('-->', i) + 3;
      continue;
    }
    if (src.startsWith('</', i)) {
      const end = src.indexOf('>', i);
      const name = src.slice(i + 2, end).trim();
      while (stack.length > 1 && stack.pop().tag !== name);
      i = end + 1;
      continue;
    }
    if (src[i] === '<') {
      let j = i + 1;
      const nameMatch = /^[\w-]+/.exec(src.slice(j));
      const tag = nameMatch[0];
      j += tag.length;
      const attrs = {};
      let selfClosing = false;
      for (;;) {
        while (/\s/.test(src[j])) j++;
        if (src.startsWith('/>', j)) { selfClosing = true; j += 2; break; }
        if (src[j] === '>') { j++; break; }
        const attrMatch = /^[^\s=/>]+/.exec(src.slice(j));
        const name = attrMatch[0];
        j += name.length;
        if (src[j] === '=') {
          const quote = src[j + 1];
          const end = src.indexOf(quote, j + 2);
          attrs[name] = src.slice(j + 2, end);
          j = end + 1;
        } else {
          attrs[name] = true;
        }
      }
      const node = { tag, attrs, children: [] };
      stack.at(-1).children.push(node);
      if (!selfClosing) stack.push(node);
      i = j;
      continue;
    }
    let end = i;
    while (end < src.length && src[end] !== '<') end = src.startsWith('{{', end) ? src.indexOf('}}', end) + 2 : end + 1;
    const text = src.slice(i, end);
    if (!VOID_TEXT.test(text)) stack.at(-1).children.push({ tag: '#text', text });
    i = end;
  }
  return root;
}

function evaluate(expr, scope) {
  const proxy = new Proxy(scope, { has: () => true, get: (target, key) => (typeof key === 'symbol' ? undefined : target[key]) });
  try {
    return new Function('__scope', `with (__scope) { return (${expr}); }`)(proxy);
  } catch {
    return undefined;
  }
}

/** "{{x}}" keeps the value's type; mixed text interpolates to a string. */
function bind(value, scope) {
  if (typeof value !== 'string') return value;
  const single = /^\{\{([\s\S]*)\}\}$/.exec(value);
  if (single && !single[1].includes('}}')) return evaluate(single[1], scope);
  return value.replace(/\{\{([\s\S]*?)\}\}/g, (_, expr) => {
    const v = evaluate(expr, scope);
    return v === undefined || v === null ? '' : String(v);
  });
}

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

const FIT = { aspectFill: 'cover', aspectFit: 'contain', widthFix: 'cover', heightFix: 'cover' };

export class WxmlRenderer {
  /** `components`: tag -> component directory path without extension, e.g. ".../film-roll-strip/film-roll-strip". */
  constructor(components) {
    this.components = new Map();
    this.styles = [];
    for (const [tag, base] of Object.entries(components)) this.registerComponent(tag, base);
  }

  registerComponent(tag, base) {
    const definition = loadComponentDefinition(`${base}.ts`);
    const template = parseWxml(readFileSync(`${base}.wxml`, 'utf8'));
    const json = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
    this.components.set(tag, { definition, template });
    this.styles.push(readFileSync(`${base}.wxss`, 'utf8'));
    for (const [childTag, path] of Object.entries(json.usingComponents ?? {})) {
      if (!this.components.has(childTag)) this.registerComponent(childTag, resolve(dirname(base), '..', '..', `.${path}`));
    }
  }

  render(template, data) {
    return this.renderChildren(template.children, data);
  }

  renderChildren(children, scope) {
    let html = '';
    let chainSatisfied = false;
    for (const node of children) {
      if (node.tag === '#text') {
        html += escapeHtml(bind(node.text, scope));
        continue;
      }
      const { attrs } = node;
      if ('wx:if' in attrs) {
        chainSatisfied = Boolean(bind(attrs['wx:if'], scope));
        if (!chainSatisfied) continue;
      } else if ('wx:elif' in attrs) {
        if (chainSatisfied) continue;
        chainSatisfied = Boolean(bind(attrs['wx:elif'], scope));
        if (!chainSatisfied) continue;
      } else if ('wx:else' in attrs) {
        if (chainSatisfied) continue;
        chainSatisfied = true;
      }
      if ('wx:for' in attrs) {
        const list = bind(attrs['wx:for'], scope) ?? [];
        const itemName = attrs['wx:for-item'] ?? 'item';
        const indexName = attrs['wx:for-index'] ?? 'index';
        const rest = { ...attrs };
        delete rest['wx:for'];
        list.forEach((item, index) => {
          html += this.renderNode({ ...node, attrs: rest }, { ...scope, [itemName]: item, [indexName]: index });
        });
        continue;
      }
      html += this.renderNode(node, scope);
    }
    return html;
  }

  renderNode(node, scope) {
    const { tag, attrs } = node;
    if (tag === 'block') return this.renderChildren(node.children, scope);
    if (this.components.has(tag)) return this.renderComponent(tag, node, scope);

    const out = { class: '', style: '' };
    for (const [name, raw] of Object.entries(attrs)) {
      if (name.startsWith('wx:') || name.startsWith('bind') || name.startsWith('catch') || name.startsWith('hover-')) continue;
      const value = bind(raw, scope);
      if (name === 'hidden') {
        if (value) out.style += 'display:none;';
        continue;
      }
      out[name] = value;
    }
    const attrString = (skip = []) => Object.entries(out)
      .filter(([name, value]) => !skip.includes(name) && value !== undefined && value !== false && value !== '')
      .map(([name, value]) => (value === true ? ` ${name}` : ` ${name}="${escapeHtml(value)}"`)).join('');

    switch (tag) {
      case 'view':
      case 'button':
        return `<div${attrString()} data-wx="${tag}">${this.renderChildren(node.children, scope)}</div>`;
      case 'text':
        return `<span${attrString()}>${this.renderChildren(node.children, scope)}</span>`;
      case 'image': {
        out.style = `object-fit:${FIT[out.mode] ?? 'fill'};${out.style}`;
        return `<img${attrString(['mode'])}>`;
      }
      case 'canvas':
        return `<canvas${attrString(['type'])}></canvas>`;
      case 'scroll-view': {
        const x = out['scroll-x'] !== undefined && out['scroll-x'] !== false;
        out.style = `${x ? 'overflow-x:auto;overflow-y:hidden;' : 'overflow-y:auto;'}${out.style}`;
        return `<div${attrString(['scroll-x', 'scroll-y', 'enable-flex', 'show-scrollbar', 'scroll-left', 'scroll-with-animation'])} data-wx="scroll-view">${this.renderChildren(node.children, scope)}</div>`;
      }
      case 'camera':
        return `<div${attrString(['mode', 'device-position', 'flash', 'frame-size', 'resolution'])} data-wx="camera"></div>`;
      default:
        return `<div${attrString()} data-wx="${tag}">${this.renderChildren(node.children, scope)}</div>`;
    }
  }

  renderComponent(tag, node, scope) {
    const { definition, template } = this.components.get(tag);
    const properties = definition.properties ?? {};
    const data = { ...(definition.data ?? {}) };
    for (const [name, spec] of Object.entries(properties)) data[name] = spec.value;
    const set = [];
    for (const [rawName, raw] of Object.entries(node.attrs)) {
      if (rawName.startsWith('bind') || rawName.startsWith('catch') || rawName.startsWith('wx:')) continue;
      const name = camel(rawName);
      let value = bind(raw, scope);
      const type = properties[name]?.type;
      if (type === Number && typeof value === 'string') value = Number(value);
      if (type === Boolean && typeof value === 'string') value = value !== 'false' && value !== '';
      data[name] = value;
      set.push(name);
    }
    // Observers once, for the properties the parent set (as WeChat does on first render).
    const self = { data, properties: data, setData: (patch) => Object.assign(data, patch), triggerEvent: () => undefined, createSelectorQuery: () => ({}) };
    for (const [keys, fn] of Object.entries(definition.observers ?? {})) {
      const names = keys.split(',').map((k) => k.trim());
      if (!names.some((n) => set.includes(n))) continue;
      try {
        fn.apply(self, names.map((n) => data[n]));
      } catch {
        // Observers that need the platform (layout queries) have no effect in a static render.
      }
    }
    return `<wx-${tag} style="display:block">${this.render(template, data)}</wx-${tag}>`;
  }
}

/** Reads a .wxss file, inlining @import and adapting WeChat-only syntax to browser CSS. */
export function loadWxss(file) {
  const css = readFileSync(file, 'utf8').replace(/@import\s+"([^"]+)";/g, (_, path) => loadWxss(join(dirname(file), path)));
  return adaptCss(css);
}

export function adaptCss(css) {
  return css
    .replace(/(^|[}\s,])page(\s*[{,])/g, '$1.wx-root$2')
    .replace(/env\(safe-area-inset-bottom\)/g, 'var(--sim-safe-bottom, 0px)');
}
