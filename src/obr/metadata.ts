import OBR from "@owlbear-rodeo/sdk";
import { CHARACTER_METADATA_KEY, ROLLS_METADATA_KEY, SETTINGS_METADATA_KEY } from "../constants";
import type { CharacterMetadata, ExtensionSettings, RollConfig, SelectedToken } from "../types";

const fallbackStore = {
  rolls: [] as RollConfig[],
  settings: undefined as ExtensionSettings | undefined,
  selected: undefined as SelectedToken | undefined,
};

export function isOwlbearReady() {
  return typeof window !== "undefined" && Boolean(window.location.ancestorOrigins?.length);
}

export async function waitForOwlbear() {
  try {
    if (OBR.isReady) return true;
    await new Promise<void>((resolve) => OBR.onReady(resolve));
    return true;
  } catch {
    return false;
  }
}

export async function getRolls(): Promise<RollConfig[]> {
  try {
    const metadata = await OBR.room.getMetadata();
    return (metadata[ROLLS_METADATA_KEY] as RollConfig[] | undefined) ?? [];
  } catch {
    return fallbackStore.rolls;
  }
}

export async function saveRolls(rolls: RollConfig[]) {
  fallbackStore.rolls = rolls;
  try {
    await OBR.room.setMetadata({ [ROLLS_METADATA_KEY]: rolls });
  } catch {
    localStorage.setItem(ROLLS_METADATA_KEY, JSON.stringify(rolls));
  }
}

export async function getSettings(): Promise<ExtensionSettings> {
  const defaults: ExtensionSettings = {
    useDicePlus: true,
    allowPlayersToUseOwnedTokens: true,
    allowGmToUseAllTokens: true,
    defaultResultMode: "public",
  };

  try {
    const metadata = await OBR.room.getMetadata();
    return { ...defaults, ...((metadata[SETTINGS_METADATA_KEY] as ExtensionSettings | undefined) ?? {}) };
  } catch {
    return { ...defaults, ...(fallbackStore.settings ?? {}) };
  }
}

export async function saveSettings(settings: ExtensionSettings) {
  fallbackStore.settings = settings;
  try {
    await OBR.room.setMetadata({ [SETTINGS_METADATA_KEY]: settings });
  } catch {
    localStorage.setItem(SETTINGS_METADATA_KEY, JSON.stringify(settings));
  }
}

export async function getSelectedToken(): Promise<SelectedToken | undefined> {
  try {
    const selection = await OBR.player.getSelection();
    if (!selection?.length) return undefined;
    const items = await OBR.scene.items.getItems(selection);
    const item = items[0];
    if (!item) return undefined;

    return {
      id: item.id,
      name: item.name || "Token sin nombre",
      character: item.metadata[CHARACTER_METADATA_KEY] as CharacterMetadata | undefined,
    };
  } catch {
    return fallbackStore.selected;
  }
}

export async function setTokenCharacter(tokenId: string, character?: CharacterMetadata) {
  try {
    await OBR.scene.items.updateItems([tokenId], (items) => {
      for (const item of items) {
        if (character) item.metadata[CHARACTER_METADATA_KEY] = character;
        else delete item.metadata[CHARACTER_METADATA_KEY];
      }
    });
  } catch {
    fallbackStore.selected = fallbackStore.selected
      ? { ...fallbackStore.selected, character }
      : { id: tokenId, name: "Token de prueba", character };
  }
}

export async function getTokenCharacter(tokenId: string): Promise<CharacterMetadata | undefined> {
  try {
    const items = await OBR.scene.items.getItems([tokenId]);
    return items[0]?.metadata[CHARACTER_METADATA_KEY] as CharacterMetadata | undefined;
  } catch {
    return fallbackStore.selected?.id === tokenId ? fallbackStore.selected.character : undefined;
  }
}

export async function getPlayers() {
  try {
    const players = await OBR.party.getPlayers();
    return players.map((player) => ({ id: player.id, name: player.name || player.id }));
  } catch {
    return [{ id: "local-player", name: "Jugador local" }];
  }
}
