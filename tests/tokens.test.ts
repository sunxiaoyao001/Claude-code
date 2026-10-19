import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'miniprogram');
const tokensPath = join(srcDir, 'styles', 'tokens.wxss');

// CLAUDE.md §7.1, value for value. --accent is pack-driven, so only its presence is checked.
const SPEC_TOKENS: Record<string, string> = {
  '--bg-0': '#0D0D0F',
  '--bg-1': '#141416',
  '--bg-2': '#1C1C20',
  '--line': '#26262A',
  '--text-0': '#F5F4F0',
  '--text-1': '#8E8E93',
  '--text-2': '#5A5A5E',
  '--font-sans': '-apple-system, "PingFang SC", "HarmonyOS Sans", "Source Han Sans SC", sans-serif',
  '--fs-hero': '34px',
  '--fs-title': '22px',
  '--fs-body': '15px',
  '--fs-caption': '12px',
  '--radius-s': '6px',
  '--radius-m': '12px',
  '--radius-l': '20px',
  '--dur-micro': '150ms',
  '--dur-base': '300ms',
  '--dur-develop': '2500ms',
  '--ease-out': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  '--tracking-display': '0.12em',
};

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const match of stripComments(css).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name && value) tokens.set(name, value.trim());
  }
  return tokens;
}

function listWxss(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listWxss(path);
    return name.endsWith('.wxss') ? [path] : [];
  });
}

describe('design tokens (CLAUDE.md §7.1)', () => {
  const css = readFileSync(tokensPath, 'utf8');
  const tokens = parseTokens(css);

  it('declares tokens on page, since WXSS has no :root', () => {
    expect(stripComments(css)).toMatch(/^\s*page\s*\{/m);
    expect(stripComments(css)).not.toContain(':root');
  });

  it.each(Object.entries(SPEC_TOKENS))('%s matches the spec', (name, expected) => {
    expect(tokens.get(name)?.toLowerCase()).toBe(expected.toLowerCase());
  });

  it('defines a default --accent colour for pages without a pack', () => {
    expect(tokens.get('--accent')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('never uses pure white or pure black (§7.6-4)', () => {
    const values = [...tokens.values()].join(' ').toLowerCase();
    expect(values).not.toMatch(/#fff\b|#ffffff\b|#000\b|#000000\b/);
  });
});

describe('page styles only reference tokens (§13-2)', () => {
  const styleFiles = listWxss(srcDir).filter((path) => path !== tokensPath);

  it.each(styleFiles.map((path) => [relative(root, path), path]))('%s has no raw colours or px values', (_label, path) => {
    const css = stripComments(readFileSync(path, 'utf8'));
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/\brgba?\(/i);
    expect(css).not.toMatch(/\b\d+(\.\d+)?px\b/);
  });
});
