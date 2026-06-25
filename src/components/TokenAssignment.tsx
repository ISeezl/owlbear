import { useEffect, useState } from "react";
import type { CharacterMetadata, SelectedToken } from "../types";
import { getCurrentPlayer } from "../utils/permissions";
import { getPlayers } from "../obr/metadata";

type Player = { id: string; name: string };

const emptyCharacter = (player: Player, name: string): CharacterMetadata => ({
  ownerPlayerId: player.id,
  ownerPlayerName: player.name,
  characterName: name,
  stats: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0, proficiencyBonus: 2 },
  skills: { survival: 0, perception: 0, athletics: 0 },
  deathSaves: { success: 0, failure: 0 },
  cold: { exhaustion: 0, frost: 0, hasColdWeatherClothing: true, wetClothing: false },
});

type Props = {
  selectedToken?: SelectedToken;
  onSave: (character: CharacterMetadata) => void;
  onClear: () => void;
};

export function TokenAssignment({ selectedToken, onSave, onClear }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [draft, setDraft] = useState<CharacterMetadata | undefined>(selectedToken?.character);

  useEffect(() => {
    getPlayers().then(async (list) => {
      if (list.length > 0) setPlayers(list);
      else {
        const current = await getCurrentPlayer();
        setPlayers([{ id: current.id, name: current.name }]);
      }
    });
  }, []);

  useEffect(() => {
    setDraft(selectedToken?.character);
  }, [selectedToken]);

  const owner = players.find((player) => player.id === draft?.ownerPlayerId) ?? players[0];

  function ensureDraft() {
    if (draft) return draft;
    const player = players[0] ?? { id: "local-player", name: "Jugador local" };
    return emptyCharacter(player, selectedToken?.name ?? "Personaje");
  }

  function updateStats(key: keyof CharacterMetadata["stats"], value: number) {
    const next = ensureDraft();
    setDraft({ ...next, stats: { ...next.stats, [key]: value } });
  }

  function updateSkill(key: string, value: number) {
    const next = ensureDraft();
    setDraft({ ...next, skills: { ...(next.skills ?? {}), [key]: value } });
  }

  return (
    <section className="panel">
      <div className="section-title">
        <h2>Token seleccionado</h2>
      </div>
      {selectedToken ? (
        <>
          <div className="token-summary">
            <strong>{selectedToken.character?.characterName || selectedToken.name}</strong>
            <span>Dueño: {selectedToken.character?.ownerPlayerName ?? "Sin asignar"}</span>
            {selectedToken.character ? (
              <span>
                CON {selectedToken.character.stats.con >= 0 ? "+" : ""}
                {selectedToken.character.stats.con} · Agotamiento {selectedToken.character.cold.exhaustion}
              </span>
            ) : null}
          </div>
          <label>
            Jugador
            <select
              value={owner?.id ?? ""}
              onChange={(event) => {
                const player = players.find((item) => item.id === event.target.value) ?? players[0];
                const next = ensureDraft();
                setDraft({ ...next, ownerPlayerId: player.id, ownerPlayerName: player.name });
              }}
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Personaje
            <input
              value={ensureDraft().characterName}
              onChange={(event) => setDraft({ ...ensureDraft(), characterName: event.target.value })}
            />
          </label>
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
            {["survival", "perception", "athletics"].map((skill) => (
              <label key={skill}>
                {skill}
                <input
                  type="number"
                  value={ensureDraft().skills?.[skill] ?? 0}
                  onChange={(event) => updateSkill(skill, Number(event.target.value))}
                />
              </label>
            ))}
          </div>
          <div className="button-row">
            <button className="primary" onClick={() => onSave(ensureDraft())}>
              Guardar personaje
            </button>
            <button className="danger" onClick={onClear}>
              Limpiar asignación
            </button>
          </div>
        </>
      ) : (
        <p className="muted">Selecciona un token en Owlbear para asignarlo.</p>
      )}
    </section>
  );
}
