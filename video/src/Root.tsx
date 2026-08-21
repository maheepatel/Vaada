import React from 'react';
import { Composition } from 'remotion';
import { VaadaLaunch } from './VaadaLaunch';
import { FPS, TOTAL } from './theme';

/**
 * One composition per aspect ratio, rendered independently.
 *
 * Cropping a 16:9 master to 9:16 in post puts the title cards half off screen,
 * so the vertical cut gets its own render rather than a crop.
 */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="VaadaLaunch"
      component={VaadaLaunch}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ url: 'vaada-lilac.vercel.app' }}
    />
    <Composition
      id="VaadaLaunchVertical"
      component={VaadaLaunch}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ url: 'vaada-lilac.vercel.app' }}
    />
  </>
);
