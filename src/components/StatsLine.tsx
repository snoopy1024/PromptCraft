import type { MessageStats } from '~/store';
import { getStatsValues } from '~/utils/messageStats';

interface Props {
  stats?: MessageStats;
  type: 'completion' | 'reasoning';
}

export default function StatsLine({ stats, type }: Props) {
  const values = getStatsValues(stats, type);

  return (
    <span className="grid grid-cols-[minmax(4.5rem,auto)_minmax(6.75rem,auto)_minmax(4.5rem,auto)_minmax(2.25rem,auto)] items-center gap-x-[2px] whitespace-nowrap text-right leading-5 tabular-nums">
      <span>{values.tokens}</span>
      <span>{values.speed}</span>
      <span>{values.cost}</span>
      <span>{values.duration}</span>
    </span>
  );
}
