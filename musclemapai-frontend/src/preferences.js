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
  const raw = metadata?.fitness_preferences || {};
  return {
    units: raw.units === "imperial" ? "imperial" : "metric",
    equipment: Array.isArray(raw.equipment)
      ? [...new Set(raw.equipment.filter((id) => equipmentIds.has(id)))]
      : null,
    memory_enabled: raw.memory_enabled !== false,
  };
}
