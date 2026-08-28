import type { SQLiteDatabase } from 'expo-sqlite';
import { COSMETIC_CATALOG, getCosmetic, type CosmeticCategory, type CosmeticItem } from '../data/cosmetics';

export type EconomyInventoryItem = CosmeticItem & { owned: boolean; equipped: boolean };
export type EconomyState = { balance: number; items: EconomyInventoryItem[] };

const CURRENCY = 'coin';
const listeners = new Set<() => void>();

export function subscribeEconomy(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyEconomy(): void {
  listeners.forEach((listener) => listener());
}

export async function syncEconomyRewards(db: SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR IGNORE INTO app_wallet(currency, balance, updated_at) VALUES (?, 0, ?)`,
    CURRENCY,
    now
  );
  await grantCoins(db, 'welcome', 'local-v1', 120);
  const claims = await db.getAllAsync<{ day: string; goal_id: string; reward_xp: number }>(
    `SELECT day, goal_id, reward_xp FROM app_daily_reward_claim ORDER BY claimed_at ASC`
  );
  for (const claim of claims) {
    const amount = Math.max(2, Math.min(40, Math.round(claim.reward_xp / 20)));
    await grantCoins(db, 'daily-goal', `${claim.day}:${claim.goal_id}`, amount);
  }
}

export async function grantCoins(
  db: SQLiteDatabase,
  sourceType: string,
  sourceId: string,
  amount: number
): Promise<boolean> {
  const safeAmount = Math.max(0, Math.min(100, Math.trunc(amount)));
  if (!safeAmount) return false;
  let granted = false;
  await db.withTransactionAsync(async () => {
    const now = new Date().toISOString();
    const result = await db.runAsync(
      `INSERT OR IGNORE INTO app_reward_ledger(id, source_type, source_id, amount, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      `${sourceType}:${sourceId}`,
      sourceType,
      sourceId,
      safeAmount,
      now
    );
    if (!result.changes) return;
    await db.runAsync(
      `INSERT INTO app_wallet(currency, balance, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(currency) DO UPDATE SET balance = balance + excluded.balance, updated_at = excluded.updated_at`,
      CURRENCY,
      safeAmount,
      now
    );
    granted = true;
  });
  if (granted) notifyEconomy();
  return granted;
}

export async function purchaseCosmetic(db: SQLiteDatabase, cosmeticId: string): Promise<'purchased' | 'owned' | 'insufficient' | 'unknown'> {
  const item = getCosmetic(cosmeticId);
  if (!item) return 'unknown';
  let outcome: 'purchased' | 'owned' | 'insufficient' = 'insufficient';
  await db.withTransactionAsync(async () => {
    const owned = await db.getFirstAsync<{ cosmetic_id: string }>(
      `SELECT cosmetic_id FROM app_cosmetic_inventory WHERE cosmetic_id = ?`,
      item.id
    );
    if (owned) {
      outcome = 'owned';
      return;
    }
    const now = new Date().toISOString();
    const debit = await db.runAsync(
      `UPDATE app_wallet SET balance = balance - ?, updated_at = ? WHERE currency = ? AND balance >= ?`,
      item.price,
      now,
      CURRENCY,
      item.price
    );
    if (!debit.changes) return;
    await db.runAsync(
      `INSERT INTO app_reward_ledger(id, source_type, source_id, amount, created_at) VALUES (?, 'purchase', ?, ?, ?)`,
      `purchase:${item.id}`,
      item.id,
      -item.price,
      now
    );
    await db.runAsync(
      `INSERT INTO app_cosmetic_inventory(cosmetic_id, category, acquired_at, equipped) VALUES (?, ?, ?, 0)`,
      item.id,
      item.category,
      now
    );
    outcome = 'purchased';
  });
  notifyEconomy();
  return outcome;
}

export async function equipCosmetic(db: SQLiteDatabase, cosmeticId: string): Promise<boolean> {
  const item = getCosmetic(cosmeticId);
  if (!item) return false;
  let equipped = false;
  await db.withTransactionAsync(async () => {
    const owned = await db.getFirstAsync<{ cosmetic_id: string }>(
      `SELECT cosmetic_id FROM app_cosmetic_inventory WHERE cosmetic_id = ?`,
      item.id
    );
    if (!owned) return;
    await db.runAsync(`UPDATE app_cosmetic_inventory SET equipped = 0 WHERE category = ?`, item.category);
    await db.runAsync(`UPDATE app_cosmetic_inventory SET equipped = 1 WHERE cosmetic_id = ?`, item.id);
    equipped = true;
  });
  if (equipped) notifyEconomy();
  return equipped;
}

export async function loadEquippedCosmetics(db: SQLiteDatabase): Promise<CosmeticItem[]> {
  const rows = await db.getAllAsync<{ cosmetic_id: string }>(
    `SELECT cosmetic_id FROM app_cosmetic_inventory WHERE equipped = 1 ORDER BY category ASC`
  );
  return rows.map((row) => getCosmetic(row.cosmetic_id)).filter((item): item is CosmeticItem => !!item);
}

export async function loadEconomyState(db: SQLiteDatabase): Promise<EconomyState> {
  await syncEconomyRewards(db);
  const wallet = await db.getFirstAsync<{ balance: number }>(
    `SELECT balance FROM app_wallet WHERE currency = ?`,
    CURRENCY
  );
  const inventory = await db.getAllAsync<{ cosmetic_id: string; equipped: number }>(
    `SELECT cosmetic_id, equipped FROM app_cosmetic_inventory`
  );
  const byId = new Map(inventory.map((row) => [row.cosmetic_id, row]));
  return {
    balance: Math.max(0, wallet?.balance ?? 0),
    items: COSMETIC_CATALOG.map((item) => ({
      ...item,
      owned: byId.has(item.id),
      equipped: byId.get(item.id)?.equipped === 1,
    })),
  };
}

export function groupCosmetics(items: EconomyInventoryItem[]): Record<CosmeticCategory, EconomyInventoryItem[]> {
  return {
    character: items.filter((item) => item.category === 'character'),
    palette: items.filter((item) => item.category === 'palette'),
    frame: items.filter((item) => item.category === 'frame'),
    accessory: items.filter((item) => item.category === 'accessory'),
  };
}
