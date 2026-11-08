"""Run with python3 -m unittest discover -s infrastructure/tests -v.

Uses offline pnpm fixtures and simulated Linux swap commands; never changes host swap.
"""
import json
import os
from pathlib import Path
import shlex
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
STORE_CHECK = ROOT / "scripts/check-pnpm-store.sh"
SWAP_HELPER = ROOT / "infrastructure/scripts/lib/ensure-swap.sh"


class HardeningTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="hardening-test-")
        self.addCleanup(self.temp.cleanup)
        self.work = Path(self.temp.name).resolve()

    def run_command(self, args, **kwargs):
        return subprocess.run(args, cwd=self.work, text=True, capture_output=True, **kwargs)

    def check_store(self, **kwargs):
        return self.run_command(["bash", str(STORE_CHECK)], **kwargs)

    def test_fresh_install_allowed(self):
        self.assertEqual(self.check_store().returncode, 0)

    def test_missing_store_metadata_rejected(self):
        (self.work / "node_modules").mkdir()
        (self.work / "node_modules/.modules.yaml").write_text("layoutVersion: 5\n")
        self.assertNotEqual(self.check_store().returncode, 0)

    def test_real_pnpm_store_match_and_mismatch_without_purging(self):
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
        metadata = self.work / "node_modules/.modules.yaml"
        original = metadata.read_bytes()
        marker = self.work / "node_modules/keep-me"
        marker.write_text("preserve installed modules")
        npmrc.write_text(f"store-dir={self.work / 'store-b'}\n")
        result = self.check_store(env=dict(os.environ, CI="true"))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Refusing to install", result.stderr)
        self.assertEqual(metadata.read_bytes(), original)
        self.assertTrue(marker.exists())

    def test_deploy_mismatch_aborts_before_pm2_or_install(self):
        (self.work / "scripts").mkdir()
        (self.work / "scripts/check-pnpm-store.sh").symlink_to(STORE_CHECK)
        (self.work / "node_modules").mkdir()
        (self.work / "node_modules/.modules.yaml").write_text("storeDir: /old-store\n")
        result = self.run_command(["bash", "-c", '''
            cd() { builtin cd "$FIXTURE"; }
            git() { :; }
            pnpm() {
              if [ "$*" = 'store path' ]; then echo /new-store;
              else echo install >> "$FIXTURE/actions"; fi
            }
            pm2() { echo pm2 >> "$FIXTURE/actions"; }
            export -f cd git pnpm pm2
            bash "$DEPLOY"
        '''], env=dict(os.environ, FIXTURE=str(self.work), DEPLOY=str(ROOT / "scripts/deploy-lightsail.sh")))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Refusing to install", result.stderr)
        self.assertFalse((self.work / "actions").exists())

    def setup_swap(self, total, active):
        self.swapfile = self.work / "swapfile"
        self.fstab = self.work / "fstab"
        self.fstab.write_text("")
        self.state = self.work / "state.json"
        self.state.write_text(json.dumps({"total": total, "active": active, "allocations": {}}))
        bin_dir = self.work / "bin"
        bin_dir.mkdir()
        mock = bin_dir / "mock"
        mock.write_text('''#!/usr/bin/env python3
import json, os, pathlib, sys
state_path = pathlib.Path(os.environ['SWAP_STATE'])
state = json.loads(state_path.read_text())
command = pathlib.Path(sys.argv[0]).name
args = sys.argv[1:]
if command == 'free':
    print('Swap: %s 0 %s' % (state['total'], state['total']))
elif command == 'sudo':
    command, *args = args
    if command == 'swapon':
        if args[0].startswith('--'):
            print('\\n'.join(state['active']))
        else:
            state['active'].append(args[0])
            state['total'] += state['allocations'][args[0]] - 1
    elif command == 'fallocate':
        path = pathlib.Path(args[2])
        assert not path.exists(), 'must not overwrite an existing file'
        path.write_text('new swap')
        state['allocations'][str(path)] = int(args[1][:-1])
    elif command == 'tee':
        with open(args[1], 'a') as file:
            file.write(sys.stdin.read())
    elif command not in ('chmod', 'mkswap'):
        raise AssertionError('unexpected privileged command: ' + command)
else:
    raise AssertionError(command)
state_path.write_text(json.dumps(state))
''')
        mock.chmod(0o755)
        (bin_dir / "free").symlink_to(mock)
        (bin_dir / "sudo").symlink_to(mock)
        self.swap_env = dict(os.environ, SWAP_STATE=str(self.state), PATH=f"{bin_dir}:{os.environ['PATH']}")

    def ensure_swap(self):
        script = f"source {shlex.quote(str(SWAP_HELPER))}; ensure_swap 2048 {shlex.quote(str(self.swapfile))} {shlex.quote(str(self.fstab))}"
        result = self.run_command(["bash", "-c", script], env=self.swap_env)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return json.loads(self.state.read_text())

    def test_fresh_swap_and_idempotent_retry(self):
        self.setup_swap(649, ["/bitnami-swap"])
        state = self.ensure_swap()
        self.assertGreaterEqual(state["total"], 2048)
        self.assertEqual(len(state["allocations"]), 1)
        self.assertEqual(self.ensure_swap(), state)
        self.assertEqual(self.fstab.read_text().count(str(self.swapfile)), 1)

    def test_undersized_active_swap_gets_supplement_and_persistence(self):
        swapfile = str(self.work / "swapfile")
        self.setup_swap(1024, [swapfile])
        self.swapfile.write_text("existing swap")
        state = self.ensure_swap()
        self.assertGreaterEqual(state["total"], 2048)
        self.assertEqual(self.swapfile.read_text(), "existing swap")
        self.assertNotIn(swapfile, state["allocations"])
        self.assertEqual(len(self.fstab.read_text().splitlines()), 2)
        self.assertEqual(self.ensure_swap(), state)
        self.assertEqual(len(self.fstab.read_text().splitlines()), 2)

    def test_enough_swap_repairs_persistence_without_allocation(self):
        self.setup_swap(2048, [str(self.work / "swapfile")])
        state = self.ensure_swap()
        self.assertEqual(state["allocations"], {})
        self.assertIn(str(self.swapfile), self.fstab.read_text())

    def test_inactive_existing_file_is_preserved(self):
        self.setup_swap(0, [])
        self.swapfile.write_text("do not overwrite")
        state = self.ensure_swap()
        self.assertGreaterEqual(state["total"], 2048)
        self.assertEqual(self.swapfile.read_text(), "do not overwrite")


if __name__ == "__main__":
    unittest.main()
