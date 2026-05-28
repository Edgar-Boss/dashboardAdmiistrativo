import { CALENDAR_CONFIG } from "./calendarConfig";

export const CARD_VARIANT = {
  COMPACT: "compact",
  NORMAL: "normal",
  LARGE: "large",
};

/** Visual density by real appointment duration */
export function getCardVariant(
  durationMinutes,
  slotMinutes = CALENDAR_CONFIG.slotMinutes,
) {
  if (durationMinutes <= slotMinutes) return CARD_VARIANT.COMPACT;
  if (durationMinutes <= slotMinutes * 2) return CARD_VARIANT.NORMAL;
  return CARD_VARIANT.LARGE;
}

/**
 * Block height in px — accounts for slot span, card inset, and minimum content height.
 * Compact cards use compactMinHeightPx so name + badge + time never clip.
 */
export function computeCardBlockHeight(
  slotCount,
  variant,
  config = CALENDAR_CONFIG,
) {
  const slotSpanPx = slotCount * config.rowHeightPx;
  const inset = config.cardVerticalInsetPx ?? 2;
  const betweenSlots = Math.max(0, slotCount - 1) * (config.cardStackGapPx ?? 0);

  switch (variant) {
    case CARD_VARIANT.COMPACT:
      return Math.max(
        config.compactMinHeightPx,
        config.rowHeightPx - inset * 2,
      );
    case CARD_VARIANT.NORMAL:
      return Math.max(
        config.normalMinHeightPx,
        slotSpanPx - inset * 2 - betweenSlots,
      );
    case CARD_VARIANT.LARGE:
    default:
      return Math.max(
        config.largeMinHeightPx ?? config.normalMinHeightPx,
        slotSpanPx - inset * 2 - betweenSlots,
      );
  }
}
