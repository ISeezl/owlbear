import OBR from "@owlbear-rodeo/sdk";
import type { CharacterMetadata, ExtensionSettings, RollConfig } from "../types";

export async function getCurrentPlayer() {
  try {
    const [role, name, id, connectionId] = await Promise.all([
      OBR.player.getRole(),
      OBR.player.getName(),
      OBR.player.getId(),
      OBR.player.getConnectionId(),
    ]);
    return { id, name, connectionId, isGm: role === "GM" };
  } catch {
    return { id: "local-player", name: "Jugador local", connectionId: "local-player", isGm: false };
  }
}

export async function canUseToken(character: CharacterMetadata, settings: ExtensionSettings) {
  const player = await getCurrentPlayer();
  if (player.isGm) return settings.allowGmToUseAllTokens;
  return (
    settings.allowPlayersToUseOwnedTokens &&
    (character.ownerPlayerId === player.id || character.ownerConnectionId === player.connectionId)
  );
}

export async function canSeeRoll(roll: RollConfig, character?: CharacterMetadata) {
  const player = await getCurrentPlayer();
  if (roll.ownerPlayerId || roll.ownerConnectionId) {
    if (player.isGm) return true;
    return (
      roll.ownerPlayerId === player.id ||
      roll.ownerConnectionId === player.connectionId ||
      Boolean(
        character &&
          (character.ownerPlayerId === roll.ownerPlayerId || character.ownerConnectionId === roll.ownerConnectionId),
      )
    );
  }
  if (roll.visibility === "everyone") return true;
  if (player.isGm) return true;
  if (roll.visibility === "gm_only") return false;
  return Boolean(character && (character.ownerPlayerId === player.id || character.ownerConnectionId === player.connectionId));
}
