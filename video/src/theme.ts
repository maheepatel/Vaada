/**
 * The film's palette and type scale.
 *
 * Taken from the product's own `globals.css` rather than invented, so the
 * artwork, the screenshots and the title cards all sit on the same cream and
 * share the same ink. A launch film in a different palette to the product it
 * is launching reads as a stock template.
 */

export const COLORS = {
  paper: '#faf8f3',
  paperDeep: '#f0efe3',
  ink: '#16150f',
  ink2: '#4d493d',
  ink3: '#857f6d',
  line: '#e5e0d3',

  // The urgency ramp. Only these are allowed to be saturated.
  broken: '#c7302a',
  brokenSoft: '#fbe0dd',
  urgent: '#f2843b',
  kept: '#12805c',
  fresh: '#35be7e',
  undated: '#93b98c',
  unanswered: '#8c8577',
} as const;

export const FPS = 30;

/** Scene boundaries in frames, in one place so the edit can be retimed here. */
export const T = {
  road: { from: 0, dur: 90 },
  classroom: { from: 90, dur: 90 },
  protest: { from: 180, dur: 90 },
  monsoon: { from: 270, dur: 60 },
  turn: { from: 330, dur: 60 },
  product: { from: 390, dur: 120 },
  clock: { from: 510, dur: 120 },
  counter: { from: 630, dur: 120 },
  proof: { from: 750, dur: 60 },
  end: { from: 810, dur: 90 },
} as const;

export const TOTAL = T.end.from + T.end.dur;
