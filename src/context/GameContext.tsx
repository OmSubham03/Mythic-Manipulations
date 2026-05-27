import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface GameState {
  coins: number;
  reputation: number;
  completedTreatments: number;
  highScore: number;
  ownedUpgrades: string[];
  totalCrackCount: number;
  doctorName: string;
  tutorialComplete: boolean;
}

interface GameContextValue extends GameState {
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addReputation: (amount: number) => void;
  loseReputation: (amount: number) => void;
  recordTreatment: (success: boolean) => void;
  recordCrack: () => void;
  purchaseUpgrade: (upgradeId: string, cost: number) => boolean;
  hasUpgrade: (upgradeId: string) => boolean;
  updateHighScore: (score: number) => void;
  setDoctorName: (name: string) => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

const STORAGE_KEY = "@mythic_game_state";

const DEFAULT_STATE: GameState = {
  coins: 150,
  reputation: 50,
  completedTreatments: 0,
  highScore: 0,
  ownedUpgrades: [],
  totalCrackCount: 0,
  doctorName: "",
  tutorialComplete: false,
};

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<GameState>;
          setState({ ...DEFAULT_STATE, ...parsed });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const save = useCallback((newState: GameState) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState)).catch(() => {});
  }, []);

  const updateState = useCallback(
    (updater: (prev: GameState) => GameState) => {
      setState((prev) => {
        const next = updater(prev);
        save(next);
        return next;
      });
    },
    [save]
  );

  const addCoins = useCallback(
    (amount: number) => {
      updateState((prev) => ({ ...prev, coins: prev.coins + amount }));
    },
    [updateState]
  );

  const spendCoins = useCallback(
    (amount: number): boolean => {
      let success = false;
      updateState((prev) => {
        if (prev.coins >= amount) {
          success = true;
          return { ...prev, coins: prev.coins - amount };
        }
        return prev;
      });
      return success;
    },
    [updateState]
  );

  const addReputation = useCallback(
    (amount: number) => {
      updateState((prev) => ({
        ...prev,
        reputation: Math.min(100, prev.reputation + amount),
      }));
    },
    [updateState]
  );

  const loseReputation = useCallback(
    (amount: number) => {
      updateState((prev) => ({
        ...prev,
        reputation: Math.max(0, prev.reputation - amount),
      }));
    },
    [updateState]
  );

  const recordTreatment = useCallback(
    (success: boolean) => {
      updateState((prev) => ({
        ...prev,
        completedTreatments: success
          ? prev.completedTreatments + 1
          : prev.completedTreatments,
      }));
    },
    [updateState]
  );

  const recordCrack = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      totalCrackCount: prev.totalCrackCount + 1,
    }));
  }, [updateState]);

  const purchaseUpgrade = useCallback(
    (upgradeId: string, cost: number): boolean => {
      let success = false;
      updateState((prev) => {
        if (prev.coins >= cost && !prev.ownedUpgrades.includes(upgradeId)) {
          success = true;
          return {
            ...prev,
            coins: prev.coins - cost,
            ownedUpgrades: [...prev.ownedUpgrades, upgradeId],
          };
        }
        return prev;
      });
      return success;
    },
    [updateState]
  );

  const hasUpgrade = useCallback(
    (upgradeId: string): boolean => {
      return state.ownedUpgrades.includes(upgradeId);
    },
    [state.ownedUpgrades]
  );

  const updateHighScore = useCallback(
    (score: number) => {
      updateState((prev) => ({
        ...prev,
        highScore: Math.max(prev.highScore, score),
      }));
    },
    [updateState]
  );

  const setDoctorName = useCallback(
    (name: string) => {
      updateState((prev) => ({ ...prev, doctorName: name }));
    },
    [updateState]
  );

  const completeTutorial = useCallback(() => {
    updateState((prev) => ({ ...prev, tutorialComplete: true }));
  }, [updateState]);

  const resetTutorial = useCallback(() => {
    updateState((prev) => ({ ...prev, tutorialComplete: false }));
  }, [updateState]);

  if (!loaded) return null;

  return (
    <GameContext.Provider
      value={{
        ...state,
        addCoins,
        spendCoins,
        addReputation,
        loseReputation,
        recordTreatment,
        recordCrack,
        purchaseUpgrade,
        hasUpgrade,
        updateHighScore,
        setDoctorName,
        completeTutorial,
        resetTutorial,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
