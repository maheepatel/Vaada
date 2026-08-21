import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { COLORS } from './theme';

/**
 * Shared film furniture: the grain, the vignette, the slow drift on stills,
 * and the two title treatments. Kept in one file because they are small and
 * every scene needs most of them.
 */

/**
 * Paper grain over the whole frame.
 *
 * The artwork is flat screenprint, and flat colour compresses into visible
 * banding at any sane bitrate. A little animated noise dithers the gradients
 * and makes the whole thing read as printed rather than rendered.
 */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.055 }) => {
  const frame = useCurrentFrame();
  // Reseeded every 2 frames — faster than that shimmers, slower looks static.
  const seed = Math.floor(frame / 2);
  return (
    <AbsoluteFill
      style={{
        opacity,
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' seed='${seed}'/></filter><rect width='180' height='180' filter='url(%23n)'/></svg>`,
        )}")`,
      }}
    />
  );
};

/** Corner falloff. Keeps the eye centred without touching the artwork itself. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.28 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: `radial-gradient(ellipse at center, transparent 45%, rgba(22,21,15,${strength}) 100%)`,
    }}
  />
);

/**
 * A still, drifting.
 *
 * Six percent of scale across a scene is enough to read as motion and small
 * enough that nobody catches it moving. This is what makes generated stills
 * feel like documentary footage instead of a slideshow.
 */
export const DriftingStill: React.FC<{
  src: string;
  durationInFrames: number;
  from?: number;
  to?: number;
  panX?: number;
  panY?: number;
}> = ({ src, durationInFrames, from = 1.0, to = 1.06, panX = 0, panY = 0 }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [from, to], {
    extrapolateRight: 'clamp',
  });
  const x = interpolate(frame, [0, durationInFrames], [0, panX], {
    extrapolateRight: 'clamp',
  });
  const y = interpolate(frame, [0, durationInFrames], [0, panY], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: COLORS.paperDeep }}>
      <Img
        src={staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translate(${x}px, ${y}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * A line of the script.
 *
 * Rises 18px and fades in over 12 frames. Words are not staggered: this is a
 * film about sentences that were said once and then forgotten, and a line that
 * assembles word by word turns a statement into an animation exercise.
 */
export const Line: React.FC<{
  children: React.ReactNode;
  delay?: number;
  size?: number;
  color?: string;
  weight?: number;
  align?: 'left' | 'center';
  maxWidth?: number;
  serif?: boolean;
  fadeOutAt?: number;
}> = ({
  children,
  delay = 0,
  size = 76,
  color = COLORS.ink,
  weight = 400,
  align = 'left',
  maxWidth = 1300,
  serif = true,
  fadeOutAt,
}) => {
  const frame = useCurrentFrame();
  const t = frame - delay;

  const enter = interpolate(t, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exit =
    fadeOutAt === undefined
      ? 1
      : interpolate(frame, [fadeOutAt, fadeOutAt + 10], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
  const lift = interpolate(t, [0, 14], [18, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity: enter * exit,
        transform: `translateY(${lift}px)`,
        fontFamily: serif
          ? "'Instrument Serif', Georgia, serif"
          : "'Inter', system-ui, sans-serif",
        fontSize: size,
        fontWeight: weight,
        color,
        // 1.18 minimum for a serif with descenders, or the render clips them.
        lineHeight: 1.18,
        letterSpacing: serif ? '-0.015em' : '-0.01em',
        maxWidth,
        textAlign: align,
        textWrap: 'balance',
      }}
    >
      {children}
    </div>
  );
};

/** The small uppercase label used above a line, matching the site's eyebrow. */
export const Eyebrow: React.FC<{ children: React.ReactNode; delay?: number; color?: string }> = ({
  children,
  delay = 0,
  color = COLORS.ink3,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        opacity,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 22,
        fontWeight: 600,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color,
        marginBottom: 22,
      }}
    >
      {children}
    </div>
  );
};

/**
 * A contrast plate under the type.
 *
 * The artwork is dense linework and halftone, and dark text laid straight over
 * a cracked road is unreadable — the first render proved it. This lays a tall,
 * soft gradient of the page colour under the lower third so the line has
 * somewhere to sit without covering the illustration with a box.
 */
export const Scrim: React.FC<{ tone?: 'paper' | 'ink'; height?: number; strength?: number }> = ({
  tone = 'paper',
  // Concentrated low. A taller plate reads cleanly but washes the artwork it
  // is supposed to be sitting on — the first pass faded the children's legs.
  height = 38,
  strength = 0.94,
}) => {
  const c = tone === 'paper' ? '250,248,243' : '22,21,15';
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: `linear-gradient(to top, rgba(${c},${strength}) 0%, rgba(${c},${strength * 0.82}) 16%, rgba(${c},0) ${height}%)`,
      }}
    />
  );
};

/** Standard 96px inset so every scene's text sits on the same margin. */
export const Frame: React.FC<{
  children: React.ReactNode;
  justify?: 'flex-start' | 'center' | 'flex-end';
}> = ({ children, justify = 'flex-end' }) => (
  <AbsoluteFill
    style={{
      padding: 96,
      paddingBottom: 132,
      justifyContent: justify,
      alignItems: 'flex-start',
    }}
  >
    <div>{children}</div>
  </AbsoluteFill>
);
