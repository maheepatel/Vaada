/**
 * Lookups over the geo dataset.
 *
 * The governing idea: the list is a *convenience*, never a gate. Every level
 * accepts a value that is not in the list, because a register that refuses to
 * record a promise made in a village it has never heard of is useless in
 * exactly the places that need it most. What the list buys is consistent
 * spelling, so "Thanagazi" and "Thangazi" do not become two places.
 */

import { STATES, SUBDISTRICTS, VILLAGES, SCHOOLS, type SchoolGeo } from '@/data/geo/states';
import { slugify } from './format';

export type { StateGeo } from '@/data/geo/states';
export { STATES } from '@/data/geo/states';

export function findState(nameOrSlug: string) {
  const needle = nameOrSlug.trim().toLowerCase();
  const slug = slugify(needle);
  return (
    STATES.find((s) => s.slug === slug || s.name.toLowerCase() === needle) ?? null
  );
}

export function districtsFor(stateNameOrSlug: string): string[] {
  return findState(stateNameOrSlug)?.districts ?? [];
}

export function subdistrictsFor(state: string, district: string): string[] {
  const s = findState(state);
  if (!s || !district) return [];
  return SUBDISTRICTS[`${s.slug}:${slugify(district)}`] ?? [];
}

export function villagesFor(state: string, district: string, subdistrict: string): string[] {
  const s = findState(state);
  if (!s || !district || !subdistrict) return [];
  return VILLAGES[`${s.slug}:${slugify(district)}:${slugify(subdistrict)}`] ?? [];
}

export function schoolsFor(
  state: string,
  district: string,
  subdistrict: string,
  village: string,
): SchoolGeo[] {
  const s = findState(state);
  if (!s || !district || !subdistrict || !village) return [];
  return (
    SCHOOLS[`${s.slug}:${slugify(district)}:${slugify(subdistrict)}:${slugify(village)}`] ?? []
  );
}

/**
 * Ranks options for a typeahead: exact match, then prefix, then substring.
 *
 * Prefix beats substring because typing "Ala" should surface Alappuzha before
 * Kalaburagi, which contains "ala" in the middle and is not what anyone means.
 */
export function rankMatches(options: string[], query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return options.slice(0, limit);

  const exact: string[] = [];
  const prefix: string[] = [];
  const substring: string[] = [];

  for (const o of options) {
    const lower = o.toLowerCase();
    if (lower === q) exact.push(o);
    else if (lower.startsWith(q)) prefix.push(o);
    else if (lower.includes(q)) substring.push(o);
  }

  return [...exact, ...prefix, ...substring].slice(0, limit);
}

/** Indian PIN codes are exactly six digits and never start with zero. */
export function isValidPincode(v: string): boolean {
  return /^[1-9][0-9]{5}$/.test(v.trim());
}

/**
 * The place fields, in the order the form asks for them. Each level narrows the
 * one below it, and `locality` is what gets displayed on a tile.
 */
export interface PlaceValue {
  state: string;
  district: string;
  subdistrict: string;
  village: string;
  school: string;
  udise: string;
  pincode: string;
}

export const EMPTY_PLACE: PlaceValue = {
  state: '',
  district: '',
  subdistrict: '',
  village: '',
  school: '',
  udise: '',
  pincode: '',
};

/** Human-readable one-liner, most specific part first. */
export function formatPlace(p: PlaceValue): string {
  return [p.school, p.village, p.subdistrict, p.district, p.state]
    .map((x) => x.trim())
    .filter(Boolean)
    .join(', ');
}

/** What goes in `Commitment.locality` — the place a volunteer would walk to. */
export function localityFrom(p: PlaceValue): string {
  return (
    [p.school, p.village, p.subdistrict]
      .map((x) => x.trim())
      .filter(Boolean)
      .join(', ') || p.district.trim()
  );
}
