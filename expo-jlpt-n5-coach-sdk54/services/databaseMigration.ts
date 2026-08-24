export function getCommonMigrationColumns(targetColumns: Set<string>, legacyColumns: Set<string>): string[] {
  return [...targetColumns].filter((columnName) => legacyColumns.has(columnName));
}

export function assertMigrationCounts(tableName: string, before: number, legacy: number, after: number): void {
  const minimumExpected = Math.max(before, legacy);
  if (after < minimumExpected) {
    throw new Error(
      `Migration count mismatch for ${tableName}: before=${before}, legacy=${legacy}, after=${after}`
    );
  }
}
