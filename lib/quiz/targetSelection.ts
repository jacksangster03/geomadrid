import type { GeoUnitId } from "@/types/geo";
import type { MunicipalityIdentity } from "@/lib/data/loader";

export interface QuizTarget {
  id: GeoUnitId;
  name: string;
}

/** Seeded Fisher-Yates shuffle — uses Math.random (sufficient for a quiz). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a shuffled target list from the identity map.
 * Skips any entries missing a name.
 */
export function buildTargetList(
  identity: Record<GeoUnitId, MunicipalityIdentity>,
  totalRounds: number
): QuizTarget[] {
  const all: QuizTarget[] = Object.values(identity)
    .filter((m) => m.nameDisplay && m.nameDisplay.trim() !== "")
    .map((m) => ({ id: m.geoUnitId, name: m.nameDisplay }));

  if (all.length === 0) return [];

  const shuffled = shuffle(all);
  // If we need more rounds than municipalities, wrap around
  if (totalRounds <= shuffled.length) {
    return shuffled.slice(0, totalRounds);
  }
  // Repeat with a fresh shuffle for overflow rounds
  const result: QuizTarget[] = [...shuffled];
  while (result.length < totalRounds) {
    result.push(...shuffle(all).slice(0, totalRounds - result.length));
  }
  return result;
}

export function pickNextTarget(
  all: QuizTarget[],
  usedIds: Set<GeoUnitId>
): QuizTarget | null {
  const unused = all.filter((t) => !usedIds.has(t.id));
  if (unused.length > 0) return unused[Math.floor(Math.random() * unused.length)];
  // Exhausted — pick any
  if (all.length === 0) return null;
  return all[Math.floor(Math.random() * all.length)];
}
