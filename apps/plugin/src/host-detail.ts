/**
 * A HOST MESSAGE, AS A FAILURE LINE CARRIES IT (#3697 H4, #4253).
 *
 * Moved out of `apply-summary.ts`, which re-exports both, so the component executor (`write-components.ts`) can put
 * its misses in this form without `apply-summary.ts` joining the executor's files (`lint-executor-revision.ts` follows
 * relative value imports). Pure, with no imports.
 */

/** A thrown error's class (`TypeError`, `Error`), one word (#3697 H4). A throw that is not an `Error`, or whose name is
 *  not one word, reads `Error`. Where only the class may go (agent data, `write-text-styles.ts`), it goes alone. */
export const errorClass = (e: unknown): string => {
  const n = e instanceof Error || (e && typeof e === 'object') ? (e as { name?: unknown }).name : undefined;
  return typeof n === 'string' && /^[A-Za-z][A-Za-z0-9]*$/.test(n) ? n : 'Error';
};

/** What a failure line says after `write failed: ` or `prune failed: `: the class, then the host's message on one line
 *  (`TypeError: in set_value: …`). The drawer shows it whole, so the designer keeps Figma's reason (#3697 H4, D3703.1 B).
 *  A host message can name anything the file holds, so Report a problem keeps only the class (`reduceFailure`, studio's
 *  `report.ts`): the class leads so the report finds it, and line breaks are joined since it cuts to a line's end. */
export const failureDetail = (e: unknown): string => {
  const m = (e instanceof Error ? e.message : String(e)).replace(/\s*[\r\n\u2028\u2029]+\s*/g, ' ').trim();
  return m ? `${errorClass(e)}: ${m}` : errorClass(e);
};
