"""Unit tests for DKG secret persistence and retention."""

from __future__ import annotations

import os
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock

# Allow: python tests/test_dkg_persistence.py (from services/keypers/)
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from cryptography.fernet import Fernet

from crypto.primitives import G2, point_eq, point_multiply
from dkg_persistence import (
    DkgEntry,
    load_dkg_secrets,
    prune_expired_dkg_secrets,
    save_dkg_secrets,
)


class DkgPersistenceTests(unittest.TestCase):
    def setUp(self):
        self._tmpdir = tempfile.TemporaryDirectory()
        self._env_patch = mock.patch.dict(
            os.environ,
            {"KEYPER_STATE_DIR": self._tmpdir.name},
            clear=False,
        )
        self._env_patch.start()
        self.fernet = Fernet(Fernet.generate_key())
        self.logger = mock.Mock()

    def tearDown(self):
        self._env_patch.stop()
        self._tmpdir.cleanup()

    def test_save_load_round_trip(self):
        completed = {}
        completed["0xabc"] = DkgEntry(42)
        save_dkg_secrets(self.fernet, completed)

        loaded = {}
        load_dkg_secrets(self.fernet, loaded, self.logger)
        self.assertEqual(loaded["0xabc"].combined_share, 42)
        self.assertIsNone(loaded["0xabc"].expires_at)
        self.assertTrue(point_eq(loaded["0xabc"].public_key_share, point_multiply(G2, 42)))

    def test_expires_at_round_trip(self):
        expires_at = int(time.time()) + 3600
        completed = {
            "0xabc": DkgEntry(7, expires_at=expires_at),
        }
        save_dkg_secrets(self.fernet, completed)

        loaded = {}
        load_dkg_secrets(self.fernet, loaded, self.logger)
        self.assertEqual(loaded["0xabc"].expires_at, expires_at)

    def test_prune_removes_only_expired(self):
        past = int(time.time()) - 10
        future = int(time.time()) + 3600
        completed = {
            "0xold": DkgEntry(1, expires_at=past),
            "0xnew": DkgEntry(2, expires_at=future),
            "0xopen": DkgEntry(3),
        }
        removed = prune_expired_dkg_secrets(self.fernet, completed, self.logger)
        self.assertEqual(removed, ["0xold"])
        self.assertNotIn("0xold", completed)
        self.assertIn("0xnew", completed)
        self.assertIn("0xopen", completed)

        loaded = {}
        load_dkg_secrets(self.fernet, loaded, self.logger)
        self.assertNotIn("0xold", loaded)

    def test_expires_at_is_integer(self):
        expires_at = int(time.time()) + 172800
        completed = {"0xabc": DkgEntry(9, expires_at=expires_at)}
        save_dkg_secrets(self.fernet, completed)

        loaded = {}
        load_dkg_secrets(self.fernet, loaded, self.logger)
        self.assertIsInstance(loaded["0xabc"].expires_at, int)
        self.assertEqual(loaded["0xabc"].expires_at, expires_at)


if __name__ == "__main__":
    unittest.main()
