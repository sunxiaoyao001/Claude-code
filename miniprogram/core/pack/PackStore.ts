// Pack registry (CLAUDE.md §5): built-in packs ship their LUT and thumbnail in the code package;
// remote packs come from a CDN manifest and fetch their files through AssetCache on first use.
// Adding a camera = one manifest entry + its files on the CDN, no code change and no release.
import type { AssetCache, ProgressFn } from './AssetCache';
import { BUILTIN_PACKS } from './builtinPacks';
import { resolvePack, type PackDefinition, type ResolvedPack } from './CameraPack';
import { SERIES_ORDER } from './SeriesProfile';

export interface RemoteManifest {
  version: number;
  packs: PackDefinition[];
}

export interface Catalog {
  packs: ResolvedPack[];
  problems: string[];
}

/** Resolves definitions, drops invalid ones and duplicates (first wins), orders by series. */
export function buildCatalog(defs: readonly PackDefinition[]): Catalog {
  const packs: ResolvedPack[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const def of defs) {
    if (seen.has(def.id)) {
      problems.push(`${def.id}: duplicate id ignored`);
      continue;
    }
    const result = resolvePack(def);
    problems.push(...result.problems);
    if (!result.pack) continue;
    seen.add(def.id);
    packs.push(result.pack);
  }
  const order = (pack: ResolvedPack) => SERIES_ORDER.indexOf(pack.series.id);
  // Array.prototype.sort is stable, so packs keep their listed order inside a series.
  packs.sort((a, b) => order(a) - order(b));
  return { packs, problems };
}

/** Checks the manifest shape; packs themselves are validated when merged. */
export function parseManifest(value: unknown): RemoteManifest | null {
  if (!value || typeof value !== 'object') return null;
  const { version, packs } = value as { version?: unknown; packs?: unknown };
  if (typeof version !== 'number' || !Array.isArray(packs)) return null;
  return { version, packs: packs as PackDefinition[] };
}

export class PackStore {
  private packs: ResolvedPack[];
  private readonly bundled: Set<string>;
  readonly problems: string[];

  constructor(private readonly cache: AssetCache | null, builtin: readonly PackDefinition[] = BUILTIN_PACKS) {
    const catalog = buildCatalog(builtin);
    this.packs = catalog.packs;
    this.problems = catalog.problems;
    this.bundled = new Set(catalog.packs.map((pack) => pack.id));
  }

  list(): readonly ResolvedPack[] {
    return this.packs;
  }

  get(id: string): ResolvedPack | undefined {
    return this.packs.find((pack) => pack.id === id);
  }

  isBundled(id: string): boolean {
    return this.bundled.has(id);
  }

  /** True when switching to the pack needs no download. */
  isReady(pack: ResolvedPack): boolean {
    if (this.bundled.has(pack.id)) return true;
    const lut = pack.assets.lut;
    return Boolean(lut && this.cache?.peek(lut));
  }

  /** Path the renderer can load the LUT from; downloads remote LUTs first. */
  async lutSource(pack: ResolvedPack, onProgress?: ProgressFn, keep: readonly string[] = []): Promise<string> {
    if (this.bundled.has(pack.id)) return `/assets/luts/${pack.filter.lut.id}.png`;
    const lut = pack.assets.lut;
    if (!lut || !this.cache) throw new Error(`${pack.id}: no LUT source`);
    return this.cache.ensure(lut, onProgress, keep);
  }

  /** Strip/library thumbnail; '' while a remote thumbnail is not cached yet. */
  thumbSource(pack: ResolvedPack): string {
    if (this.bundled.has(pack.id)) return `/assets/thumbs/${pack.id}.jpg`;
    const thumb = pack.assets.thumb;
    return (thumb && this.cache?.peek(thumb)) || '';
  }

  /** Merges a remote manifest: new ids are added, built-ins are never replaced. Returns problems. */
  addRemote(manifest: RemoteManifest): string[] {
    const fresh = manifest.packs.filter((def) => !this.bundled.has(def.id));
    const missingLut = fresh.filter((def) => !def.assets?.lut).map((def) => `${def.id}: remote pack without assets.lut`);
    const catalog = buildCatalog(fresh.filter((def) => def.assets?.lut));
    const remoteIds = new Set(catalog.packs.map((pack) => pack.id));
    const kept = this.packs.filter((pack) => !remoteIds.has(pack.id));
    const order = (pack: ResolvedPack) => SERIES_ORDER.indexOf(pack.series.id);
    this.packs = [...kept, ...catalog.packs].sort((a, b) => order(a) - order(b));
    return [...missingLut, ...catalog.problems];
  }
}

/** Downloads and parses the remote manifest. Uses downloadFile so the CDN is the only domain needed. */
export function fetchManifest(url: string): Promise<RemoteManifest> {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`manifest HTTP ${res.statusCode}`));
          return;
        }
        try {
          const text = wx.getFileSystemManager().readFileSync(res.tempFilePath, 'utf8') as string;
          const manifest = parseManifest(JSON.parse(text));
          if (manifest) resolve(manifest);
          else reject(new Error('manifest has the wrong shape'));
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      },
      fail: (error) => reject(new Error(error.errMsg)),
    });
  });
}
