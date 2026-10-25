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


def _normalize_equipment(value):
    if value is None:
        return None
    if isinstance(value, str):
        pieces = [piece.strip() for piece in value.split(",") if piece.strip()]
        iterable = pieces
    elif isinstance(value, (list, tuple, set)):
        iterable = value
    else:
        return None

    normalized = []
    seen = set()
    for item in iterable:
        if not isinstance(item, str):
            continue
        candidate = item.strip().lower()
        if not candidate or candidate not in EQUIPMENT or candidate in seen:
            continue
        seen.add(candidate)
        normalized.append(candidate)
    return tuple(normalized) if normalized else ()


@dataclass(frozen=True)
class AccountPreferences:
    units: str = "metric"
    equipment: tuple[str, ...] | None = None
    memory_enabled: bool = True

    @classmethod
    def from_metadata(cls, metadata):
        raw = metadata.get("fitness_preferences") if isinstance(metadata, dict) else None
        raw = raw if isinstance(raw, dict) else {}
        equipment = _normalize_equipment(raw.get("equipment"))
        units = str(raw.get("units", "")).strip().lower()
        memory_enabled = raw.get("memory_enabled")
        if isinstance(memory_enabled, str):
            memory_enabled = memory_enabled.strip().lower() not in {"false", "0", "no"}
        return cls(
            units="imperial" if units == "imperial" else "metric",
            equipment=equipment if equipment is not None else None,
            memory_enabled=memory_enabled is not False,
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
        lines.append(
            "Available equipment is not specified. Do not assume gym access; "
            "prefer bodyweight movements and label any equipment-based alternatives."
        )
    elif not preferences.equipment:
        lines.append(
            "Available equipment: none. Recommend only bodyweight exercises "
            "that require no equipment."
        )
    else:
        names = ", ".join(EQUIPMENT[item] for item in preferences.equipment)
        lines.append(
            f"Available equipment: {names}. For every exercise recommendation, "
            "use only this equipment or bodyweight; do not prescribe unavailable "
            "equipment. Follow a different setup only when the user explicitly "
            "requests it for this message."
        )
    return "Account preferences (apply to this response):\n" + "\n".join(lines)