import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { COLORS } from './theme';
import { Eyebrow, Frame, Grain, Line, Vignette } from './components';

/**
 * The product half of the film.
 *
 * Every string in here is copy that exists in the real app — "Make the
 * commuting road usable", "in the next 48 hours", "no deadline given",
 * "Evidence: Link only". Inventing a label that looks like product UI is the
 * fastest way to make a launch film feel fake, and on an accountability
 * register it would also be the exact thing the product exists to refuse.
 */

/** The screenshot arriving. Held still — the artwork moved, the product does not. */
export const ProductReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: { damping: 200, mass: 0.6 } });
  const scale = interpolate(s, [0, 1], [1.08, 1]);
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
        <Img
          src={staticFile('shots/district.png')}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
        />
      </AbsoluteFill>
      <Vignette strength={0.18} />
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

/**
 * The clock beat.
 *
 * A promise card, then the deadline it was given, then what the register says
 * about it now. The phrase and the verdict land on separate beats on purpose:
 * the gap between them is the product.
 */
export const ClockScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const card = spring({ frame, fps, config: { damping: 200, mass: 0.5 } });
  const quoteIn = interpolate(frame, [18, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // The verdict arrives late and hard.
  const verdict = spring({
    frame: frame - 58,
    fps,
    config: { damping: 12, mass: 0.7, stiffness: 140 },
  });
  const flash = interpolate(frame, [58, 62, 74], [0, 0.22, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.paper,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          transform: `translateY(${interpolate(card, [0, 1], [40, 0])}px)`,
          opacity: card,
          width: 1180,
          background: '#ffffff',
          border: `1px solid ${COLORS.line}`,
          borderRadius: 20,
          padding: '54px 62px',
          boxShadow: '0 24px 70px rgba(22,21,15,0.10)',
        }}
      >
        <div
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 21,
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: COLORS.ink3,
          }}
        >
          Alwar, Rajasthan
        </div>

        <div
          style={{
            marginTop: 20,
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: 68,
            lineHeight: 1.16,
            color: COLORS.ink,
          }}
        >
          Make the commuting road usable
        </div>

        <div
          style={{
            marginTop: 30,
            opacity: quoteIn,
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 34,
            color: COLORS.ink2,
          }}
        >
          they said <strong style={{ color: COLORS.ink }}>&ldquo;in the next 48 hours&rdquo;</strong>
        </div>

        {/* The bar fills past full, which is the entire point of the shot. */}
        <div
          style={{
            marginTop: 40,
            height: 16,
            borderRadius: 999,
            background: COLORS.line,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${interpolate(frame, [26, 62], [0, 100], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}%`,
              background: COLORS.broken,
              borderRadius: 999,
            }}
          />
        </div>

        <div
          style={{
            marginTop: 34,
            display: 'flex',
            alignItems: 'baseline',
            gap: 20,
            opacity: verdict,
            transform: `scale(${interpolate(verdict, [0, 1], [0.9, 1])})`,
            transformOrigin: 'left center',
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 60,
              fontWeight: 800,
              color: COLORS.broken,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            4d over
          </span>
          <span
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 28,
              color: COLORS.ink2,
            }}
          >
            deadline passed with no verified proof of completion
          </span>
        </div>
      </div>

      <AbsoluteFill style={{ background: COLORS.broken, opacity: flash, pointerEvents: 'none' }} />
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

/**
 * The money shot: 34 tiles land, then 21 of them drain to grey.
 *
 * This is the one thing only this product can show, so it gets the longest
 * hold in the film. An undated promise cannot be broken, which is exactly why
 * it gets given — and that argument is unanswerable when you can see how much
 * of the wall it accounts for.
 */
export const CounterScene: React.FC = () => {
  const frame = useCurrentFrame();

  const count = Math.round(
    interpolate(frame, [6, 46], [0, 34], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  // The 21 undated ones drain last-first so the grey sweeps across the wall.
  const drainStart = 62;
  const undatedCount = 21;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.paper,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 96,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
        <span
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: 200,
            lineHeight: 1,
            color: COLORS.ink,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {count}
        </span>
        <span
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 34,
            color: COLORS.ink2,
          }}
        >
          promises tracked
        </span>
      </div>

      <div
        style={{
          marginTop: 54,
          display: 'grid',
          gridTemplateColumns: 'repeat(17, 1fr)',
          gap: 12,
          width: 1320,
        }}
      >
        {Array.from({ length: 34 }).map((_, i) => {
          const appear = interpolate(frame, [6 + i * 1.1, 16 + i * 1.1], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const isUndated = i >= 34 - undatedCount;
          const drain = isUndated
            ? interpolate(
                frame,
                [drainStart + (33 - i) * 1.4, drainStart + 14 + (33 - i) * 1.4],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
              )
            : 0;

          return (
            <div
              key={i}
              style={{
                aspectRatio: '1',
                borderRadius: 8,
                opacity: appear,
                transform: `scale(${interpolate(appear, [0, 1], [0.7, 1])})`,
                background: drain > 0 ? COLORS.undated : COLORS.fresh,
                filter: drain > 0 ? `saturate(${1 - drain * 0.75})` : undefined,
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          marginTop: 54,
          opacity: interpolate(frame, [84, 98], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 62,
          color: COLORS.ink,
          textAlign: 'center',
        }}
      >
        <strong style={{ color: COLORS.undated }}>21</strong> were never given a date.
      </div>

      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

/** The proof gate: it refuses, then it accepts. */
export const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const blocked = frame < 30;
  const shake = blocked
    ? Math.sin(frame * 1.5) * interpolate(frame, [0, 22], [7, 0], { extrapolateRight: 'clamp' })
    : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.paper,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 1080,
          background: '#ffffff',
          border: `1px solid ${COLORS.line}`,
          borderRadius: 20,
          padding: '48px 56px',
          transform: `translateX(${shake}px)`,
          boxShadow: '0 24px 70px rgba(22,21,15,0.10)',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '16px 30px',
            borderRadius: 999,
            background: blocked ? COLORS.line : COLORS.ink,
            color: blocked ? COLORS.ink3 : COLORS.paper,
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 30,
            fontWeight: 700,
          }}
        >
          Submit 6 promises
        </div>
        <div
          style={{
            marginTop: 26,
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 30,
            fontWeight: 600,
            color: blocked ? COLORS.broken : COLORS.kept,
          }}
        >
          {blocked ? 'Add a photo or a link before submitting.' : 'Evidence: Photo or scan'}
        </div>
      </div>

      <div
        style={{
          marginTop: 52,
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 64,
          color: COLORS.ink,
        }}
      >
        Proof is not optional.
      </div>

      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

/** One headline, one URL. Nothing else. */
export const EndCard: React.FC<{ url: string }> = ({ url }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.ink,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Frame justify="center">
        <Eyebrow color={COLORS.ink3}>Public promise register · India</Eyebrow>
        <Line size={92} color={COLORS.paper} maxWidth={1500}>
          We didn&rsquo;t set the deadline.
          <br />
          They did.
        </Line>
        <div
          style={{
            marginTop: 46,
            opacity: interpolate(frame, [22, 36], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 38,
            fontWeight: 600,
            color: COLORS.fresh,
          }}
        >
          {url}
        </div>
      </Frame>
      <Grain opacity={0.07} />
    </AbsoluteFill>
  );
};
