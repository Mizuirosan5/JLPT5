import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { grantCoins, purchaseCosmetic } from '../../services/economy';

function createEconomyDb(initialBalance = 0) {
  let balance = initialBalance;
  const ledger = new Set<string>();
  const inventory = new Set<string>();
  const db = {
    withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    getFirstAsync: async (sql: string, value: string) => {
      if (sql.includes('app_cosmetic_inventory')) return inventory.has(value) ? { cosmetic_id: value } : null;
      if (sql.includes('app_wallet')) return { balance };
      return null;
    },
    runAsync: async (sql: string, ...args: Array<string | number>) => {
      if (sql.includes('INSERT OR IGNORE INTO app_reward_ledger')) {
        const id = String(args[0]);
        if (ledger.has(id)) return { changes: 0 };
        ledger.add(id);
        return { changes: 1 };
      }
      if (sql.includes('INSERT INTO app_reward_ledger')) {
        ledger.add(String(args[0]));
        return { changes: 1 };
      }
      if (sql.includes('INSERT INTO app_wallet')) {
        balance += Number(args[1]);
        return { changes: 1 };
      }
      if (sql.includes('UPDATE app_wallet SET balance = balance -')) {
        const price = Number(args[0]);
        if (balance < price) return { changes: 0 };
        balance -= price;
        return { changes: 1 };
      }
      if (sql.includes('INSERT INTO app_cosmetic_inventory')) {
        inventory.add(String(args[0]));
        return { changes: 1 };
      }
      return { changes: 1 };
    },
  };
  return { db, get balance() { return balance; }, inventory, ledger };
}

describe('économie cosmétique locale', () => {
  it('crédite une source une seule fois', async () => {
    const state = createEconomyDb();
    assert.equal(await grantCoins(state.db as never, 'streak', 'five-answers', 30), true);
    assert.equal(await grantCoins(state.db as never, 'streak', 'five-answers', 30), false);
    assert.equal(state.balance, 30);
  });

  it('débite un achat une seule fois et refuse un solde négatif', async () => {
    const state = createEconomyDb(150);
    assert.equal(await purchaseCosmetic(state.db as never, 'accessory-fan'), 'purchased');
    assert.equal(state.balance, 80);
    assert.equal(await purchaseCosmetic(state.db as never, 'accessory-fan'), 'owned');
    assert.equal(state.balance, 80);
    assert.equal(await purchaseCosmetic(state.db as never, 'character-sumi'), 'insufficient');
    assert.equal(state.balance, 80);
  });
});
