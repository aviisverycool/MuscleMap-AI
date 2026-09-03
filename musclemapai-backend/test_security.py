import unittest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import ValidationError

import security
import supabase_store
from models import ChatRequest, TitleRequest


class AuthenticationTests(unittest.TestCase):
    def test_missing_bearer_token_is_rejected(self):
        with self.assertRaises(HTTPException) as raised:
            security.get_current_user(None)
        self.assertEqual(raised.exception.status_code, 401)

    def test_validated_user_id_comes_from_supabase(self):
        user_id = str(uuid4())
        response = Mock(status_code=200)
        response.json.return_value = {
            "id": user_id,
            "email": "user@example.com",
            "last_sign_in_at": datetime.now(timezone.utc).isoformat(),
        }
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="token")

        with patch.object(security, "SUPABASE_URL", "https://project.supabase.co"), patch.object(
            security, "SUPABASE_AUTH_KEY", "publishable-key"
        ), patch.object(security.requests, "get", return_value=response) as request:
            user = security.get_current_user(credentials)

        self.assertEqual(user.id, user_id)
        self.assertEqual(user.email, "user@example.com")
        self.assertTrue(user.was_recently_authenticated())
        self.assertEqual(request.call_args.kwargs["headers"]["Authorization"], "Bearer token")

    def test_expired_token_is_rejected(self):
        response = Mock(status_code=401)
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="expired")
        with patch.object(security, "SUPABASE_URL", "https://project.supabase.co"), patch.object(
            security, "SUPABASE_AUTH_KEY", "publishable-key"
        ), patch.object(security.requests, "get", return_value=response), self.assertRaises(
            HTTPException
        ) as raised:
            security.get_current_user(credentials)
        self.assertEqual(raised.exception.status_code, 401)

    def test_old_sign_in_is_not_recent(self):
        user = security.AuthenticatedUser(
            id=str(uuid4()),
            last_sign_in_at=datetime.now(timezone.utc) - timedelta(minutes=10),
        )
        self.assertFalse(user.was_recently_authenticated())


class AuthorizationAndRateLimitTests(unittest.TestCase):
    def setUp(self):
        security._local_rate_limits.clear()
        security._rate_limit_fallback_warned = False
        supabase_store._missing_optional_tables.clear()
        supabase_store._rate_limit_schema_missing = False

    def test_conversation_storage_is_namespaced_by_user(self):
        conversation_id = str(uuid4())
        first = security.scoped_conversation_id(str(uuid4()), conversation_id)
        second = security.scoped_conversation_id(str(uuid4()), conversation_id)
        self.assertNotEqual(first, second)

    def test_local_rate_limit_rejects_excess_requests(self):
        with patch.object(security, "SERVICE_ROLE_ENABLED", False):
            security.enforce_rate_limit("user", "test", limit=2, window_seconds=60)
            security.enforce_rate_limit("user", "test", limit=2, window_seconds=60)
            with self.assertRaises(HTTPException) as raised:
                security.enforce_rate_limit("user", "test", limit=2, window_seconds=60)
        self.assertEqual(raised.exception.status_code, 429)
        self.assertIn("Retry-After", raised.exception.headers)

    def test_production_rate_limit_fails_closed_without_shared_store(self):
        with patch.object(security, "SERVICE_ROLE_ENABLED", False), patch.object(
            security, "IS_PRODUCTION", True
        ), self.assertRaises(HTTPException) as raised:
            security.enforce_rate_limit("user", "test", limit=2, window_seconds=60)
        self.assertEqual(raised.exception.status_code, 503)

    def test_missing_shared_rate_limit_schema_uses_local_limiter(self):
        with patch.object(security, "SERVICE_ROLE_ENABLED", True), patch.object(
            security,
            "consume_rate_limit",
            side_effect=supabase_store.RateLimitSchemaUnavailable,
        ):
            security.enforce_rate_limit("user", "test", limit=1, window_seconds=60)
            with self.assertRaises(HTTPException) as raised:
                security.enforce_rate_limit("user", "test", limit=1, window_seconds=60)
        self.assertEqual(raised.exception.status_code, 429)

    def test_missing_optional_memory_table_counts_as_deleted(self):
        response = Mock(status_code=404)
        response.json.return_value = {"code": "PGRST205"}
        response.text = "missing table"

        with patch.object(supabase_store, "ENABLED", True), patch.object(
            supabase_store.requests, "delete", return_value=response
        ) as request:
            deleted = supabase_store._delete("backend_history", "session_id", "id")
            deleted_again = supabase_store._delete("backend_history", "session_id", "id")

        self.assertTrue(deleted)
        self.assertTrue(deleted_again)
        request.assert_called_once()

    def test_other_memory_delete_errors_still_fail_closed(self):
        response = Mock(status_code=503)
        response.json.return_value = {"code": "temporary_failure"}
        response.text = "unavailable"

        with patch.object(supabase_store, "ENABLED", True), patch.object(
            supabase_store.requests, "delete", return_value=response
        ):
            deleted = supabase_store._delete("backend_history", "session_id", "id")

        self.assertFalse(deleted)

    def test_missing_rate_limit_rpc_is_cached(self):
        response = Mock(status_code=404)
        response.json.return_value = {"code": "PGRST202"}
        response.text = "missing function"

        with patch.object(supabase_store, "SERVICE_ROLE_ENABLED", True), patch.object(
            supabase_store.requests, "post", return_value=response
        ) as request:
            with self.assertRaises(supabase_store.RateLimitSchemaUnavailable):
                supabase_store.consume_rate_limit("user:test", 1, 60)
            with self.assertRaises(supabase_store.RateLimitSchemaUnavailable):
                supabase_store.consume_rate_limit("user:other", 1, 60)

        request.assert_called_once()

    def test_account_cleanup_covers_all_user_tables(self):
        with patch.object(supabase_store, "SERVICE_ROLE_ENABLED", True), patch.object(
            supabase_store, "_delete_filter", return_value=True
        ) as delete_filter:
            supabase_store.delete_user_data("user-id")

        self.assertEqual(delete_filter.call_count, 5)
        self.assertIn(
            unittest.mock.call("conversations", "user_id", "eq.user-id"),
            delete_filter.call_args_list,
        )


class RequestValidationTests(unittest.TestCase):
    def test_chat_request_rejects_oversized_message(self):
        with self.assertRaises(ValidationError):
            ChatRequest(session_id=uuid4(), message="x" * 6001)

    def test_title_request_rejects_unknown_fields(self):
        with self.assertRaises(ValidationError):
            TitleRequest(message="hello", unexpected=True)


if __name__ == "__main__":
    unittest.main()
