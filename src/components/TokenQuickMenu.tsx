import type { RollConfig, SelectedToken } from "../types";

type Props = {
  token?: SelectedToken;
  rolls: RollConfig[];
  onRoll: (roll: RollConfig) => void;
  onClose: () => void;
};

export function TokenQuickMenu({ token, rolls, onRoll, onClose }: Props) {
  return (
    <section className="panel quick-menu">
      <div className="section-title">
        <h2>{token?.character?.characterName ?? token?.name ?? "Tiradas"}</h2>
        <button onClick={onClose}>Cerrar</button>
      </div>
      {token?.character ? <p className="muted">Dueño: {token.character.ownerPlayerName}</p> : <p className="muted">Token sin personaje asignado.</p>}
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
