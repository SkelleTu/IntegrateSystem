import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { TourContextValue, TourMode, TourStep } from "./types";
import { quickSteps, detailedSteps } from "./steps";

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used inside <TourProvider>");
  return ctx;
}

interface TourProviderProps {
  children: ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<TourMode | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isFirstTime, setIsFirstTime] = useState(false);

  const steps: TourStep[] = mode === "quick" ? quickSteps : mode === "detailed" ? detailedSteps : [];

  const openModeSelect = useCallback((firstTime = false) => {
    setIsFirstTime(firstTime);
    setMode(null);
    setStepIndex(0);
    setActive(true);
  }, []);

  const startMode = useCallback((m: TourMode) => {
    setMode(m);
    setStepIndex(0);
    setActive(true);
  }, []);

  const next = useCallback(() => {
    setStepIndex(i => {
      const max = (mode === "quick" ? quickSteps : detailedSteps).length - 1;
      if (i >= max) {
        // End of tour
        setActive(false);
        setMode(null);
        return 0;
      }
      return i + 1;
    });
  }, [mode]);

  const prev = useCallback(() => {
    setStepIndex(i => {
      if (i === 0) {
        // Go back to mode selection
        setMode(null);
        return 0;
      }
      return i - 1;
    });
  }, []);

  const stop = useCallback(() => {
    setActive(false);
    setMode(null);
    setStepIndex(0);
  }, []);

  return (
    <TourContext.Provider value={{ active, mode, stepIndex, isFirstTime, steps, openModeSelect, startMode, next, prev, stop }}>
      {children}
    </TourContext.Provider>
  );
}
