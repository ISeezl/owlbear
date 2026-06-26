import OBR from "@owlbear-rodeo/sdk";
import { useEffect, useMemo, useRef, useState } from "react";
import { ROLL_RESULT_CHANNEL } from "./constants";
import { MainMenu } from "./components/MainMenu";
import { RollEditor } from "./components/RollEditor";
import { TokenQuickMenu } from "./components/TokenQuickMenu";
import { icewindDalePreset } from "./presets/icewindDalePreset";
import { rollWithDicePlus } from "./obr/dicePlus";
import {
  emptyCharacterForPlayer,
  getPlayers,
  getRolls,
  getSettings,
  savePlayerSlots,
  saveRolls,
  saveSettings,
  syncPlayerSlots,
  waitForOwlbear,
} from "./obr/metadata";
import { registerContextMenu } from "./obr/registerContextMenu";
import { applyRollEffects } from "./utils/rollEffects";
import { canSeeRoll, canUseToken, getCurrentPlayer } from "./utils/permissions";
import { resolveFormula, rollFormulaLocally } from "./utils/formulaResolver";
import type { CharacterMetadata, ExtensionSettings, PendingRoll, PlayerSlot, RollConfig, RollOutcome } from "./types";

type View = "main" | "editor" | "quick";

export default function App() {
  const [view, setView] = useState<View>("main");
  const [rolls, setRolls] = useState<RollConfig[]>([]);
  const [visibleQuickRolls, setVisibleQuickRolls] = useState<RollConfig[]>([]);
  const [settings, setSettings] = useState<ExtensionSettings>({
    useDicePlus: true,
    allowPlayersToUseOwnedTokens: true,
    allowGmToUseAllTokens: true,
    defaultResultMode: "public",
  });
  const [slots, setSlots] = useState<PlayerSlot[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState({
    id: "local-player",
    name: "Jugador local",
    connectionId: "local-player",
    isGm: false,
  });
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>();
  const [editingRoll, setEditingRoll] = useState<RollConfig | undefined>();
  const [notice, setNotice] = useState("Listo.");
  const pendingRolls = useRef(new Map<string, PendingRoll>());
  const rollsRef = useRef<RollConfig[]>([]);
  const slotsRef = useRef<PlayerSlot[]>([]);

  const visibleSlots = useMemo(() => {
    if (currentPlayer.isGm) return slots;
    return slots.filter(
      (slot) => slot.playerId === currentPlayer.id || slot.playerConnectionId === currentPlayer.connectionId,
    );
  }, [currentPlayer.connectionId, currentPlayer.id, currentPlayer.isGm, slots]);

  const activeSlot = useMemo(
    () => visibleSlots.find((slot) => slot.playerId === selectedSlotId) ?? visibleSlots[0],
    [selectedSlotId, visibleSlots],
  );

  useEffect(() => {
    rollsRef.current = rolls;
  }, [rolls]);

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  async function refresh() {
    const [storedRolls, storedSettings, player, players] = await Promise.all([
      getRolls(),
      getSettings(),
      getCurrentPlayer(),
      getPlayers(),
    ]);
    const syncedSlots = await syncPlayerSlots([...players, player]);
    const nextVisibleSlots = player.isGm
      ? syncedSlots
      : syncedSlots.filter((slot) => slot.playerId === player.id || slot.playerConnectionId === player.connectionId);

    rollsRef.current = storedRolls;
    slotsRef.current = syncedSlots;
    setRolls(storedRolls);
    setSettings(storedSettings);
    setCurrentPlayer(player);
    setSlots(syncedSlots);
    setSelectedSlotId((current) => {
      if (current && nextVisibleSlots.some((slot) => slot.playerId === current)) return current;
      return nextVisibleSlots[0]?.playerId;
    });
  }

  useEffect(() => {
    waitForOwlbear().then(() => {
      registerContextMenu();
      refresh();
      try {
        OBR.player.onChange(() => refresh());
        OBR.party.onChange(() => refresh());
        OBR.room.onMetadataChange(() => refresh());
        OBR.broadcast.onMessage(ROLL_RESULT_CHANNEL, async (event) => {
          await handleRollResult(event.data as RollOutcome);
        });
      } catch {
        // Local development outside Owlbear.
      }
    });
  }, []);

  async function persistRolls(nextRolls: RollConfig[]) {
    rollsRef.current = nextRolls;
    setRolls(nextRolls);
    await saveRolls(nextRolls);
  }

  async function persistSettings(nextSettings: ExtensionSettings) {
    setSettings(nextSettings);
    await saveSettings(nextSettings);
  }

  async function persistSlots(nextSlots: PlayerSlot[]) {
    slotsRef.current = nextSlots;
    setSlots(nextSlots);
    await savePlayerSlots(nextSlots);
  }

  async function saveCharacter(playerId: string, character: CharacterMetadata) {
    const nextSlots = slots.map((slot) =>
      slot.playerId === playerId
        ? {
            ...slot,
            character: {
              ...character,
              ownerPlayerId: slot.playerId,
              ownerPlayerName: slot.playerName,
              ownerConnectionId: slot.playerConnectionId,
            },
            updatedAt: Date.now(),
          }
        : slot,
    );
    await persistSlots(nextSlots);
    setNotice(`Hoja guardada: ${character.characterName}.`);
  }

  async function clearCharacter(playerId: string) {
    const nextSlots = slots.map((slot) =>
      slot.playerId === playerId
        ? {
            ...slot,
            character: emptyCharacterForPlayer({
              id: slot.playerId,
              name: slot.playerName,
              connectionId: slot.playerConnectionId,
            }),
            updatedAt: Date.now(),
          }
        : slot,
    );
    await persistSlots(nextSlots);
    setNotice("Hoja reiniciada.");
  }

  async function openQuickMenu() {
    if (!activeSlot) {
      setNotice("No hay hoja disponible para tirar.");
      return;
    }

    const allowed = await Promise.all(rolls.map(async (roll) => ((await canSeeRoll(roll, activeSlot.character)) ? roll : undefined)));
    setVisibleQuickRolls(allowed.filter(Boolean) as RollConfig[]);
    setView("quick");
  }

  async function runRoll(roll: RollConfig) {
    const character = activeSlot?.character;
    if (roll.target !== "none" && !character) {
      setNotice("La tirada necesita una hoja activa.");
      return;
    }

    if (character && !(await canUseToken(character, settings))) {
      setNotice("No tienes permisos para usar esta hoja.");
      return;
    }

    try {
      const resolved = resolveFormula(roll.formula, character);
      let rollId: string;
      let localOutcome: RollOutcome | undefined;

      if (settings.useDicePlus) {
        rollId = await rollWithDicePlus({
          diceNotation: resolved,
          label: roll.name,
          showResults: roll.resultMode === "public",
        });
        setNotice(`Tirada enviada a Dice+: ${roll.name}.`);
      } else {
        rollId = `local_${Date.now()}`;
        localOutcome = { rollId, ...rollFormulaLocally(resolved) };
      }

      pendingRolls.current.set(rollId, {
        rollId,
        playerId: activeSlot?.playerId,
        rollConfigId: roll.id,
        createdAt: Date.now(),
      });

      if (localOutcome) await handleRollResult(localOutcome);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo ejecutar la tirada.");
    }
  }

  async function handleRollResult(outcome: RollOutcome) {
    const pending = pendingRolls.current.get(outcome.rollId);
    if (!pending) return;
    pendingRolls.current.delete(outcome.rollId);

    const roll = rollsRef.current.find((item) => item.id === pending.rollConfigId);
    if (!roll) return;

    const slot = slotsRef.current.find((item) => item.playerId === pending.playerId);
    const character = slot?.character;
    if (!character) {
      setNotice(`${roll.name}: total ${outcome.total}.`);
      return;
    }

    const result = applyRollEffects(roll, outcome, character);
    if (slot) {
      const nextSlots = slotsRef.current.map((item) =>
        item.playerId === slot.playerId ? { ...item, character: result.character, updatedAt: Date.now() } : item,
      );
      await persistSlots(nextSlots);
    }

    const messages = result.applied.map((effect) => effect.message).join(" ");
    setNotice(`${roll.name}: total ${outcome.total}. ${messages}`);
  }

  function saveRoll(roll: RollConfig) {
    const exists = rolls.some((item) => item.id === roll.id);
    persistRolls(exists ? rolls.map((item) => (item.id === roll.id ? roll : item)) : [...rolls, roll]);
    setEditingRoll(undefined);
    setView("main");
    setNotice(`Tirada guardada: ${roll.name}.`);
  }

  function loadPreset() {
    const byId = new Map(rolls.map((roll) => [roll.id, roll]));
    for (const roll of icewindDalePreset) byId.set(roll.id, roll);
    persistRolls(Array.from(byId.values()));
    setNotice("Preset Icewind Dale cargado.");
  }

  function exportPreset() {
    const payload = JSON.stringify({ name: "Token Roll Manager Preset", version: "1.0.0", rolls }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "token-roll-manager-preset.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importPreset(file: File) {
    try {
      const data = JSON.parse(await file.text()) as { rolls?: RollConfig[] };
      if (!Array.isArray(data.rolls)) throw new Error("JSON invalido.");
      await persistRolls(data.rolls);
      setNotice("Preset importado.");
    } catch {
      setNotice("No se pudo importar el preset.");
    }
  }

  const headerSubtitle = useMemo(() => {
    if (!activeSlot) return "Gestor editable de tiradas por hoja";
    return `${activeSlot.character.characterName} · ${activeSlot.playerName}`;
  }, [activeSlot]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>Token Roll Manager</h1>
          <p>{headerSubtitle}</p>
        </div>
        <button onClick={refresh}>Actualizar</button>
      </header>
      {view === "main" ? (
        <MainMenu
          slots={visibleSlots}
          selectedSlotId={activeSlot?.playerId}
          isGm={currentPlayer.isGm}
          rolls={rolls}
          settings={settings}
          onCreateRoll={() => {
            setEditingRoll(undefined);
            setView("editor");
          }}
          onEditRoll={(roll) => {
            setEditingRoll(roll);
            setView("editor");
          }}
          onDeleteRoll={(rollId) => persistRolls(rolls.filter((roll) => roll.id !== rollId))}
          onLoadPreset={loadPreset}
          onOpenQuickMenu={openQuickMenu}
          onSelectSlot={setSelectedSlotId}
          onSaveCharacter={saveCharacter}
          onClearCharacter={clearCharacter}
          onSettingsChange={persistSettings}
          onExport={exportPreset}
          onImport={importPreset}
        />
      ) : null}
      {view === "editor" ? <RollEditor roll={editingRoll} onSave={saveRoll} onCancel={() => setView("main")} /> : null}
      {view === "quick" ? <TokenQuickMenu slot={activeSlot} rolls={visibleQuickRolls} onRoll={runRoll} onClose={() => setView("main")} /> : null}
      <footer className="notice">{notice}</footer>
    </main>
  );
}
