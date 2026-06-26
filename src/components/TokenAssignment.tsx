import { useEffect, useState } from "react";
import type { CharacterMetadata, PlayerSlot, RollBonus, RollConfig } from "../types";
import { emptyCharacterForPlayer } from "../obr/metadata";

type Props = {
  slots: PlayerSlot[];
  selectedSlotId?: string;
  isGm: boolean;
  rolls: RollConfig[];
  onSelectSlot: (playerId: string) => void;
  onSave: (playerId: string, character: CharacterMetadata) => void;
  onClear: (playerId: string) => void;
};

export function TokenAssignment({ slots, selectedSlotId, isGm, rolls, onSelectSlot, onSave, onClear }: Props) {
  const selectedSlot = slots.find((slot) => slot.playerId === selectedSlotId) ?? slots[0];
  const [draft, setDraft] = useState<CharacterMetadata | undefined>(selectedSlot?.character);
  const [statsOpen, setStatsOpen] = useState(true);
  const [dmBonusOpen, setDmBonusOpen] = useState(true);

  useEffect(() => {
    setDraft(selectedSlot?.character);
  }, [selectedSlot?.playerId, selectedSlot?.character]);

  function ensureDraft() {
    if (draft) return draft;
    const player = selectedSlot
      ? { id: selectedSlot.playerId, name: selectedSlot.playerName }
      : { id: "local-player", name: "Jugador local" };
    return emptyCharacterForPlayer(player);
  }

  function updateStats(key: keyof CharacterMetadata["stats"], value: number) {
    const next = ensureDraft();
    setDraft({ ...next, stats: { ...next.stats, [key]: value } });
  }

  function updateSkill(key: string, value: number) {
    const next = ensureDraft();
    setDraft({ ...next, skills: { ...(next.skills ?? {}), [key]: value } });
  }

  function updateCold(value: Partial<CharacterMetadata["cold"]>) {
    const next = ensureDraft();
    setDraft({ ...next, cold: { ...next.cold, ...value } });
  }

  function updateBonus(bonusId: string, changes: Partial<RollBonus>) {
    const next = ensureDraft();
    setDraft({
      ...next,
      bonuses: (next.bonuses ?? []).map((bonus) => (bonus.id === bonusId ? { ...bonus, ...changes } : bonus)),
    });
  }

  function addBonus() {
    const next = ensureDraft();
    const firstRollId = rolls[0]?.id ?? "";
    setDraft({
      ...next,
      bonuses: [
        ...(next.bonuses ?? []),
        { id: `bonus_${Date.now()}`, label: "Nuevo bono", value: 0, rollId: firstRollId },
      ],
    });
  }

  function removeBonus(bonusId: string) {
    const next = ensureDraft();
    setDraft({ ...next, bonuses: (next.bonuses ?? []).filter((bonus) => bonus.id !== bonusId) });
  }

  function fixedOwner(character: CharacterMetadata) {
    if (!selectedSlot) return character;
    return {
      ...character,
      ownerPlayerId: selectedSlot.playerId,
      ownerPlayerName: selectedSlot.playerName,
      ownerConnectionId: selectedSlot.playerConnectionId,
    };
  }

  return (
    <section className="panel">
      <div className="section-title">
        <h2>{isGm ? "Jugadores y hojas" : "Mi hoja"}</h2>
      </div>
      {slots.length > 0 && selectedSlot ? (
        <>
          {isGm ? (
            <div className="slot-list">
              {slots.map((slot) => (
                <button
                  key={slot.playerId}
                  className={slot.playerId === selectedSlot.playerId ? "slot-button active" : "slot-button"}
                  onClick={() => onSelectSlot(slot.playerId)}
                >
                  <strong>{slot.playerName}</strong>
                  <span>{slot.character.characterName || "Hoja sin nombre"}</span>
                  <small>{slot.connected ? "Conectado" : "Desconectado"}</small>
                </button>
              ))}
            </div>
          ) : null}
          <div className="sheet-summary">
            <strong>{ensureDraft().characterName || selectedSlot.playerName}</strong>
            <span>Jugador: {selectedSlot.playerName}</span>
            <span>
              CON {ensureDraft().stats.con >= 0 ? "+" : ""}
              {ensureDraft().stats.con} · Agotamiento {ensureDraft().cold.exhaustion}
            </span>
          </div>
          {isGm ? <p className="muted">Vista DM: selecciona un jugador para revisar o editar su hoja.</p> : null}
          <label>
            Personaje
            <input
              value={ensureDraft().characterName}
              onChange={(event) => setDraft(fixedOwner({ ...ensureDraft(), characterName: event.target.value }))}
            />
          </label>
          <div className="collapsible">
            <button className="collapse-button" onClick={() => setStatsOpen((open) => !open)} aria-expanded={statsOpen}>
              <span>Estadisticas</span>
              <span>{statsOpen ? "Ocultar" : "Mostrar"}</span>
            </button>
            {statsOpen ? (
              <div className="stat-grid">
                {(["str", "dex", "con", "int", "wis", "cha"] as const).map((stat) => (
                  <label key={stat}>
                    {stat.toUpperCase()}
                    <input type="number" value={ensureDraft().stats[stat]} onChange={(event) => updateStats(stat, Number(event.target.value))} />
                  </label>
                ))}
                <label>
                  PROF
                  <input
                    type="number"
                    value={ensureDraft().stats.proficiencyBonus}
                    onChange={(event) => updateStats("proficiencyBonus", Number(event.target.value))}
                  />
                </label>
              </div>
            ) : null}
          </div>
          {isGm ? (
            <div className="collapsible">
              <button className="collapse-button" onClick={() => setDmBonusOpen((open) => !open)} aria-expanded={dmBonusOpen}>
                <span>Bonificadores DM</span>
                <span>{dmBonusOpen ? "Ocultar" : "Mostrar"}</span>
              </button>
              {dmBonusOpen ? (
                <>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={ensureDraft().cold.hasColdWeatherClothing}
                      onChange={(event) => updateCold({ hasColdWeatherClothing: event.target.checked })}
                    />
                    Ropa de frio (+5 si no esta mojada)
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={ensureDraft().cold.wetClothing}
                      onChange={(event) => updateCold({ wetClothing: event.target.checked })}
                    />
                    Ropa mojada
                  </label>
                  <div className="bonus-list">
                    {(ensureDraft().bonuses ?? []).map((bonus) => (
                      <div className="bonus-row" key={bonus.id}>
                        <label>
                          Nombre
                          <input value={bonus.label} onChange={(event) => updateBonus(bonus.id, { label: event.target.value })} />
                        </label>
                        <label>
                          Bono
                          <input
                            type="number"
                            value={bonus.value}
                            onChange={(event) => updateBonus(bonus.id, { value: Number(event.target.value) })}
                          />
                        </label>
                        <label>
                          Aplica a
                          <select value={bonus.rollId} onChange={(event) => updateBonus(bonus.id, { rollId: event.target.value })}>
                            <option value="">Selecciona tirada</option>
                            {rolls.map((roll) => (
                              <option key={roll.id} value={roll.id}>
                                {roll.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button className="danger" onClick={() => removeBonus(bonus.id)}>
                          Borrar
                        </button>
                      </div>
                    ))}
                    {(ensureDraft().bonuses ?? []).length === 0 ? <p className="muted">No hay bonos individuales.</p> : null}
                  </div>
                  <button onClick={addBonus}>Agregar bono individual</button>
                </>
              ) : null}
            </div>
          ) : null}
          <div className="button-row">
            <button className="primary" onClick={() => onSave(selectedSlot.playerId, fixedOwner(ensureDraft()))}>
              Guardar hoja
            </button>
            <button className="danger" onClick={() => onClear(selectedSlot.playerId)}>
              Reiniciar hoja
            </button>
          </div>
        </>
      ) : (
        <p className="muted">Aun no hay slots de jugadores en la mesa.</p>
      )}
    </section>
  );
}
