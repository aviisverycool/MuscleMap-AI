import json
import unittest
from unittest.mock import Mock, patch

import input as backend


def provider(name, model):
    return {
        "name": name,
        "url": "https://provider.invalid/chat/completions",
        "key": "test-key",
        "model": model,
    }


def response(status_code, body, headers=None):
    result = Mock(status_code=status_code, headers=headers or {})
    result.json.return_value = body
    result.text = json.dumps(body)
    return result


class ProviderFallbackTests(unittest.TestCase):
    def test_gpt_oss_chat_request_uses_low_reasoning(self):
        success = response(
            200,
            {"choices": [{"message": {"content": "answer"}}]},
        )

        with patch.object(
            backend, "PROVIDERS", [provider("Groq", "openai/gpt-oss-120b")]
        ), patch.object(backend.requests, "post", return_value=success) as request:
            backend.ask_model(
                "test",
                record=False,
                structured=False,
                use_persona=False,
                include_history=False,
                reasoning_effort="low",
            )

        self.assertEqual(request.call_args.kwargs["json"]["reasoning_effort"], "low")

    def test_non_reasoning_title_model_omits_reasoning_parameter(self):
        success = response(
            200,
            {"choices": [{"message": {"content": "Top Leg Exercises"}}]},
        )

        with patch.object(
            backend, "PROVIDERS", [provider("Groq", "openai/gpt-oss-120b")]
        ), patch.object(backend.requests, "post", return_value=success) as request:
            result = backend.ask_model(
                "title this chat",
                record=False,
                structured=False,
                use_persona=False,
                include_history=False,
                reasoning_effort="none",
                model_override="llama-3.1-8b-instant",
                provider_name_prefix="Groq",
            )

        self.assertEqual(result, "Top Leg Exercises")
        self.assertEqual(request.call_args.kwargs["json"]["model"], "llama-3.1-8b-instant")
        self.assertNotIn("reasoning_effort", request.call_args.kwargs["json"])

    def test_rate_limited_primary_uses_fallback_model(self):
        providers = [
            provider("Groq", "openai/gpt-oss-120b"),
            provider("Groq fallback", "openai/gpt-oss-20b"),
        ]
        rate_limited = response(429, {"error": {"message": "rate limited"}})
        success = response(
            200,
            {"choices": [{"message": {"content": "fallback answer"}}]},
        )

        with patch.object(backend, "PROVIDERS", providers), patch.object(
            backend.requests, "post", side_effect=[rate_limited, success]
        ):
            result = backend.ask_model(
                "test",
                record=False,
                structured=False,
                use_persona=False,
                include_history=False,
            )

        self.assertEqual(result, "fallback answer")

    def test_empty_primary_response_uses_next_provider(self):
        providers = [
            provider("Groq", "openai/gpt-oss-120b"),
            provider("Groq fallback", "openai/gpt-oss-20b"),
        ]
        empty = response(200, {"choices": [{"message": {"content": ""}}]})
        success = response(
            200,
            {"choices": [{"message": {"content": "fallback answer"}}]},
        )

        with patch.object(backend, "PROVIDERS", providers), patch.object(
            backend.requests, "post", side_effect=[empty, success]
        ):
            result = backend.ask_model(
                "test",
                record=False,
                structured=False,
                use_persona=False,
                include_history=False,
            )

        self.assertEqual(result, "fallback answer")

    def test_structured_call_retries_provider_outage(self):
        unavailable = json.dumps(
            {
                "in_scope": True,
                "intro": "The AI service is temporarily unavailable.",
                "stretches": [],
                "advice": "Please try again.",
                "question": "",
            }
        )
        success = json.dumps(
            {
                "in_scope": True,
                "intro": "A healthy adult usually has 206 bones.",
                "stretches": [],
                "advice": "",
                "question": "",
            }
        )

        with patch.object(backend, "ask_model", side_effect=[unavailable, success]) as ask, patch.object(
            backend.time, "sleep"
        ):
            result = backend.safe_model_call("test", session_id="test-session")

        self.assertEqual(json.loads(result)["intro"], "A healthy adult usually has 206 bones.")
        self.assertEqual(ask.call_count, 2)
        self.assertEqual(ask.call_args.kwargs["reasoning_effort"], "low")


if __name__ == "__main__":
    unittest.main()
