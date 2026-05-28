/**
 * Google Calendar–style “now” line: time label (left), dot, horizontal rule.
 * Parent grid must be `position: relative`.
 */
export default function CurrentTimeIndicator({
  topPx,
  timeLabel,
  gridWidth,
  timeColumnWidthPx,
}) {
  if (topPx == null || !timeLabel) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 z-30 flex items-center"
      style={{ top: topPx, width: gridWidth }}
      aria-hidden
    >
      <div
        className="flex shrink-0 items-center justify-end pr-1.5"
        style={{ width: timeColumnWidthPx }}
      >
        <span
          className="-mt-px text-[10px] font-semibold tabular-nums leading-none text-rose-500/90"
          aria-live="polite"
        >
          {timeLabel}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-center">
        <div className="h-1.5 w-1.5 shrink-0 -translate-x-1/2 rounded-full bg-rose-500/85 ring-2 ring-[#fafafa]" />
        <div className="h-px flex-1 bg-rose-500/55" />
      </div>
    </div>
  );
}
