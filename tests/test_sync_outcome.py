import contextlib
import importlib.util
import io
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock

spec = importlib.util.spec_from_file_location('sync_outcome', Path(__file__).resolve().parents[1] / 'scripts/scrapers/sync_verified_prices.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class SyncOutcomeTests(unittest.TestCase):
    def test_partial_import_succeeds_and_preserves_failed_source_history(self):
        old = {'id': 'old@makro', 'product_id': 'old', 'query_date': '2026-11-01T00:00:00+00:00', 'current_price': 100}
        new = {'id': 'new@coope', 'product_id': 'new', 'query_date': '2026-11-09T00:00:00+00:00', 'current_price': 200}
        with tempfile.TemporaryDirectory() as directory, contextlib.ExitStack() as stack:
            snap, history, summary = [Path(directory) / name for name in ('snapshot.json', 'history.json', 'summary.md')]
            sync.atomic_json(snap, {'products': [{'id': 'old'}], 'observations': [old], 'branches': [], 'sources': {}})
            sync.atomic_json(history, [old])
            stack.enter_context(mock.patch.object(sync, 'SNAPSHOT', snap))
            stack.enter_context(mock.patch.object(sync, 'HISTORY', history))
            stack.enter_context(mock.patch.dict(os.environ, {'GITHUB_STEP_SUMMARY': str(summary), 'GITHUB_ACTIONS': 'true'}))
            stack.enter_context(mock.patch('sys.argv', ['sync']))
            for name in ('coope', 'mas', 'makro', 'vital', 'yaguar', 'la_anonima', 'coto', 'jumbo', 'carrefour'):
                kwargs = {'return_value': ([{'id': 'new'}], [new], None, [])} if name == 'coope' else {'side_effect': ValueError('Fuente no disponible')}
                stack.enter_context(mock.patch.object(sync, 'collect_' + name, **kwargs))
            with contextlib.redirect_stdout(io.StringIO()) as output:
                sync.main()
            self.assertEqual(sync.read_json(history, []), [old, new])
            self.assertEqual(sync.read_json(snap, {})['observations'], [old, new])
            self.assertEqual(sync.read_json(snap, {})['sources']['makro']['status'], 'error')
            self.assertIn('**partial**', summary.read_text())
            self.assertIn('makro: error', summary.read_text())
            self.assertIn('::warning::makro:', output.getvalue())

    def test_no_new_prices_remains_failure(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertEqual(sync.report_sync_outcome(0, {}, 'now'), 1)

    def test_old_errors_do_not_degrade_current_success(self):
        sources = {'makro': {'status': 'error', 'last_attempt': 'yesterday'}, 'coto': {'status': 'ok', 'last_attempt': 'now'}}
        with mock.patch.dict(os.environ, {}, clear=True), contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(sync.report_sync_outcome(3, sources, 'now'), 0)
        self.assertIn('"sync_status": "ok"', output.getvalue())

    def test_partial_source_is_reported(self):
        with mock.patch.dict(os.environ, {}, clear=True), contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(sync.report_sync_outcome(3, {'coto': {'status': 'partial', 'last_attempt': 'now'}}, 'now'), 0)
        self.assertIn('"sync_status": "partial"', output.getvalue())
