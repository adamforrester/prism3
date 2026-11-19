/**
 * A RECORD BOTH PLUGIN BUILDS READ (#4154). Prism3 ships two plugins with different ids, "Prism3 Studio"
 * (`manifest.json`) and "Prism3 Studio Offline" (`manifest-offline.json`). Figma keeps `setPluginData` per plugin id,
 * so a record one build wrote privately is not there for the other: a file worked on with both drifted, with no error.
 * Shared plugin data is per namespace instead, and `prism3` is the namespace the ownership marks, the brand input and
 * the member baselines already use (`provenance.ts`, `persist-figma.ts`).
 *
 * So a record goes through here. A write goes to shared data only. A read takes the shared value, and falls back to
 * the private key when the shared one is empty, so a file saved before this keeps its record for the build that wrote
 * it. The other build cannot read that private copy (Figma does not allow it); the first write of either build after
 * this moves the record to shared data, where both read it.
 *
 * A node with no shared-data methods (a test double that models only private data) is written privately, so such a
 * double still round-trips. Figma's nodes always have both. Throws pass through, for the caller to handle.
 *
 * Pure: the node is passed in.
 */
export const RECORD_NS = 'prism3';

export type RecordNode = {
  getSharedPluginData?(namespace: string, key: string): string;
  setSharedPluginData?(namespace: string, key: string, value: string): void;
  getPluginData?(key: string): string;
  setPluginData?(key: string, value: string): void;
};

/** The record under `key`: the shared value, or the private one a file saved before #4154 holds. `''` when neither. */
export const readRecord = (node: RecordNode, key: string): string =>
  node.getSharedPluginData?.(RECORD_NS, key) || node.getPluginData?.(key) || '';

/** Keep `value` under `key`, in shared data. */
export const writeRecord = (node: RecordNode, key: string, value: string): void => {
  if (node.setSharedPluginData) node.setSharedPluginData(RECORD_NS, key, value);
  else node.setPluginData?.(key, value);
};
