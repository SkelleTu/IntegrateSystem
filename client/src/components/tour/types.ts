export type TourMode = "quick" | "detailed";

export interface TourStep {
  /** data-tour attribute value on the target element; null = center card (no spotlight) */
  target: string | null;
  title: string;
  description: string;
  /** Which side the tooltip appears on. 'auto' = compute from available space. */
  position?: "top" | "bottom" | "left" | "right" | "auto";
  /** Extra padding around the spotlight box (px) */
  padding?: number;
}

export interface TourContextValue {
  active: boolean;
  mode: TourMode | null;
  stepIndex: number;
  isFirstTime: boolean;
  steps: TourStep[];
  /** Open the mode-selection screen */
  openModeSelect: (isFirstTime?: boolean) => void;
  /** Start a specific mode (skips the selection screen) */
  startMode: (mode: TourMode) => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
}
