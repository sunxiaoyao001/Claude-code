// .cube (Adobe/Resolve 3D LUT) reader and writer. Data order: red changes fastest, then green, then blue.

export interface Cube {
  title: string;
  size: number;
  /** size^3 RGB triples, values in [0, 1]. */
  data: Float32Array;
}

export function parseCube(text: string): Cube {
  let title = '';
  let size = 0;
  let domainMin = [0, 0, 0];
  let domainMax = [1, 1, 1];
  const values: number[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [keyword, ...rest] = line.split(/\s+/);
    switch (keyword) {
      case 'TITLE':
        title = line.slice('TITLE'.length).trim().replace(/^"|"$/g, '');
        break;
      case 'LUT_3D_SIZE':
        size = Number(rest[0]);
        break;
      case 'LUT_1D_SIZE':
        throw new Error('1D LUTs are not supported');
      case 'DOMAIN_MIN':
        domainMin = rest.map(Number);
        break;
      case 'DOMAIN_MAX':
        domainMax = rest.map(Number);
        break;
      default: {
        const triple = line.split(/\s+/).map(Number);
        if (triple.length !== 3 || triple.some((v) => !Number.isFinite(v))) throw new Error(`bad data line: "${line}"`);
        values.push(...triple);
      }
    }
  }

  if (!Number.isInteger(size) || size < 2 || size > 256) throw new Error(`invalid LUT_3D_SIZE ${size}`);
  if (values.length !== size ** 3 * 3) throw new Error(`expected ${size ** 3} entries, found ${values.length / 3}`);
  if (domainMin.some((v) => v !== 0) || domainMax.some((v) => v !== 1)) throw new Error('only DOMAIN 0..1 is supported');

  const data = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) data[i] = Math.min(1, Math.max(0, values[i] ?? 0));
  return { title, size, data };
}

export function formatCube(cube: Cube): string {
  const lines = [`TITLE "${cube.title}"`, `LUT_3D_SIZE ${cube.size}`];
  for (let i = 0; i < cube.data.length; i += 3) {
    lines.push(`${(cube.data[i] ?? 0).toFixed(6)} ${(cube.data[i + 1] ?? 0).toFixed(6)} ${(cube.data[i + 2] ?? 0).toFixed(6)}`);
  }
  return `${lines.join('\n')}\n`;
}

/** Builds a cube by sampling `look` at every lattice point. */
export function buildCube(title: string, size: number, look: (r: number, g: number, b: number) => [number, number, number]): Cube {
  const data = new Float32Array(size ** 3 * 3);
  let offset = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const out = look(r / (size - 1), g / (size - 1), b / (size - 1));
        data[offset++] = Math.min(1, Math.max(0, out[0]));
        data[offset++] = Math.min(1, Math.max(0, out[1]));
        data[offset++] = Math.min(1, Math.max(0, out[2]));
      }
    }
  }
  return { title, size, data };
}
