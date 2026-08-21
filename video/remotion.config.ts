import { Config } from '@remotion/cli/config';

Config.setEntryPoint('./src/index.ts');

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// crf 18 is visually lossless for flat screenprint artwork, which compresses
// badly at higher crf: large areas of flat cream develop banding.
Config.setCrf(18);
