import type { CharacterMetadata, ExtensionSettings, RollConfig } from "../types";
import { getSystemConfig } from "./systemConfig";

const variablePattern = /\b[A-Z_]+\b/g;

export function getFormulaVariables(formula: string) {
  return Array.from(new Set(formula.match(variablePattern) ?? []));
}

export function getRollBonusTotal(rollId: string, character?: CharacterMetadata, settings?: ExtensionSettings) {
  const characterBonus = (character?.bonuses ?? [])
    .filter((bonus) => bonus.rollId === rollId)
    .reduce((total, bonus) => total + bonus.value, 0);
  const globalBonus = (settings?.globalBonuses ?? [])
    .filter((bonus) => bonus.rollId === rollId)
    .reduce((total, bonus) => total + bonus.value, 0);

  return characterBonus + globalBonus;
}

export function resolveFormula(formula: string, character?: CharacterMetadata, settings?: ExtensionSettings, roll?: RollConfig) {
  if (!formula.trim()) {
    throw new Error("La formula no puede estar vacia.");
  }

  const coldClothingBonus = character?.cold.hasColdWeatherClothing && !character.cold.wetClothing ? 5 : 0;
  const appliedBonus = roll ? getRollBonusTotal(roll.id, character, settings) : 0;
  const systemConfig = getSystemConfig(settings);

  const variables: Record<string, number | undefined> = {
    COLD_BONUS: coldClothingBonus,
    FROST: character?.cold.frost,
    EXHAUSTION: character?.cold.exhaustion,
  };

  for (const stat of systemConfig.stats) {
    variables[stat.variable] = character?.stats?.[stat.key];
  }

  for (const skill of systemConfig.skills) {
    variables[skill.variable] = character?.skills?.[skill.key];
  }

  const unknown = getFormulaVariables(formula).filter((name) => !(name in variables));
  if (unknown.length > 0) {
    throw new Error(`Variables desconocidas: ${unknown.join(", ")}.`);
  }

  const missing = getFormulaVariables(formula).filter((name) => typeof variables[name] !== "number");
  if (missing.length > 0) {
    throw new Error(`La formula usa ${missing.join(", ")}, pero el personaje no tiene esos datos configurados.`);
  }

  const resolved = formula
    .replace(variablePattern, (name) => String(variables[name] ?? 0))
    .replace(/\s+/g, "")
    .replace(/\+\-/g, "-");

  return appliedBonus === 0 ? resolved : `${resolved}${appliedBonus >= 0 ? "+" : ""}${appliedBonus}`;
}

export function rollFormulaLocally(formula: string) {
  const normalized = formula.replace(/\s+/g, "");
  const terms = normalized.match(/[+-]?[^+-]+/g) ?? [];
  let total = 0;
  let natural: number | undefined;
  const rolls: string[] = [];

  for (const term of terms) {
    const sign = term.startsWith("-") ? -1 : 1;
    const body = term.replace(/^[+-]/, "");
    const dice = body.match(/^(\d*)d(\d+)$/i);
    if (dice) {
      const count = Number(dice[1] || 1);
      const sides = Number(dice[2]);
      for (let i = 0; i < count; i += 1) {
        const result = Math.floor(Math.random() * sides) + 1;
        if (sides === 20 && natural === undefined) natural = result;
        total += sign * result;
        rolls.push(`${sign < 0 ? "-" : ""}d${sides}:${result}`);
      }
    } else {
      total += sign * Number(body);
    }
  }

  return { total, natural, detail: rolls };
}
