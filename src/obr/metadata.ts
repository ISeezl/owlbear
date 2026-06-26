import OBR from "@owlbear-rodeo/sdk";
import { CHARACTER_METADATA_KEY, PLAYER_SLOTS_METADATA_KEY, ROLLS_METADATA_KEY, SETTINGS_METADATA_KEY } from "../constants";
import type { CharacterMetadata, ExtensionSettings, PlayerSlot, RollConfig, SelectedToken } from "../types";

type PlayerSummary = { id: string; name: string; isGm: boolean; connectionId?: string };

const fallbackStore = {
  rolls: [] as RollConfig[],
  settings: undefined as ExtensionSettings | undefined,
  slots: [] as PlayerSlot[],
  selected: undefined as SelectedToken | undefined,
};

export const emptyCharacterForPlayer = (
  player: { id: string; name: string; connectionId?: string },
  name = player.name,
): CharacterMetadata => ({
  ownerPlayerId: player.id,
  ownerPlayerName: player.name,
  ownerConnectionId: player.connectionId,
  characterName: name || "Personaje",
  stats: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0, proficiencyBonus: 2 },
  skills: { survival: 0, perception: 0, athletics: 0 },
  deathSaves: { success: 0, failure: 0 },
  cold: { exhaustion: 0, frost: 0, hasColdWeatherClothing: true, wetClothing: false },
});

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

export async function getPlayerSlots(): Promise<PlayerSlot[]> {
  try {
    const metadata = await OBR.room.getMetadata();
    return (metadata[PLAYER_SLOTS_METADATA_KEY] as PlayerSlot[] | undefined) ?? [];
  } catch {
    return fallbackStore.slots;
  }
}

export async function savePlayerSlots(slots: PlayerSlot[]) {
  fallbackStore.slots = slots;
  try {
    await OBR.room.setMetadata({ [PLAYER_SLOTS_METADATA_KEY]: slots });
  } catch {
    localStorage.setItem(PLAYER_SLOTS_METADATA_KEY, JSON.stringify(slots));
  }
}

export async function syncPlayerSlots(players: PlayerSummary[]) {
  const storedSlots = await getPlayerSlots();
  const byPlayer = new Map(storedSlots.map((slot) => [slot.playerId, slot]));
  const byConnection = new Map(storedSlots.filter((slot) => slot.playerConnectionId).map((slot) => [slot.playerConnectionId, slot]));
  const uniquePlayers = Array.from(new Map(players.map((player) => [player.id, player])).values());
  const playerSlots = uniquePlayers.filter((player) => !player.isGm);
  const connectedPlayerIds = new Set(playerSlots.map((player) => player.id));
  const connectedConnectionIds = new Set(playerSlots.map((player) => player.connectionId).filter(Boolean));

  const updatedSlots = storedSlots.map((slot) => ({
    ...slot,
    connected: connectedPlayerIds.has(slot.playerId) || Boolean(slot.playerConnectionId && connectedConnectionIds.has(slot.playerConnectionId)),
  }));

  const slots = [...updatedSlots];

  for (const player of playerSlots) {
    const existing = byPlayer.get(player.id) ?? (player.connectionId ? byConnection.get(player.connectionId) : undefined);
    if (existing) {
      const index = slots.findIndex(
        (slot) => slot.playerId === existing.playerId || Boolean(existing.playerConnectionId && slot.playerConnectionId === existing.playerConnectionId),
      );
      slots[index] = {
        ...existing,
        playerId: player.id,
        playerName: player.name,
        playerConnectionId: player.connectionId,
        connected: true,
        character: {
          ...existing.character,
          ownerPlayerId: player.id,
          ownerPlayerName: player.name,
          ownerConnectionId: player.connectionId,
        },
      };
      continue;
    }

    slots.push({
      playerId: player.id,
      playerName: player.name,
      playerConnectionId: player.connectionId,
      character: { ...emptyCharacterForPlayer(player), ownerConnectionId: player.connectionId },
      connected: true,
      updatedAt: Date.now(),
    });
  }

  if (JSON.stringify(slots) !== JSON.stringify(storedSlots)) await savePlayerSlots(slots);
  return slots;
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

export async function getPlayers(): Promise<PlayerSummary[]> {
  try {
    const players = await OBR.party.getPlayers();
    return players.map((player) => ({
      id: player.id,
      name: player.name || player.id,
      isGm: player.role === "GM",
      connectionId: player.connectionId,
    }));
  } catch {
    return [{ id: "local-player", name: "Jugador local", isGm: false }];
  }
}
