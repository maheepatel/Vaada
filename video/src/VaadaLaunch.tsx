import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { loadFont as loadSerif } from '@remotion/google-fonts/InstrumentSerif';
import { loadFont as loadSans } from '@remotion/google-fonts/Inter';
import { COLORS, T } from './theme';
import { DriftingStill, Frame, Grain, Line, Scrim, Vignette } from './components';
import { ClockScene, CounterScene, EndCard, ProductReveal, ProofScene } from './scenes';

// Bundled at build time rather than fetched, so a headless render never races
// the network and ships a frame in a fallback face.
loadSerif();
loadSans();

/**
 * Vaada launch film.
 *
 * Four acts. The wound, the turn, the clock, the answer.
 *
 * Act I is deliberately slow and entirely wordless apart from three lines.
 * The temptation with a product film is to reach the product quickly; here the
 * product only means anything after the viewer has sat in the problem for nine
 * seconds. The screenshot then arrives as relief rather than as a feature list.
 *
 * All artwork is screenprint illustration, never photorealistic. A register
 * whose whole claim is "every entry traces to a published source" cannot open
 * on synthetic footage of real-looking people and expect to be believed.
 */

/** Crossfades live here, at the orchestrator, never inside a scene. */
const Fade: React.FC<{ children: React.ReactNode; dur: number; hold?: number }> = ({
  children,
  dur,
  hold = 10,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, hold, dur - hold, dur],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const VaadaLaunch: React.FC<{ url?: string }> = ({
  url = 'vaada-lilac.vercel.app',
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      {/* ─── ACT I — the wound ─────────────────────────────────────────── */}

      <Sequence from={T.road.from} durationInFrames={T.road.dur}>
        <Fade dur={T.road.dur}>
          <DriftingStill src="art/01-road.png" durationInFrames={T.road.dur} to={1.07} />
          <Vignette />
          <Scrim />
          <Frame>
            <Line delay={10} size={80} maxWidth={1250}>
              Your parents were promised the same road.
            </Line>
          </Frame>
          <Grain />
        </Fade>
      </Sequence>

      <Sequence from={T.classroom.from} durationInFrames={T.classroom.dur}>
        <Fade dur={T.classroom.dur}>
          <DriftingStill
            src="art/02-classroom.png"
            durationInFrames={T.classroom.dur}
            to={1.06}
            panX={-18}
          />
          <Vignette />
          <Scrim />
          <Frame>
            <Line delay={8} size={80}>
              The promise always comes.
            </Line>
          </Frame>
          <Grain />
        </Fade>
      </Sequence>

      <Sequence from={T.protest.from} durationInFrames={T.protest.dur}>
        <Fade dur={T.protest.dur}>
          <DriftingStill src="art/03-protest.png" durationInFrames={T.protest.dur} to={1.05} />
          <Vignette strength={0.2} />
          <Scrim tone="ink" height={52} strength={0.55} />
          <Frame justify="flex-start">
            <Line delay={8} size={86} color={COLORS.paper} maxWidth={1200}>
              The date never does.
            </Line>
          </Frame>
          <Grain />
        </Fade>
      </Sequence>

      {/* The silence. No words at all — the only wordless beat in the film. */}
      <Sequence from={T.monsoon.from} durationInFrames={T.monsoon.dur}>
        <Fade dur={T.monsoon.dur} hold={14}>
          <DriftingStill
            src="art/04-monsoon.png"
            durationInFrames={T.monsoon.dur}
            to={1.05}
            panY={-10}
          />
          <Vignette strength={0.4} />
          <Grain opacity={0.07} />
        </Fade>
      </Sequence>

      {/* ─── ACT II — the turn ─────────────────────────────────────────── */}

      <Sequence from={T.turn.from} durationInFrames={T.turn.dur}>
        <Fade dur={T.turn.dur} hold={12}>
          <AbsoluteFill
            style={{
              backgroundColor: COLORS.ink,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Line delay={6} size={96} color={COLORS.paper} align="center" maxWidth={1400}>
              Until someone writes it down.
            </Line>
          </AbsoluteFill>
          <Grain opacity={0.08} />
        </Fade>
      </Sequence>

      {/* ─── ACT III — the clock ───────────────────────────────────────── */}

      <Sequence from={T.product.from} durationInFrames={T.product.dur}>
        <Fade dur={T.product.dur} hold={8}>
          <ProductReveal />
        </Fade>
      </Sequence>

      <Sequence from={T.clock.from} durationInFrames={T.clock.dur}>
        <Fade dur={T.clock.dur} hold={8}>
          <ClockScene />
        </Fade>
      </Sequence>

      <Sequence from={T.counter.from} durationInFrames={T.counter.dur}>
        <Fade dur={T.counter.dur} hold={8}>
          <CounterScene />
        </Fade>
      </Sequence>

      {/* ─── ACT IV — the answer ───────────────────────────────────────── */}

      <Sequence from={T.proof.from} durationInFrames={T.proof.dur}>
        <Fade dur={T.proof.dur} hold={8}>
          <ProofScene />
        </Fade>
      </Sequence>

      <Sequence from={T.end.from} durationInFrames={T.end.dur}>
        <Fade dur={T.end.dur} hold={12}>
          <EndCard url={url} />
        </Fade>
      </Sequence>
    </AbsoluteFill>
  );
};
