import { Clock, Phone } from "lucide-react";
import {
  formatAppointmentDuration,
  formatAppointmentTimeRange,
} from "../appointmentEditHelpers";
import { CARD_VARIANT } from "./calendarCardLayout";
import { getStateStyle, STATUS_BADGE_BASE } from "./calendarTheme";

function formatPhone(value) {
  if (!value) return null;
  const s = String(value).trim();
  return s || null;
}

function buildTooltipText({ patientName, timeRange, duration, reason, phone }) {
  const lines = [patientName, timeRange];
  if (duration) lines.push(`Duración: ${duration}`);
  if (reason) lines.push(`Motivo: ${reason}`);
  if (phone) lines.push(`Tel: ${phone}`);
  return lines.join("\n");
}

function StatusBadge({ stateStyle, size = "default" }) {
  const sizeClass =
    size === "compact"
      ? "px-1.5 py-px text-[9px] leading-none tracking-wide"
      : size === "normal"
        ? "px-2 py-0.5 text-[9px] leading-none"
        : "";

  return (
    <span className={`${STATUS_BADGE_BASE} ${sizeClass} ${stateStyle.badge}`}>
      {stateStyle.label}
    </span>
  );
}

function CompactCardContent({ patientName, timeRange, stateStyle }) {
  return (
    <div className="flex w-full flex-col gap-0.5">
      <div className="flex min-h-[14px] items-center justify-between gap-1.5">
        <p className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-none text-gray-900">
          {patientName}
        </p>
        <StatusBadge stateStyle={stateStyle} size="compact" />
      </div>
      <p className="truncate text-[10px] font-medium leading-none tabular-nums text-gray-500">
        {timeRange}
      </p>
    </div>
  );
}

function NormalCardContent({
  patientName,
  timeRange,
  duration,
  stateStyle,
}) {
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex min-h-[16px] items-start justify-between gap-1.5">
        <p className="min-w-0 flex-1 truncate text-xs font-semibold leading-none text-gray-900">
          {patientName}
        </p>
        <StatusBadge stateStyle={stateStyle} size="normal" />
      </div>
      <p className="flex items-center gap-1 text-[10px] font-medium leading-none tabular-nums text-gray-600">
        <Clock className="h-2.5 w-2.5 shrink-0 text-gray-400/90" aria-hidden />
        <span className="truncate">{timeRange}</span>
        <span className="text-gray-300/90" aria-hidden>
          {" \u00b7 "}
        </span>
        <span className="shrink-0 text-gray-500">{duration}</span>
      </p>
    </div>
  );
}

function LargeCardContent({
  patientName,
  timeRange,
  duration,
  reason,
  phone,
  stateStyle,
}) {
  const hasMeta = Boolean(reason || phone);

  return (
    <div className={`flex w-full flex-col ${hasMeta ? "gap-1.5" : "gap-1"}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-snug tracking-tight text-gray-900">
          {patientName}
        </p>
        <StatusBadge stateStyle={stateStyle} />
      </div>

      <p className="flex items-center gap-1.5 text-[11px] font-medium leading-none tabular-nums text-gray-600">
        <Clock className="h-3 w-3 shrink-0 text-gray-400/90" aria-hidden />
        <span className="truncate">{timeRange}</span>
        <span className="text-gray-300/90" aria-hidden>
          {" \u00b7 "}
        </span>
        <span className="shrink-0 text-gray-500">{duration}</span>
      </p>

      {reason ? (
        <p className="line-clamp-2 text-[11px] leading-snug text-gray-500">
          {reason}
        </p>
      ) : null}

      {phone ? (
        <p className="flex items-center gap-1.5 text-[11px] leading-none text-gray-500">
          <Phone className="h-3 w-3 shrink-0 text-gray-400/90" aria-hidden />
          <span className="truncate tabular-nums">{phone}</span>
        </p>
      ) : null}
    </div>
  );
}

const CARD_BASE =
  "absolute left-1.5 right-1.5 z-20 box-border flex cursor-pointer flex-col rounded-xl border border-gray-200/60 border-l-2 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-gray-900/[0.02] transition-all duration-200 ease-out hover:z-30 hover:-translate-y-px hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-900/10";

const VARIANT_STYLES = {
  [CARD_VARIANT.COMPACT]: "overflow-visible px-2 py-1",
  [CARD_VARIANT.NORMAL]: "overflow-visible px-2 py-1.5",
  [CARD_VARIANT.LARGE]: "overflow-hidden px-2.5 py-2",
};

export default function AppointmentCalendarCard({ block, onClick, style }) {
  const { row, startKey, slotCount, variant = CARD_VARIANT.COMPACT } = block;
  const display = { ...row, appointmentTime: startKey, slotCount };
  const timeRange = formatAppointmentTimeRange(display);
  const duration = formatAppointmentDuration(display);
  const stateStyle = getStateStyle(row?.state);
  const patientName = row?.name ?? row?.patientName ?? "\u2014";
  const phone = formatPhone(row?.phoneNumber ?? row?.phone_number);
  const reason = row?.reason ?? row?.motivo ?? null;

  const fullTooltip = buildTooltipText({
    patientName,
    timeRange,
    duration,
    reason,
    phone,
  });

  const heightPx = block.heightPx ?? style?.height;
  const minHeightPx = block.minHeightPx ?? heightPx;

  return (
    <button
      type="button"
      onClick={() => onClick?.(row)}
      title={fullTooltip}
      className={`${CARD_BASE} ${VARIANT_STYLES[variant] ?? VARIANT_STYLES[CARD_VARIANT.LARGE]} ${stateStyle.border} ${stateStyle.card}`}
      style={{
        ...style,
        boxSizing: "border-box",
        height: heightPx,
        minHeight: minHeightPx,
      }}
      aria-label={`Cita de ${patientName}, ${timeRange}${duration ? `, ${duration}` : ""}`}
    >
      {variant === CARD_VARIANT.COMPACT ? (
        <CompactCardContent
          patientName={patientName}
          timeRange={timeRange}
          stateStyle={stateStyle}
        />
      ) : variant === CARD_VARIANT.NORMAL ? (
        <NormalCardContent
          patientName={patientName}
          timeRange={timeRange}
          duration={duration}
          stateStyle={stateStyle}
        />
      ) : (
        <LargeCardContent
          patientName={patientName}
          timeRange={timeRange}
          duration={duration}
          reason={reason}
          phone={phone}
          stateStyle={stateStyle}
        />
      )}
    </button>
  );
}
