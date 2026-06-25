import OBR from "@owlbear-rodeo/sdk";
import { DICE_PLUS_REQUEST_CHANNEL, EXTENSION_ID } from "../constants";

export async function rollWithDicePlus(params: {
  diceNotation: string;
  label: string;
  tokenId?: string;
  showResults?: boolean;
}) {
  const rollId = `roll_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  try {
    const playerName = await OBR.player.getName();
    await OBR.broadcast.sendMessage(
      DICE_PLUS_REQUEST_CHANNEL,
      {
        rollId,
        playerId: OBR.player.id,
        playerName,
        rollTarget: "everyone",
        diceNotation: `${params.diceNotation} # ${params.label}`,
        showResults: params.showResults ?? true,
        timestamp: Date.now(),
        source: EXTENSION_ID,
        tokenId: params.tokenId,
      },
      { destination: "ALL" },
    );
    return rollId;
  } catch {
    return rollId;
  }
}
