export const MEAL_SLOTS = [
  "breakfast",
  "lunch",
  "snack",
  "dinner",
  "supper",
  "other",
] as const;

export type MealSlot = (typeof MEAL_SLOTS)[number];

export function mealSlotLabelPt(slot: MealSlot): string {
  switch (slot) {
    case "breakfast":
      return "Pequeno-almoço";
    case "lunch":
      return "Almoço";
    case "snack":
      return "Lanche";
    case "dinner":
      return "Jantar";
    case "supper":
      return "Ceia";
    default:
      return "Outro";
  }
}
