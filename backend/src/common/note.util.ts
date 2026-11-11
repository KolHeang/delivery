/**
 * Strips redundant "[Reason: Other]" prefixes from parcel/event notes while
 * preserving the rest of the note and leaving specific reasons intact.
 */
export function cleanParcelNote<T extends string | null | undefined>(
  val: T,
): T {
  if (typeof val !== 'string') return val;
  return val.replace(/\[Reason:\s*Other\]\s*/gi, '').trim() as T;
}
