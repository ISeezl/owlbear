import OBR from "@owlbear-rodeo/sdk";
import type { CharacterMetadata, ExtensionSettings, RollConfig } from "../types";

export async function getCurrentPlayer() {
  try {
    const [role, name] = await Promise.all([OBR.player.getRole(), OBR.player.getName()]);
    return { id: OBR.player.id, name, isGm: role === "GM" };
  } catch {
    return { id: "local-player", name: "Jugador local", isGm: false };
  }
}

export async function canUseToken(character: CharacterMetadata, settings: ExtensionSettings) {
  const player = await getCurrentPlayer();
  if (player.isGm) return settings.allowGmToUseAllTokens;
  return settings.allowPlayersToUseOwnedTokens && character.ownerPlayerId === player.id;
}

export async function canSeeRoll(roll: RollConfig, character?: CharacterMetadata) {
  const player = await getCurrentPlayer();
  if (roll.visibility === "everyone") return true;
  if (player.isGm) return true;
  if (roll.visibility === "gm_only") return false;
  return Boolean(character && character.ownerPlayerId === player.id);
}
