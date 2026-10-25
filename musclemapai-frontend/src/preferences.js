export const EQUIPMENT_OPTIONS = [
  ["dumbbells", "Dumbbells"],
  ["resistance_bands", "Resistance bands"],
  ["barbell", "Barbell & plates"],
  ["bench", "Weight bench"],
  ["pull_up_bar", "Pull-up bar"],
  ["kettlebell", "Kettlebell"],
  ["gym_machines", "Gym machines"],
  ["cardio_machine", "Cardio machine"],
  ["yoga_mat", "Exercise mat"],
];

const equipmentIds = new Set(EQUIPMENT_OPTIONS.map(([id]) => id));

export function getAccountPreferences(metadata) {
  const raw = metadata?.fitness_preferences && typeof metadata.fitness_preferences === "object"
    ? metadata.fitness_preferences
    : {};
  const equipment = Array.isArray(raw.equipment)
    ? raw.equipment
      .filter((id) => typeof id === "string")
      .map((id) => id.trim().toLowerCase())
      .filter((id) => equipmentIds.has(id))
    : null;
  const memoryEnabled = typeof raw.memory_enabled === "string"
    ? !["false", "0", "no"].includes(raw.memory_enabled.trim().toLowerCase())
    : raw.memory_enabled !== false;

  return {
    units: typeof raw.units === "string" && raw.units.trim().toLowerCase() === "imperial"
      ? "imperial"
      : "metric",
    equipment: equipment === null ? null : [...new Set(equipment)],
    memory_enabled: memoryEnabled,
  };
}
