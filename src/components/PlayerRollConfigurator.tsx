import { useMemo, useState } from "react";
import type { PlayerSlot, ResultMode, RollConfig } from "../types";

type StatKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

type Draft = {
  id?: string;
  name: string;
  dice: string;
  stat: StatKey;
  proficient: boolean;
};

type Props = {
  slot?: PlayerSlot;
  rolls: RollConfig[];
  defaultResultMode: ResultMode;
  onSave: (roll: RollConfig) => void;
  onDelete: (rollId: string) => void;
  onOpenQuickMenu: () => void;
};

const stats: Array<{ value: StatKey; label: string }> = [
  { value: "str", label: "FUE" },
  { value: "dex", label: "DES" },
  { value: "con", label: "CON" },
  { value: "int", label: "INT" },
  { value: "wis", label: "SAB" },
  { value: "cha", label: "CAR" },
];

const defaultDraft: Draft = {
  name: "Nueva tirada",
  dice: "1d20",
  stat: "str",
  proficient: false,
};

function buildFormula(draft: Draft) {
  return `${draft.dice.trim() || "1d20"} + ${draft.stat.toUpperCase()}${draft.proficient ? " + PROF" : ""}`;
}

function draftFromRoll(roll: RollConfig): Draft {
  const formula = roll.formula.toUpperCase();
  const stat = stats.find((item) => formula.includes(item.value.toUpperCase()))?.value ?? "str";

  return {
    id: roll.id,
    name: roll.name,
    dice: roll.formula.split("+")[0]?.trim() || "1d20",
    stat,
    proficient: formula.includes("PROF"),
  };
}

export function PlayerRollConfigurator({ slot, rolls, defaultResultMode, onSave, onDelete, onOpenQuickMenu }: Props) {
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const formula = useMemo(() => buildFormula(draft), [draft]);

  function update(changes: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  function save() {
    if (!slot) return;

    onSave({
      id: draft.id ?? `player_roll_${slot.playerId}_${Date.now()}`,
      name: draft.name.trim() || "Tirada",
      icon: "d20",
      formula,
      ownerPlayerId: slot.playerId,
      ownerConnectionId: slot.playerConnectionId,
      description: "Tirada creada por jugador.",
      type: "normal",
      visibility: "owner_and_gm",
      target: "active_sheet",
      resultMode: defaultResultMode,
      effects: [],
    });
    setDraft(defaultDraft);
  }

  return (
    <section className="panel">
      <div className="section-title">
        <h2>Mis tiradas</h2>
      </div>
      <div className="player-roll-form">
        <label>
          Nombre
          <input value={draft.name} onChange={(event) => update({ name: event.target.value })} />
        </label>
        <div className="grid-two">
          <label>
            Dados
            <input value={draft.dice} onChange={(event) => update({ dice: event.target.value })} placeholder="1d20" />
          </label>
          <label>
            Estadistica
            <select value={draft.stat} onChange={(event) => update({ stat: event.target.value as StatKey })}>
              {stats.map((stat) => (
                <option key={stat.value} value={stat.value}>
                  {stat.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.proficient}
            onChange={(event) => update({ proficient: event.target.checked })}
          />
          Competencia
        </label>
        <div className="formula-preview">{formula}</div>
        <div className="button-row">
          <button className="primary" onClick={save} disabled={!slot}>
            {draft.id ? "Guardar cambios" : "Guardar tirada"}
          </button>
          {draft.id ? <button onClick={() => setDraft(defaultDraft)}>Cancelar edicion</button> : null}
          <button onClick={onOpenQuickMenu}>Abrir tiradas</button>
        </div>
      </div>
      <div className="roll-list">
        {rolls.length === 0 ? <p className="muted">Aun no has creado tiradas propias.</p> : null}
        {rolls.map((roll) => (
          <article className="player-roll-row" key={roll.id}>
            <button className="roll-main" onClick={() => setDraft(draftFromRoll(roll))}>
              <span className="roll-icon">{roll.icon}</span>
              <span>
                <strong>{roll.name}</strong>
                <small>{roll.formula}</small>
              </span>
            </button>
            <button className="danger" onClick={() => onDelete(roll.id)}>
              Borrar
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
