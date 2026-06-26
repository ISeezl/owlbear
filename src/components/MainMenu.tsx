import type { ExtensionSettings, PlayerSlot, RollConfig } from "../types";
import { RollList } from "./RollList";
import { TokenAssignment } from "./TokenAssignment";

type Props = {
  slots: PlayerSlot[];
  selectedSlotId?: string;
  isGm: boolean;
  rolls: RollConfig[];
  settings: ExtensionSettings;
  onCreateRoll: () => void;
  onEditRoll: (roll: RollConfig) => void;
  onDeleteRoll: (rollId: string) => void;
  onLoadPreset: () => void;
  onOpenQuickMenu: () => void;
  onSelectSlot: (playerId: string) => void;
  onSaveCharacter: Parameters<typeof TokenAssignment>[0]["onSave"];
  onClearCharacter: Parameters<typeof TokenAssignment>[0]["onClear"];
  onSettingsChange: (settings: ExtensionSettings) => void;
  onExport: () => void;
  onImport: (file: File) => void;
};

export function MainMenu({
  slots,
  selectedSlotId,
  isGm,
  rolls,
  settings,
  onCreateRoll,
  onEditRoll,
  onDeleteRoll,
  onLoadPreset,
  onOpenQuickMenu,
  onSelectSlot,
  onSaveCharacter,
  onClearCharacter,
  onSettingsChange,
  onExport,
  onImport,
}: Props) {
  return (
    <>
      <TokenAssignment
        slots={slots}
        selectedSlotId={selectedSlotId}
        isGm={isGm}
        onSelectSlot={onSelectSlot}
        onSave={onSaveCharacter}
        onClear={onClearCharacter}
      />
      <RollList
        rolls={rolls}
        onCreate={onCreateRoll}
        onEdit={onEditRoll}
        onDelete={onDeleteRoll}
        onLoadPreset={onLoadPreset}
        onOpenQuickMenu={onOpenQuickMenu}
      />
      <section className="panel">
        <div className="section-title">
          <h2>Presets</h2>
        </div>
        <div className="button-row">
          <button onClick={onExport}>Exportar JSON</button>
          <label className="file-button">
            Importar JSON
            <input
              type="file"
              accept="application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onImport(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </section>
      <section className="panel">
        <div className="section-title">
          <h2>Configuracion</h2>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.useDicePlus}
            onChange={(event) => onSettingsChange({ ...settings, useDicePlus: event.target.checked })}
          />
          Usar Dice+
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.allowPlayersToUseOwnedTokens}
            onChange={(event) => onSettingsChange({ ...settings, allowPlayersToUseOwnedTokens: event.target.checked })}
          />
          Jugadores usan su hoja
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.allowGmToUseAllTokens}
            onChange={(event) => onSettingsChange({ ...settings, allowGmToUseAllTokens: event.target.checked })}
          />
          GM usa todas las hojas
        </label>
        <label>
          Resultado por defecto
          <select
            value={settings.defaultResultMode}
            onChange={(event) =>
              onSettingsChange({ ...settings, defaultResultMode: event.target.value as ExtensionSettings["defaultResultMode"] })
            }
          >
            <option value="public">Publico</option>
            <option value="private">Privado</option>
            <option value="gm_only">Solo GM</option>
          </select>
        </label>
      </section>
    </>
  );
}
