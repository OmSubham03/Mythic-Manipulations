import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import DeviceInfo from "react-native-device-info";
import { Platform } from "react-native";

export interface TreatmentRecord {
  patientType: string;
  ailments: string[];
  timestamp: number;
}

export interface DeviceMetadata {
  deviceId: string;
  model: string;
  brand: string;
  systemName: string;
  systemVersion: string;
  appVersion: string;
  buildNumber: string;
  deviceType: string;
  isEmulator: boolean;
  firstInstallTime: number;
  lastUpdateTime: number;
}

interface GameState {
  coins: number;
  reputation: number;
  completedTreatments: number;
  highScore: number;
  ownedUpgrades: string[];
  totalCrackCount: number;
  doctorName: string;
  avatarIndex: number;
  tutorialComplete: boolean;
  treatmentHistory: TreatmentRecord[];
  deviceInfo: DeviceMetadata | null;
}

interface GameContextValue extends GameState {
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addReputation: (amount: number) => void;
  loseReputation: (amount: number) => void;
  recordTreatment: (success: boolean, patientType?: string, ailments?: string[]) => void;
  recordCrack: () => void;
  purchaseUpgrade: (upgradeId: string, cost: number) => boolean;
  hasUpgrade: (upgradeId: string) => boolean;
  updateHighScore: (score: number) => void;
  setDoctorName: (name: string) => void;
  setAvatarIndex: (index: number) => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

const STORAGE_KEY = "@mythic_game_state";

const DEFAULT_STATE: GameState = {
  coins: 150,
  reputation: 0,
  completedTreatments: 0,
  highScore: 0,
  ownedUpgrades: [],
  totalCrackCount: 0,
  doctorName: "",
  avatarIndex: 0,
  tutorialComplete: false,
  treatmentHistory: [],
  deviceInfo: null,
};

async function collectDeviceInfo(): Promise<DeviceMetadata> {
  const [deviceId, isEmulator, firstInstall, lastUpdate, deviceType] = await Promise.all([
    DeviceInfo.getUniqueId(),
    DeviceInfo.isEmulator(),
    DeviceInfo.getFirstInstallTime(),
    DeviceInfo.getLastUpdateTime(),
    DeviceInfo.getDeviceType(),
  ]);
  return {
    deviceId,
    model: DeviceInfo.getModel(),
    brand: DeviceInfo.getBrand(),
    systemName: DeviceInfo.getSystemName(),
    systemVersion: DeviceInfo.getSystemVersion(),
    appVersion: DeviceInfo.getVersion(),
    buildNumber: DeviceInfo.getBuildNumber(),
    deviceType,
    isEmulator,
    firstInstallTime: firstInstall,
    lastUpdateTime: lastUpdate,
  };
}

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

  // Collect device info once on first load
  useEffect(() => {
    if (!loaded) return;
    collectDeviceInfo()
      .then((info) => {
        setState((prev) => {
          const next = { ...prev, deviceInfo: info };
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
          return next;
        });
      })
      .catch(() => {});
  }, [loaded]);

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
        reputation: prev.reputation + amount,
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
    (success: boolean, patientType?: string, ailments?: string[]) => {
      updateState((prev) => {
        const next = {
          ...prev,
          completedTreatments: success
            ? prev.completedTreatments + 1
            : prev.completedTreatments,
        };
        if (success && patientType) {
          next.treatmentHistory = [
            ...prev.treatmentHistory,
            {
              patientType,
              ailments: ailments || [],
              timestamp: Date.now(),
            },
          ];
        }
        return next;
      });
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

  const setAvatarIndex = useCallback(
    (index: number) => {
      updateState((prev) => ({ ...prev, avatarIndex: index }));
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
        setAvatarIndex,
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
