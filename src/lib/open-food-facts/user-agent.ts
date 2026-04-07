/**
 * Open Food Facts pede um User-Agent identificável (fair use).
 * @see https://openfoodfacts.github.io/openfoodfacts-server/api/
 */
export const OPEN_FOOD_FACTS_USER_AGENT =
  process.env.OPENFOODFACTS_USER_AGENT?.trim() ||
  "GliErica/0.1 (carb tracking; contact via app maintainer)";
