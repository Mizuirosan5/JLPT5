import type { SQLiteDatabase } from 'expo-sqlite';
import type { SrsItemState, SrsItemType } from './srs';

export type MasteryStatus = 'new' | 'learning' | 'known' | 'review' | 'mastered';

export type MasteryEvidence = Pick<
  SrsItemState,
  | 'item_id'
  | 'item_type'
  | 'status'
  | 'interval_days'
  | 'due_at'
  | 'last_reviewed_at'
  | 'attempts'
  | 'correct'
  | 'wrong_streak'
  | 'correct_streak'
>;

export type MasteryView = {
  itemId: string;
  itemType: SrsItemType;
  status: MasteryStatus;
  label: string;
  attempts: number;
  correct: number;
  accuracy: number | null;
  dueAt: string | null;
  isDue: boolean;
};

export type MasteryItemRef = { itemId: string; itemType: SrsItemType };

const MASTERY_LABELS: Record<MasteryStatus, string> = {
  new: 'Nouveau',
  learning: 'En apprentissage',
  known: 'Connu',
  review: 'À revoir',
  mastered: 'Maîtrisé',
};

export const MASTERY_COLORS: Record<MasteryStatus, string> = {
  new: '#9AA5A8',
  learning: '#D4A72C',
  known: '#2E7772',
  review: '#C4474F',
  mastered: '#173E46',
};

export function getMasteryLabel(status: MasteryStatus): string {
  return MASTERY_LABELS[status];
}

export function getMasteryColorToken(status: MasteryStatus): string {
  return MASTERY_COLORS[status];
}

export function deriveMasteryStatus(evidence: MasteryEvidence | null, now = new Date()): MasteryStatus {
  if (!evidence || evidence.attempts <= 0) return 'new';

  const accuracy = evidence.correct / Math.max(1, evidence.attempts);
  const dueTime = Date.parse(evidence.due_at);
  const isDue = Number.isFinite(dueTime) && dueTime <= now.getTime();

  if (evidence.status === 'fragile' || evidence.wrong_streak > 0 || accuracy < 0.7 || isDue) return 'review';
  if (evidence.attempts < 3) return 'learning';
  if (
    evidence.attempts >= 5 &&
    accuracy >= 0.9 &&
    evidence.correct_streak >= 2 &&
    evidence.interval_days >= 3 &&
    (evidence.status === 'solid' || evidence.status === 'mastered')
  ) {
    return 'mastered';
  }
  if (accuracy >= 0.7) return 'known';
  return 'learning';
}

export function buildMasteryView(
  ref: MasteryItemRef,
  evidence: MasteryEvidence | null,
  now = new Date(),
): MasteryView {
  const status = deriveMasteryStatus(evidence, now);
  const attempts = evidence?.attempts ?? 0;
  const correct = evidence?.correct ?? 0;
  const dueTime = evidence ? Date.parse(evidence.due_at) : Number.NaN;
  return {
    itemId: ref.itemId,
    itemType: ref.itemType,
    status,
    label: getMasteryLabel(status),
    attempts,
    correct,
    accuracy: attempts >= 3 ? Math.round((correct / attempts) * 100) : null,
    dueAt: evidence?.due_at ?? null,
    isDue: Number.isFinite(dueTime) && dueTime <= now.getTime(),
  };
}

export async function loadMasteryMap(
  db: SQLiteDatabase,
  refs: MasteryItemRef[],
  now = new Date(),
): Promise<Record<string, MasteryView>> {
  if (!refs.length) return {};
  const itemTypes = Array.from(new Set(refs.map((ref) => ref.itemType)));
  const placeholders = itemTypes.map(() => '?').join(', ');
  const rows = await db.getAllAsync<MasteryEvidence>(
    `
    SELECT item_id, item_type, status, interval_days, due_at, last_reviewed_at,
           attempts, correct, wrong_streak, correct_streak
    FROM app_srs_item_state
    WHERE item_type IN (${placeholders})
    `,
    ...itemTypes,
  );
  const evidenceByKey = new Map(rows.map((row) => [masteryKey(row.item_type, row.item_id), row]));
  return refs.reduce<Record<string, MasteryView>>((acc, ref) => {
    const key = masteryKey(ref.itemType, ref.itemId);
    acc[key] = buildMasteryView(ref, evidenceByKey.get(key) ?? null, now);
    return acc;
  }, {});
}

export function summarizeMastery(items: MasteryView[]) {
  return items.reduce(
    (summary, item) => {
      summary.total += 1;
      summary[item.status] += 1;
      if (item.isDue) summary.due += 1;
      return summary;
    },
    { total: 0, new: 0, learning: 0, known: 0, review: 0, mastered: 0, due: 0 },
  );
}

export function masteryKey(itemType: SrsItemType, itemId: string): string {
  return `${itemType}:${itemId}`;
}
