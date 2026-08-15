import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  buildAppointmentBlocks,
  buildDoctorColumns,
  buildVisualTimeSlots,
  getCurrentTimePosition,
  getGridHeightPx,
  groupBlocksByColumn,
  isTodayDate,
} from "./calendarLayout";
import { getDoctorTheme } from "./calendarTheme";
import AppointmentCalendarCard from "./AppointmentCalendarCard";
import CurrentTimeIndicator from "./CurrentTimeIndicator";
import DoctorColumnHeader from "./DoctorColumnHeader";
import { useCurrentTime } from "./useCurrentTime";

function CalendarSkeleton() {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-brand-md border border-brand-border bg-brand-surface">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-border border-t-brand-primary" />
        <p className="text-sm text-brand-text-muted">Cargando agenda...</p>
      </div>
    </div>
  );
}

function EmptyDoctors() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-brand-md border border-dashed border-brand-border bg-brand-soft/40 px-6 text-center">
      <p className="text-sm font-medium text-brand-text">Sin especialistas para mostrar</p>
      <p className="mt-1 max-w-sm text-xs text-brand-text-muted">
        Agrega especialistas o citas del día para ver la agenda.
      </p>
    </div>
  );
}

export default function MedicalCalendarGrid({
  appointments = [],
  specialists = [],
  specialistsReady = true,
  loading = false,
  selectedDate,
  config,
  onAppointmentClick,
  onStateChange,
  savingIds,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const calendarConfig = config;
  const gridHeight = getGridHeightPx(calendarConfig);
  const timeSlots = useMemo(
    () => (calendarConfig ? buildVisualTimeSlots(calendarConfig) : []),
    [calendarConfig]
  );
  const columns = useMemo(
    () => buildDoctorColumns({ specialists, appointments }),
    [specialists, appointments]
  );
  const blocks = useMemo(
    () => (calendarConfig ? buildAppointmentBlocks(appointments, calendarConfig) : []),
    [appointments, calendarConfig]
  );
  const blocksByColumn = useMemo(
    () => groupBlocksByColumn(blocks, columns),
    [blocks, columns]
  );
  const showNowLine = isTodayDate(selectedDate);
  const now = useCurrentTime(showNowLine);
  const nowPosition = useMemo(
    () =>
      showNowLine && calendarConfig
        ? getCurrentTimePosition(now, calendarConfig)
        : null,
    [showNowLine, now, calendarConfig],
  );

  const scrollRef = useRef(null);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;

    function clampHorizontalScroll() {
      const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth);
      if (node.scrollLeft > maxScroll) {
        node.scrollLeft = maxScroll;
      }
    }

    clampHorizontalScroll();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(clampHorizontalScroll);
    observer.observe(node);
    return () => observer.disconnect();
  }, [columns.length]);

  if (loading || !calendarConfig) return <CalendarSkeleton />;

  if (!specialistsReady && columns.length === 0) return <CalendarSkeleton />;

  if (columns.length === 0) return <EmptyDoctors />;

  return (
    <div className="overflow-hidden rounded-brand-md border border-brand-border bg-brand-background shadow-brand ring-1 ring-brand-ink/[0.03]">
      <div
        ref={scrollRef}
        data-testid="calendar-scroll"
        className="calendar-scroll max-h-[min(72vh,720px)] overflow-auto scroll-smooth overscroll-x-contain"
        style={{
          "--calendar-time-col": `${calendarConfig.timeColumnWidthPx}px`,
          "--calendar-doctor-col": `${calendarConfig.doctorColumnWidthPx}px`,
          "--calendar-col-count": String(columns.length),
        }}
      >
        <div className="calendar-grid-inner relative min-w-max">
          <div className="sticky top-0 z-40 flex border-b border-brand-border bg-brand-background/90 backdrop-blur-md">
            <div
              className="sticky left-0 z-50 shrink-0 border-r border-brand-border bg-brand-background/90 px-2 py-3.5"
              style={{ width: calendarConfig.timeColumnWidthPx }}
            >
              <span className="text-[10px] font-medium uppercase tracking-widest text-brand-text-muted/80">
                Hora
              </span>
            </div>
            {columns.map((col) => (
              <div
                key={col.key}
                data-testid={`calendar-doctor-header-${col.key}`}
                className="calendar-doctor-col shrink-0"
              >
                <DoctorColumnHeader
                  doctorName={col.doctorName}
                  specialty={col.specialty}
                  themeIndex={col.themeIndex}
                />
              </div>
            ))}
          </div>

          <div className="relative flex w-full">
            <div
              className="sticky left-0 z-30 shrink-0 border-r border-brand-border bg-brand-background"
              style={{ width: calendarConfig.timeColumnWidthPx }}
            >
              <div className="relative" style={{ height: gridHeight }}>
                {timeSlots.map((slot) => (
                  <div
                    key={slot.minutes}
                    className="absolute left-0 right-0 flex items-start justify-end pr-2"
                    style={{ top: slot.topPx, height: 0 }}
                  >
                    {slot.label ? (
                      <span
                        className={`${
                          slot.topPx === 0 ? "mt-1" : "-mt-2"
                        } text-[11px] font-medium tabular-nums text-brand-text-muted/90`}
                      >
                        {slot.label}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {columns.map((col) => {
              const theme = getDoctorTheme(col.themeIndex);
              const colBlocks = blocksByColumn.get(col.key) ?? [];

              return (
                <div
                  key={col.key}
                  data-testid={`calendar-doctor-col-${col.key}`}
                  className={`calendar-doctor-col relative shrink-0 border-r border-brand-border/60 ${theme.column}`}
                >
                  <div className="relative" style={{ height: gridHeight }}>
                    {timeSlots.map((slot) => (
                      <div
                        key={`${col.key}-${slot.minutes}`}
                        className="absolute left-0 right-0 border-t border-brand-border/50"
                        style={{ top: slot.topPx }}
                        aria-hidden
                      />
                    ))}

                    {colBlocks.map((block) => (
                      <AppointmentCalendarCard
                        key={block.row?.id ?? `${block.startKey}-${col.key}`}
                        block={block}
                        onClick={onAppointmentClick}
                        onStateChange={onStateChange}
                        savingIds={savingIds}
                        isMenuOpen={openMenuId === block.row?.id}
                        onMenuOpen={() => setOpenMenuId(block.row?.id ?? null)}
                        onMenuClose={() => setOpenMenuId(null)}
                        style={{
                          top: block.topPx,
                          height: block.heightPx,
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {nowPosition ? (
              <CurrentTimeIndicator
                topPx={nowPosition.topPx}
                timeLabel={nowPosition.label}
                timeColumnWidthPx={calendarConfig.timeColumnWidthPx}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
