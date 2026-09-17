import { formatMonthLabel, shiftMonth, currentMonthKey } from '../utils/date';
import { Icon } from './Icon';

export function MonthSwitcher({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  const isCurrent = month === currentMonthKey();
  return (
    <div className="month-switch">
      <button className="icon-btn" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">
        <Icon name="chevronLeft" size={16} />
      </button>
      <span>
        {formatMonthLabel(month)}
        {isCurrent && <span className="pill pill-neutral" style={{ marginLeft: 8 }}>Now</span>}
      </span>
      <button className="icon-btn" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next month">
        <Icon name="chevronRight" size={16} />
      </button>
    </div>
  );
}
