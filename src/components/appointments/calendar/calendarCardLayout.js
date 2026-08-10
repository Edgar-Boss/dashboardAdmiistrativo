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
 * Block height in px — always capped to the appointment's time-span so cards
 * never overlap the next slot. Content must fit inside this box (overflow hidden).
 */
export function computeCardBlockHeight(
  slotCount,
  _variant,
  config = CALENDAR_CONFIG,
) {
  const slotSpanPx = slotCount * config.rowHeightPx;
  const inset = config.cardVerticalInsetPx ?? 2;
  const betweenSlots = Math.max(0, slotCount - 1) * (config.cardStackGapPx ?? 0);
  return Math.max(0, slotSpanPx - inset * 2 - betweenSlots);
}
