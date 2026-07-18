export const DAY_WIDTH = 32;
export const LABEL_WIDTH = 200;
export const BAR_HEIGHT = 24;
export const LANE_HEIGHT = 36;
export const BAR_INSET = (LANE_HEIGHT - BAR_HEIGHT) / 2;
export const BOX_PAD = 8;
export const NOTE_WIDTH = 96;
export const NOTE_HEIGHT = 56;
/** 1日分の描画幅と一致させる(item.span * DAY_WIDTH - 4 のspan=1のケース) */
export const MIN_BAR_WIDTH = DAY_WIDTH - 4;
/** レーン数がぴったりでも縦ドラッグの余白が残るよう、行の高さの下限を確保する */
export const MIN_ROW_HEIGHT = 200;

export const YEAR_ROW_HEIGHT = 20;
export const MONTH_ROW_HEIGHT = 20;
export const DAY_ROW_HEIGHT = 28;
export const HEADER_HEIGHT = YEAR_ROW_HEIGHT + MONTH_ROW_HEIGHT + DAY_ROW_HEIGHT;
