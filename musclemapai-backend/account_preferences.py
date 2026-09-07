"""Account personalization, kept isolated to the current API request."""

from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from uuid import UUID


EQUIPMENT = {
    "dumbbells": "dumbbells",
    "resistance_bands": "resistance bands",
    "barbell": "a barbell and plates",
    "bench": "a weight bench",
    "pull_up_bar": "a pull-up bar",
    "kettlebell": "a kettlebell",
    "gym_machines": "gym machines",
    "cardio_machine": "a cardio machine",
    "yoga_mat": "an exercise mat",
}


@dataclass(frozen=True)
class AccountPreferences:
    units: str = "metric"
    equipment: tuple[str, ...] | None = None
    memory_enabled: bool = True

    @classmethod
    def from_metadata(cls, metadata):
        raw = metadata.get("fitness_preferences") if isinstance(metadata, dict) else None
        raw = raw if isinstance(raw, dict) else {}
        equipment = raw.get("equipment")
        return cls(
            units="imperial" if raw.get("units") == "imperial" else "metric",
            equipment=tuple(dict.fromkeys(
                item for item in equipment if isinstance(item, str) and item in EQUIPMENT
            )) if isinstance(equipment, list) else None,
            memory_enabled=raw.get("memory_enabled") is not False,
        )


def memory_generation(metadata):
    value = metadata.get("memory_generation") if isinstance(metadata, dict) else None
    try:
        return str(UUID(value)) if isinstance(value, str) else None
    except ValueError:
        return None


current_preferences = ContextVar("account_preferences", default=AccountPreferences())


@contextmanager
def use_preferences(preferences):
    token = current_preferences.set(preferences)
    try:
        yield
    finally:
        current_preferences.reset(token)


def preferences_prompt():
    preferences = current_preferences.get()
    units = "imperial (lb, feet/inches, miles)" if preferences.units == "imperial" else "metric (kg, cm, km)"
    lines = [f"Use {units} for measurements unless the user's current request specifies otherwise."]
    if preferences.equipment is None:
        lines.append("Available equipment is not specified; do not assume gym access.")
    elif not preferences.equipment:
        lines.append("Available equipment: none. Recommend bodyweight exercises requiring no equipment.")
    else:
        names = ", ".join(EQUIPMENT[item] for item in preferences.equipment)
        lines.append(f"Available equipment: {names}. Use only this equipment or bodyweight exercises unless the current request says otherwise.")
    return "Account preferences (apply to this response):\n" + "\n".join(lines)
