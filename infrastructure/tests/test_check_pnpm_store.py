"""Tests for scripts/check-pnpm-store.sh and scripts/pnpm-install-low-memory.sh. Needs pnpm on PATH.

Run with python3 -m unittest discover -s infrastructure/tests -v (CI runs this in .github/workflows/test.yml).
"""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPTS = Path(__file__).resolve().parents[2] / "scripts"
STORE_CHECK = SCRIPTS / "check-pnpm-store.sh"
LOW_MEMORY_INSTALL = SCRIPTS / "pnpm-install-low-memory.sh"


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

    def install_with_store(self, store_name):
        """Install a one-dependency fixture offline against store_name; returns the .npmrc path."""
        dep = self.work / "dep"
        dep.mkdir()
        (dep / "package.json").write_text(json.dumps({"name": "local-dep", "version": "1.0.0"}))
        (self.work / "package.json").write_text(json.dumps({
            "name": "store-fixture", "dependencies": {"local-dep": "file:./dep"}
        }))
        npmrc = self.work / ".npmrc"
        npmrc.write_text(f"store-dir={self.work / store_name}\n")
        result = self.run_command(["pnpm", "install", "--offline", "--ignore-scripts"])
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return npmrc

    def test_store_match_passes_and_mismatch_aborts(self):
        npmrc = self.install_with_store("store-a")
        self.assertEqual(self.check_store().returncode, 0)

        npmrc.write_text(f"store-dir={self.work / 'store-b'}\n")
        result = self.check_store()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Refusing to install", result.stderr)

    def test_quoted_store_dir_is_read(self):
        self.install_with_store("store-a")
        modules = self.work / "node_modules/.modules.yaml"
        text = modules.read_text()
        store = self.run_command(["pnpm", "store", "path"]).stdout.strip()
        self.assertIn(f"storeDir: {store}\n", text)
        modules.write_text(text.replace(f"storeDir: {store}\n", f"storeDir: '{store}'\n"))
        result = self.check_store()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_low_memory_install_aborts_before_installing_on_mismatch(self):
        npmrc = self.install_with_store("store-a")
        npmrc.write_text(f"store-dir={self.work / 'store-b'}\n")
        result = self.run_command(["bash", str(LOW_MEMORY_INSTALL), "--offline"])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Refusing to install", result.stderr)
        self.assertFalse((self.work / "store-b").exists(), "install ran despite the mismatch")


if __name__ == "__main__":
    unittest.main()
