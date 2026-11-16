/**
 * #533 (Q110 A): which of the runs that ended the completion notice names, while the panel is minimized to the strip.
 * Pure, so `test-run-ended.ts` reads it without a page.
 */
import type { Kind } from './activity';

/** The worst of what ended: the first failure, else the first warning, else the first run. Null when nothing ended. */
export const worstEnd = <T extends { readonly kind: Kind }>(ends: readonly T[]): T | null =>
  ends.find((e) => e.kind === 'bad') ?? ends.find((e) => e.kind === 'warn') ?? ends[0] ?? null;
