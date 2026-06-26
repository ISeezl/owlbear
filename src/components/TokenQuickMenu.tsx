import type { PlayerSlot, RollConfig } from "../types";

type Props = {
  slot?: PlayerSlot;
  rolls: RollConfig[];
  onRoll: (roll: RollConfig) => void;
  onClose: () => void;
};

export function TokenQuickMenu({ slot, rolls, onRoll, onClose }: Props) {
  return (
    <section className="panel quick-menu">
      <div className="section-title">
        <h2>{slot?.character.characterName ?? "Tiradas"}</h2>
        <button onClick={onClose}>Cerrar</button>
      </div>
      {slot ? <p className="muted">Jugador: {slot.playerName}</p> : <p className="muted">No hay slot activo.</p>}
      <div className="quick-list">
        {rolls.map((roll) => (
          <button key={roll.id} className="quick-roll" onClick={() => onRoll(roll)}>
            <span>{roll.icon}</span>
            <strong>{roll.name}</strong>
            <small>{roll.formula}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
