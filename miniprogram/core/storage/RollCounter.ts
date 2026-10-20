// Each camera holds its own 36-exposure roll (CLAUDE.md §7.2): the status row counts down the frames
// left, and switching back to a camera shows where its roll was. After frame 36 a new roll is loaded.
export const EXPOSURES = 36;
const STORAGE_KEY = 'rolls.v1';

export interface RollState {
  roll: number;
  remaining: number;
}

export type RollTable = Record<string, RollState>;

export interface Advance {
  table: RollTable;
  roll: number;
  /** 1-based frame number of the shot just taken. */
  frame: number;
  /** True when this shot used up the roll and a fresh one is now loaded. */
  finished: boolean;
}

export function rollOf(table: RollTable, packId: string): RollState {
  return table[packId] ?? { roll: 1, remaining: EXPOSURES };
}

export function advanceRoll(table: RollTable, packId: string): Advance {
  const current = rollOf(table, packId);
  const frame = EXPOSURES - current.remaining + 1;
  const finished = current.remaining <= 1;
  const next: RollState = finished ? { roll: current.roll + 1, remaining: EXPOSURES } : { roll: current.roll, remaining: current.remaining - 1 };
  return { table: { ...table, [packId]: next }, roll: current.roll, frame, finished };
}

/** "07/36": frames left on the roll. */
export function formatCounter(state: RollState): string {
  return `${String(state.remaining).padStart(2, '0')}/${EXPOSURES}`;
}

export function loadRolls(): RollTable {
  try {
    const value: unknown = wx.getStorageSync(STORAGE_KEY);
    return value && typeof value === 'object' ? (value as RollTable) : {};
  } catch {
    return {};
  }
}

export function saveRolls(table: RollTable): void {
  wx.setStorageSync(STORAGE_KEY, table);
}
