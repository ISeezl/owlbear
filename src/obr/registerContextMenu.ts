import OBR from "@owlbear-rodeo/sdk";
import { EXTENSION_ID } from "../constants";

export async function registerContextMenu() {
  try {
    await OBR.contextMenu.create({
      id: `${EXTENSION_ID}/open-rolls`,
      icons: [
        {
          icon: "/icons/dice.svg",
          label: "Abrir tiradas",
          filter: {
            roles: ["GM", "PLAYER"],
          },
        },
      ],
      onClick() {
        OBR.action.open();
      },
    });
  } catch {
    // Context menus only exist inside Owlbear.
  }
}
