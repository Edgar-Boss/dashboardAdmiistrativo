import { Clock, Phone } from "lucide-react";
import { useRef } from "react";
import AppointmentActionsMenu from "../AppointmentActionsMenu";
import {
  formatAppointmentDuration,
  formatAppointmentTimeRange,
} from "../appointmentEditHelpers";
import { CARD_VARIANT } from "./calendarCardLayout";
import { getStateStyle } from "./calendarTheme";

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
      ? "px-1.5 py-0.5 text-[9px] leading-tight"
      : size === "normal"
        ? "px-2 py-0.5 text-[9px] leading-tight"
        : "px-2.5 py-0.5 text-[10px] leading-tight";

  return (
    <span
      className={`inline-flex h-fit shrink-0 items-center whitespace-nowrap rounded-full font-medium ${sizeClass} ${stateStyle.badge}`}
    >
      {stateStyle.label}
    </span>
  );
}

function CompactCardContent({ patientName, timeRange, phone, stateStyle }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-center gap-1">
      <div className="grid w-full shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-1.5">
        <p className="truncate text-[11px] font-semibold leading-tight text-brand-text">
          {patientName}
        </p>
        <StatusBadge stateStyle={stateStyle} size="compact" />
      </div>
      <p className="flex min-w-0 items-center gap-1 text-[10px] font-medium leading-tight tabular-nums text-brand-text-muted">
        <span className="shrink-0">{timeRange}</span>
        {phone ? (
          <>
            <span className="text-brand-text-muted/60" aria-hidden>
              {" \u00b7 "}
            </span>
            <Phone className="h-2.5 w-2.5 shrink-0 text-brand-text-muted/80" aria-hidden />
            <span className="min-w-0 truncate tabular-nums">{phone}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}

function NormalCardContent({
  patientName,
  timeRange,
  duration,
  phone,
  stateStyle,
}) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-1">
      <div className="grid w-full shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-1.5">
        <p className="truncate text-xs font-semibold leading-tight text-brand-text">
          {patientName}
        </p>
        <StatusBadge stateStyle={stateStyle} size="normal" />
      </div>
      <p className="flex min-w-0 items-center gap-1 text-[10px] font-medium leading-tight tabular-nums text-brand-text-muted">
        <Clock className="h-2.5 w-2.5 shrink-0 text-brand-text-muted/80" aria-hidden />
        <span className="truncate">{timeRange}</span>
        <span className="text-brand-text-muted/60" aria-hidden>
          {" \u00b7 "}
        </span>
        <span className="shrink-0 text-brand-text-muted">{duration}</span>
      </p>
      {phone ? (
        <p className="flex min-w-0 items-center gap-1 text-[10px] leading-tight text-brand-text-muted">
          <Phone className="h-2.5 w-2.5 shrink-0 text-brand-text-muted/80" aria-hidden />
          <span className="truncate tabular-nums">{phone}</span>
        </p>
      ) : null}
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
    <div className={`flex h-full min-h-0 w-full flex-col ${hasMeta ? "gap-1.5" : "gap-1"}`}>
      <div className="grid w-full shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2">
        <p className="truncate text-[13px] font-semibold leading-snug tracking-tight text-brand-text">
          {patientName}
        </p>
        <StatusBadge stateStyle={stateStyle} />
      </div>

      <p className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium leading-tight tabular-nums text-brand-text-muted">
        <Clock className="h-3 w-3 shrink-0 text-brand-text-muted/80" aria-hidden />
        <span className="truncate">{timeRange}</span>
        <span className="text-brand-text-muted/60" aria-hidden>
          {" \u00b7 "}
        </span>
        <span className="shrink-0 text-brand-text-muted">{duration}</span>
      </p>

      {reason ? (
        <p className="line-clamp-2 text-[11px] leading-snug text-brand-text-muted">
          {reason}
        </p>
      ) : null}

      {phone ? (
        <p className="flex min-w-0 items-center gap-1.5 text-[11px] leading-tight text-brand-text-muted">
          <Phone className="h-3 w-3 shrink-0 text-brand-text-muted/80" aria-hidden />
          <span className="truncate tabular-nums">{phone}</span>
        </p>
      ) : null}
    </div>
  );
}

const CARD_BASE =
  "absolute left-1.5 right-1.5 box-border flex cursor-pointer flex-col rounded-brand-md border border-brand-border border-l-2 text-left shadow-brand ring-1 ring-brand-ink/[0.02] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-brand-md";

const VARIANT_STYLES = {
  [CARD_VARIANT.COMPACT]: "px-2.5 py-1.5",
  [CARD_VARIANT.NORMAL]: "px-2.5 py-1.5",
  [CARD_VARIANT.LARGE]: "px-2.5 py-2",
};

export default function AppointmentCalendarCard({
  block,
  onClick,
  onStateChange,
  savingIds,
  isMenuOpen = false,
  onMenuOpen,
  onMenuClose,
  style,
}) {
  const { row, startKey, slotCount, variant = CARD_VARIANT.COMPACT } = block;
  const display = { ...row, appointmentTime: startKey, slotCount };
  const timeRange = block.timeLabel ?? formatAppointmentTimeRange(display);
  const duration = block.durationLabel ?? formatAppointmentDuration(display);
  const continuation = block.continuationLabel ?? null;
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
  const suppressCardClickRef = useRef(false);

  function handleCardMouseDown() {
    if (isMenuOpen) {
      suppressCardClickRef.current = true;
    }
  }

  function handleCardClick() {
    if (isMenuOpen || suppressCardClickRef.current) {
      suppressCardClickRef.current = false;
      return;
    }
    onClick?.(row);
  }

  return (
    <div
      data-testid="appointment-calendar-card"
      data-appointment-id={row?.id}
      className={`${CARD_BASE} ${isMenuOpen ? "z-40 hover:z-40" : "z-20 hover:z-30"} ${VARIANT_STYLES[variant] ?? VARIANT_STYLES[CARD_VARIANT.LARGE]} ${stateStyle.border} ${stateStyle.card}`}
      style={{
        ...style,
        boxSizing: "border-box",
        height: heightPx,
        maxHeight: heightPx,
        minWidth: 0,
      }}
    >
      <button
        type="button"
        onClick={handleCardClick}
        onMouseDown={handleCardMouseDown}
        title={fullTooltip}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pr-8 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20"
        aria-label={`Cita de ${patientName}, ${timeRange}${duration ? `, ${duration}` : ""}${continuation ? `, ${continuation}` : ""}${phone ? `, ${phone}` : ""}`}
      >
        {continuation ? (
          <p className="truncate text-[10px] font-medium leading-tight text-brand-text">
            {continuation}
          </p>
        ) : null}
        {variant === CARD_VARIANT.COMPACT ? (
          <CompactCardContent
            patientName={patientName}
            timeRange={timeRange}
            phone={phone}
            stateStyle={stateStyle}
          />
        ) : variant === CARD_VARIANT.NORMAL ? (
          <NormalCardContent
            patientName={patientName}
            timeRange={timeRange}
            duration={duration}
            phone={phone}
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

      <div
        className="absolute right-0.5 top-0.5 z-[35]"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <AppointmentActionsMenu
          appointment={row}
          appointmentId={row?.id}
          state={row?.state}
          patientName={patientName}
          disabled={savingIds?.has(row?.id) ?? false}
          isOpen={isMenuOpen}
          onOpen={onMenuOpen}
          onClose={onMenuClose}
          onStateChange={onStateChange}
          onEdit={() => onClick?.(row)}
          compactTrigger
        />
      </div>
    </div>
  );
}
