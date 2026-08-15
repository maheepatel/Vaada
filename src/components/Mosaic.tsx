import Link from 'next/link';
import { squarify } from '@/lib/treemap';
import { BAND_STYLE, bandTexture } from '@/lib/status';
import type { UrgencyBand } from '@/lib/types';

export interface MosaicItem {
  key: string;
  label: string;
  /** Second line, shown only when the tile is big enough to hold it. */
  sublabel?: string;
  band: UrgencyBand;
  /** Drives tile area. Clamped, never zero. */
  value: number;
  /** 0-100 verified progress, drawn as a bar along the bottom edge. */
  progress?: number;
  href?: string;
}

/**
 * The mosaic. One tile per promise (or per district, one level up), sized by
 * how much is at stake and coloured by how much of its deadline has burned.
 *
 * Labels are shown only above a size threshold. Cramming 8px text into a
 * sliver is worse than leaving it blank — the tooltip and the list below carry
 * the detail, the mosaic carries the shape of the problem.
 */
export function Mosaic({
  items,
  className = '',
  minLabelArea = 42,
}: {
  items: MosaicItem[];
  className?: string;
  minLabelArea?: number;
}) {
  const cells = squarify(items.map((item) => ({ item, value: item.value })));

  return (
    <div className={`relative isolate h-full w-full bg-surface-2 ${className}`}>
      {cells.map(({ item, x, y, w, h }) => {
        const style = BAND_STYLE[item.band];
        const area = w * h;
        const showLabel = area >= minLabelArea && w > 11 && h > 9;
        const showSub = area >= minLabelArea * 3.2 && h > 16 && !!item.sublabel;

        const inner = (
          <>
            {showLabel && (
              <span className="pointer-events-none absolute inset-0 flex flex-col justify-start gap-0.5 p-1.5 sm:p-2">
                <span
                  className="text-[0.6rem] font-semibold leading-tight sm:text-[0.7rem]"
                  style={{ color: style.on }}
                >
                  {item.label}
                </span>
                {showSub && (
                  <span
                    className="text-[0.58rem] leading-tight opacity-80 sm:text-[0.63rem]"
                    style={{ color: style.on }}
                  >
                    {item.sublabel}
                  </span>
                )}
              </span>
            )}
            {typeof item.progress === 'number' && item.progress > 0 && (
              <span className="tile-progress" style={{ width: `${item.progress}%` }} />
            )}
          </>
        );

        const commonProps = {
          className: `mosaic-tile ${bandTexture(item.band)}`,
          style: {
            left: `${x}%`,
            top: `${y}%`,
            width: `${w}%`,
            height: `${h}%`,
            background: style.fill,
          } as const,
          title: `${item.label}${item.sublabel ? ` — ${item.sublabel}` : ''} · ${style.label}`,
        };

        return item.href ? (
          <Link key={item.key} href={item.href} {...commonProps}>
            {inner}
          </Link>
        ) : (
          <div key={item.key} {...commonProps}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
