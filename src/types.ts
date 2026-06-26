export type RollType = "normal" | "save" | "death_save" | "table" | "custom";
export type RollVisibility = "everyone" | "gm_only" | "owner_and_gm";
export type RollTarget = "active_sheet" | "selected_token" | "self" | "none";
export type ResultMode = "public" | "private" | "gm_only";
export type EffectCondition = "success" | "failure" | "natural_1" | "natural_20" | "always";
export type EffectOperation = "increment" | "decrement" | "set";

export type RollEffect = {
  id: string;
  condition: EffectCondition;
  message: string;
  updateToken?: {
    field: string;
    operation: EffectOperation;
    value: number | string | boolean;
  };
};

export type RollConfig = {
  id: string;
  name: string;
  icon: string;
  formula: string;
  description?: string;
  type: RollType;
  dc?: number;
  visibility: RollVisibility;
  target: RollTarget;
  resultMode: ResultMode;
  effects: RollEffect[];
};

export type DeathSaves = {
  success: number;
  failure: number;
};

export type ColdState = {
  exhaustion: number;
  frost: number;
  hasColdWeatherClothing: boolean;
  wetClothing: boolean;
};

export type CharacterMetadata = {
  ownerPlayerId: string;
  ownerPlayerName: string;
  ownerConnectionId?: string;
  characterName: string;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
    proficiencyBonus: number;
  };
  skills?: Record<string, number>;
  deathSaves: DeathSaves;
  cold: ColdState;
};

export type PlayerSlot = {
  playerId: string;
  playerName: string;
  playerConnectionId?: string;
  character: CharacterMetadata;
  connected: boolean;
  updatedAt: number;
};

export type ExtensionSettings = {
  useDicePlus: boolean;
  allowPlayersToUseOwnedTokens: boolean;
  allowGmToUseAllTokens: boolean;
  defaultResultMode: ResultMode;
};

export type SelectedToken = {
  id: string;
  name: string;
  character?: CharacterMetadata;
};

export type RollOutcome = {
  rollId: string;
  total: number;
  natural?: number;
  detail?: unknown;
};

export type PendingRoll = {
  rollId: string;
  playerId?: string;
  rollConfigId: string;
  createdAt: number;
};
