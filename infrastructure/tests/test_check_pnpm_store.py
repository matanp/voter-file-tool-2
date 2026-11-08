"""Tests for scripts/check-pnpm-store.sh. Needs pnpm on PATH.

Run with python3 -m unittest discover -s infrastructure/tests -v.
"""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest


STORE_CHECK = Path(__file__).resolve().parents[2] / "scripts/check-pnpm-store.sh"


class CheckPnpmStoreTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(prefix="pnpm-store-test-")
        self.addCleanup(temp.cleanup)
        self.work = Path(temp.name).resolve()

    def run_command(self, args):
        return subprocess.run(args, cwd=self.work, text=True, capture_output=True)

    def check_store(self):
        return self.run_command(["bash", str(STORE_CHECK)])

    def test_fresh_install_allowed(self):
        self.assertEqual(self.check_store().returncode, 0)

    def test_missing_store_metadata_rejected(self):
        (self.work / "node_modules").mkdir()
        (self.work / "node_modules/.modules.yaml").write_text("layoutVersion: 5\n")
        self.assertNotEqual(self.check_store().returncode, 0)

    def test_store_match_passes_and_mismatch_aborts(self):
        dep = self.work / "dep"
        dep.mkdir()
        (dep / "package.json").write_text(json.dumps({"name": "local-dep", "version": "1.0.0"}))
        (self.work / "package.json").write_text(json.dumps({
            "name": "store-fixture", "dependencies": {"local-dep": "file:./dep"}
        }))
        npmrc = self.work / ".npmrc"
        npmrc.write_text(f"store-dir={self.work / 'store-a'}\n")
        result = self.run_command(["pnpm", "install", "--offline", "--ignore-scripts"])
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.check_store().returncode, 0)

        npmrc.write_text(f"store-dir={self.work / 'store-b'}\n")
        result = self.check_store()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Refusing to install", result.stderr)


if __name__ == "__main__":
    unittest.main()
