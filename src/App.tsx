import OBR from "@owlbear-rodeo/sdk";
import { useEffect, useMemo, useRef, useState } from "react";
import { ROLL_RESULT_CHANNEL } from "./constants";
import { MainMenu } from "./components/MainMenu";
import { RollEditor } from "./components/RollEditor";
import { TokenQuickMenu } from "./components/TokenQuickMenu";
import { icewindDalePreset } from "./presets/icewindDalePreset";
import { rollWithDicePlus } from "./obr/dicePlus";
import { getRolls, getSelectedToken, getSettings, saveRolls, saveSettings, setTokenCharacter, waitForOwlbear } from "./obr/metadata";
import { registerContextMenu } from "./obr/registerContextMenu";
import { applyRollEffects } from "./utils/rollEffects";
import { canSeeRoll, canUseToken } from "./utils/permissions";
import { resolveFormula, rollFormulaLocally } from "./utils/formulaResolver";
import type { CharacterMetadata, ExtensionSettings, PendingRoll, RollConfig, RollOutcome, SelectedToken } from "./types";

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
  const [selectedToken, setSelectedToken] = useState<SelectedToken | undefined>();
  const [editingRoll, setEditingRoll] = useState<RollConfig | undefined>();
  const [notice, setNotice] = useState("Listo.");
  const pendingRolls = useRef(new Map<string, PendingRoll>());

  async function refresh() {
    const [storedRolls, storedSettings, token] = await Promise.all([getRolls(), getSettings(), getSelectedToken()]);
    setRolls(storedRolls);
    setSettings(storedSettings);
    setSelectedToken(token);
  }

  useEffect(() => {
    waitForOwlbear().then(() => {
      registerContextMenu();
      refresh();
      try {
        OBR.scene.items.onChange(() => refresh());
        OBR.player.onChange(() => refresh());
        OBR.broadcast.onMessage(ROLL_RESULT_CHANNEL, async (event) => {
          await handleRollResult(event.data as RollOutcome);
        });
      } catch {
        // Local development outside Owlbear.
      }
    });
  }, []);

  const tokenCharacter = selectedToken?.character;

  async function persistRolls(nextRolls: RollConfig[]) {
    setRolls(nextRolls);
    await saveRolls(nextRolls);
  }

  async function persistSettings(nextSettings: ExtensionSettings) {
    setSettings(nextSettings);
    await saveSettings(nextSettings);
  }

  async function saveCharacter(character: CharacterMetadata) {
    if (!selectedToken) return;
    await setTokenCharacter(selectedToken.id, character);
    setSelectedToken({ ...selectedToken, character });
    setNotice(`Personaje guardado: ${character.characterName}.`);
  }

  async function clearCharacter() {
    if (!selectedToken) return;
    await setTokenCharacter(selectedToken.id, undefined);
    setSelectedToken({ ...selectedToken, character: undefined });
    setNotice("Asignación limpiada.");
  }

  async function openQuickMenu() {
    const currentToken = await getSelectedToken();
    setSelectedToken(currentToken);
    if (!currentToken?.character) {
      setNotice("Selecciona un token con personaje asignado.");
      return;
    }

    const allowed = await Promise.all(rolls.map(async (roll) => ((await canSeeRoll(roll, currentToken.character)) ? roll : undefined)));
    setVisibleQuickRolls(allowed.filter(Boolean) as RollConfig[]);
    setView("quick");
  }

  async function runRoll(roll: RollConfig) {
    const currentToken = await getSelectedToken();
    const character = currentToken?.character;
    if (roll.target !== "none" && (!currentToken || !character)) {
      setNotice("La tirada necesita un token con personaje asignado.");
      return;
    }

    if (character && !(await canUseToken(character, settings))) {
      setNotice("No tienes permisos para usar este token.");
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
          tokenId: currentToken?.id,
          showResults: roll.resultMode === "public",
        });
        setNotice(`Tirada enviada a Dice+: ${roll.name}.`);
      } else {
        rollId = `local_${Date.now()}`;
        localOutcome = { rollId, ...rollFormulaLocally(resolved) };
      }

      pendingRolls.current.set(rollId, {
        rollId,
        tokenId: currentToken?.id,
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

    const roll = rolls.find((item) => item.id === pending.rollConfigId);
    if (!roll) return;

    const token = await getSelectedToken();
    const character = token?.character;
    if (!pending.tokenId || !character) {
      setNotice(`${roll.name}: total ${outcome.total}.`);
      return;
    }

    const result = applyRollEffects(roll, outcome, character);
    await setTokenCharacter(pending.tokenId, result.character);
    setSelectedToken(token ? { ...token, character: result.character } : token);
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
      if (!Array.isArray(data.rolls)) throw new Error("JSON inválido.");
      await persistRolls(data.rolls);
      setNotice("Preset importado.");
    } catch {
      setNotice("No se pudo importar el preset.");
    }
  }

  const headerSubtitle = useMemo(() => {
    if (!tokenCharacter) return "Gestor editable de tiradas por token";
    return `${tokenCharacter.characterName} · ${tokenCharacter.ownerPlayerName}`;
  }, [tokenCharacter]);

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
          selectedToken={selectedToken}
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
          onSaveCharacter={saveCharacter}
          onClearCharacter={clearCharacter}
          onSettingsChange={persistSettings}
          onExport={exportPreset}
          onImport={importPreset}
        />
      ) : null}
      {view === "editor" ? <RollEditor roll={editingRoll} onSave={saveRoll} onCancel={() => setView("main")} /> : null}
      {view === "quick" ? (
        <TokenQuickMenu token={selectedToken} rolls={visibleQuickRolls} onRoll={runRoll} onClose={() => setView("main")} />
      ) : null}
      <footer className="notice">{notice}</footer>
    </main>
  );
}
