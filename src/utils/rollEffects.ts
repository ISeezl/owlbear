import type { CharacterMetadata, EffectCondition, EffectOperation, RollConfig, RollEffect, RollOutcome } from "../types";

export function evaluateEffectCondition(params: {
  condition: EffectCondition;
  total: number;
  natural?: number;
  dc?: number;
  rollType?: RollConfig["type"];
}) {
  const { condition, total, natural, dc, rollType } = params;

  if (condition === "always") return true;
  if (condition === "natural_1") return natural === 1;
  if (condition === "natural_20") return natural === 20;

  if (rollType === "death_save") {
    if (natural === 1 || natural === 20) return false;
    if (condition === "success") return total >= 10;
    if (condition === "failure") return total < 10;
  }

  if (condition === "success" && typeof dc === "number") return total >= dc;
  if (condition === "failure" && typeof dc === "number") return total < dc;
  return false;
}

export function applyNestedUpdate(
  object: Record<string, unknown>,
  field: string,
  operation: EffectOperation,
  value: number | string | boolean,
) {
  const parts = field.split(".");
  let current: Record<string, unknown> = object;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== "object") current[part] = {};
    current = current[part] as Record<string, unknown>;
  }

  const last = parts[parts.length - 1];
  if (operation === "set") current[last] = value;
  if (operation === "increment") current[last] = Number(current[last] ?? 0) + Number(value);
  if (operation === "decrement") current[last] = Number(current[last] ?? 0) - Number(value);
}

export function applyRollEffects(roll: RollConfig, outcome: RollOutcome, character: CharacterMetadata) {
  const nextCharacter = structuredClone(character);
  const applied: RollEffect[] = [];

  for (const effect of roll.effects) {
    const shouldApply = evaluateEffectCondition({
      condition: effect.condition,
      total: outcome.total,
      natural: outcome.natural,
      dc: roll.dc,
      rollType: roll.type,
    });

    if (!shouldApply) continue;
    applied.push(effect);
    if (effect.updateToken) {
      applyNestedUpdate(
        nextCharacter as unknown as Record<string, unknown>,
        effect.updateToken.field,
        effect.updateToken.operation,
        effect.updateToken.value,
      );
    }
  }

  return { character: nextCharacter, applied };
}
