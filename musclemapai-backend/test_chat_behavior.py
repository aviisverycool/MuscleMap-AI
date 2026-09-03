import json
import unittest
from unittest.mock import patch
from uuid import uuid4

import input as backend
import main as api
from models import TitleRequest
from security import AuthenticatedUser


class GeneratedScopeRedirectTests(unittest.TestCase):
    def test_unrelated_request_uses_generated_redirect(self):
        generated = "Coding is outside my lane, but I can help with posture or movement breaks."
        with patch.object(backend, "_clear_state"), patch.object(
            backend, "generate_scope_redirect", return_value=generated
        ) as redirect:
            result = backend.generate_response(
                "Write Python code for a website", session_id="test-session"
            )

        self.assertEqual(result, generated)
        redirect.assert_called_once_with("Write Python code for a website")

    def test_scope_redirect_model_call_uses_low_reasoning(self):
        generated = "I cannot cover stock prices, but I can help with your fitness goals."
        with patch.object(backend, "ask_model", return_value=generated) as ask:
            result = backend.generate_scope_redirect("What is the latest stock price?")

        self.assertEqual(result, generated)
        self.assertFalse(ask.call_args.kwargs["record"])
        self.assertFalse(ask.call_args.kwargs["structured"])
        self.assertEqual(ask.call_args.kwargs["reasoning_effort"], "low")

    def test_generated_out_of_scope_intro_is_not_replaced(self):
        generated = "That movie question is outside my focus, but ask me about recovery anytime."
        raw = json.dumps({
            "in_scope": False,
            "intro": generated,
            "stretches": [],
            "advice": "must be removed",
            "question": "must be removed",
        })

        self.assertEqual(backend.format_response(raw), generated)


class ConversationTitleTests(unittest.TestCase):
    def setUp(self):
        self.user = AuthenticatedUser(id=str(uuid4()))

    def test_title_endpoint_uses_non_reasoning_model(self):
        with patch.object(api, "enforce_rate_limit"), patch.object(
            api, "ask_model", return_value='"Top Leg Exercises Guide"'
        ) as ask:
            result = api.generate_title(
                TitleRequest(message="What are the best leg exercises?"), self.user
            )

        self.assertEqual(result["title"], "Top Leg Exercises Guide")
        self.assertEqual(ask.call_args.kwargs["reasoning_effort"], "none")
        self.assertEqual(ask.call_args.kwargs["model_override"], api.TITLE_MODEL)
        self.assertEqual(ask.call_args.kwargs["max_tokens"], api.TITLE_MAX_TOKENS)

    def test_title_endpoint_falls_back_to_non_reasoning_agnes(self):
        provider_error = json.dumps({"intro": "The AI service is temporarily unavailable."})
        with patch.object(api, "enforce_rate_limit"), patch.object(
            api, "ask_model", side_effect=[provider_error, "Strong Legs Workout"]
        ) as ask:
            result = api.generate_title(
                TitleRequest(message="What are the best leg exercises?"), self.user
            )

        self.assertEqual(result["title"], "Strong Legs Workout")
        self.assertEqual(ask.call_count, 2)
        self.assertEqual(ask.call_args.kwargs["reasoning_effort"], "none")
        self.assertEqual(
            ask.call_args.kwargs["provider_name_prefix"], api.TITLE_FALLBACK_PROVIDER
        )
        self.assertIsNone(ask.call_args.kwargs.get("model_override"))

    def test_provider_failure_uses_message_based_title(self):
        provider_error = json.dumps({"intro": "The AI service is temporarily unavailable."})
        with patch.object(api, "enforce_rate_limit"), patch.object(
            api, "ask_model", return_value=provider_error
        ):
            result = api.generate_title(
                TitleRequest(message="What are the best leg exercises?"), self.user
            )

        self.assertEqual(result["title"], "Best Leg Exercises")


if __name__ == "__main__":
    unittest.main()
