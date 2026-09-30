/**
 * The plugin iframe's entry (#110 + the agent link). It IS the shared studio UI — `apps/studio/src/entry.ts`,
 * the studio's own entry, imported whole and unchanged (one UI, no fork) — plus the one plugin-only control that is not part of it:
 * the agent link's temporary chip (`agent-link-ui.ts`). Mounted here rather than inside the studio's body,
 * so the web build carries none of it.
 */
import '../../../studio/src/entry';
import { mountAgentLink } from '../agent-link-ui';

mountAgentLink();
