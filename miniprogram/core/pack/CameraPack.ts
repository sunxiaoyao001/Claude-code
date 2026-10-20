// Camera pack model and the series-delta merge (CLAUDE.md §5): a pack = its series profile + the
// fields it overrides. Resolution validates the result; an invalid pack is rejected, never rendered
// half-specified. Pack definitions are plain data, so remote packs arrive as JSON with no code change.
import { validateFilterParams, type FilterParams } from './FilterParams';
import { SERIES, type SeriesId, type SeriesProfile, type UiParams } from './SeriesProfile';

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export interface RemoteAsset {
  url: string;
  sha256: string;
  bytes: number;
}

export interface PackDefinition {
  id: string;
  /** Original Chinese display name; must not contain trademarks. */
  name: string;
  /** Small caps name for the status row, e.g. "SUNNY FUN". */
  latinName: string;
  tagline: string;
  series: SeriesId;
  /** Real prototype (camera + film or process), shown as "致敬 …"; required. */
  inspiredBy: string;
  free: boolean;
  tags?: string[];
  collab?: string;
  filter?: DeepPartial<FilterParams>;
  ui?: Partial<UiParams>;
  /** Only for packs whose files live on the CDN instead of the code package. */
  assets?: { lut?: RemoteAsset; thumb?: RemoteAsset };
}

export interface ResolvedPack {
  id: string;
  name: string;
  latinName: string;
  tagline: string;
  inspiredBy: string;
  free: boolean;
  tags: string[];
  series: SeriesProfile;
  filter: FilterParams;
  ui: UiParams;
  assets: { lut?: RemoteAsset; thumb?: RemoteAsset };
}

// Trademarks the product's own names must avoid (CLAUDE.md §1, §9-4). inspiredBy may name them.
const TRADEMARKS = [
  'kodak', 'fuji', 'polaroid', 'leica', 'contax', 'portra', 'cinestill', 'tri-x', 'trix', 'ilford', 'agfa',
  'olympus', 'nikon', 'canon', 'sony', 'casio', 'ricoh', 'minolta', 'yashica', 'rollei', 'hasselblad',
  'mamiya', 'pentax', 'holga', 'lomo', 'instax', 'ektar', 'ektachrome', 'kodachrome', 'velvia', 'superia',
  'nomo', 'dazz', 'huji', 'vhs',
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Recursive merge: plain objects merge key by key; arrays and primitives in `delta` replace. */
export function deepMerge<T>(base: T, delta: DeepPartial<T> | undefined): T {
  if (delta === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(delta)) return delta as T;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(delta)) {
    if (value === undefined) continue;
    out[key] = isPlainObject(value) && isPlainObject(out[key]) ? deepMerge(out[key], value) : value;
  }
  return out as T;
}

export function findTrademarks(text: string): string[] {
  const lower = text.toLowerCase();
  return TRADEMARKS.filter((mark) => new RegExp(`(^|[^a-z])${mark}([^a-z]|$)`).test(lower));
}

export function validateDefinition(def: PackDefinition): string[] {
  const problems: string[] = [];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(def.id)) problems.push(`id "${def.id}" must be kebab-case`);
  if (!def.name.trim()) problems.push('name is empty');
  if (!def.latinName.trim()) problems.push('latinName is empty');
  if (!def.inspiredBy.trim()) problems.push('inspiredBy is required');
  if (!(def.series in SERIES)) problems.push(`unknown series "${def.series}"`);
  for (const field of ['name', 'latinName', 'tagline'] as const) {
    const marks = findTrademarks(def[field]);
    if (marks.length) problems.push(`${field} contains trademark(s): ${marks.join(', ')}`);
  }
  if (def.ui?.themeColor && !/^#[0-9a-fA-F]{6}$/.test(def.ui.themeColor)) problems.push(`ui.themeColor "${def.ui.themeColor}" is not #RRGGBB`);
  return problems;
}

export function resolvePack(def: PackDefinition): { pack: ResolvedPack | null; problems: string[] } {
  const problems = validateDefinition(def);
  const series = SERIES[def.series];
  if (!series) return { pack: null, problems };

  // Never assign into the merge result: without a delta it is the shared series profile itself.
  const merged = deepMerge(series.filter, def.filter);
  const filter: FilterParams = { ...merged, lut: { ...merged.lut, id: merged.lut.id || def.id } };
  problems.push(...validateFilterParams(filter));
  if (problems.length) return { pack: null, problems: problems.map((p) => `${def.id}: ${p}`) };

  return {
    pack: {
      id: def.id,
      name: def.name,
      latinName: def.latinName,
      tagline: def.tagline,
      inspiredBy: def.inspiredBy,
      free: def.free,
      tags: def.tags ?? [],
      series,
      filter,
      ui: { ...series.ui, ...def.ui },
      assets: def.assets ?? {},
    },
    problems: [],
  };
}
