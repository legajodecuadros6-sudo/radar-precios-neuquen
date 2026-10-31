import importlib.util
from pathlib import Path
from unittest import TestCase, mock
from datetime import datetime, timezone
import tempfile, csv
spec=importlib.util.spec_from_file_location('sync',Path(__file__).resolve().parents[1]/'scripts/scrapers/sync_verified_prices.py')
sync=importlib.util.module_from_spec(spec);spec.loader.exec_module(sync)
class VerifiedImportTests(TestCase):
    def test_internal_code_is_not_barcode_and_no_discount_is_invented(self):
        product,obs=sync.coope_record({'cod_interno':'123','descripcion':'Aceite 900ml','estado':'1','precio':'100','precio_anterior':'200','gramaje':'900','unimed_desc':'cm3'}, {'descripcion':'Oeste','direccion':'Dirección'},'2026-10-30T00:00:00+00:00')
        self.assertNotIn('ean',product);self.assertEqual(product['net_content_number'],.9)
        self.assertEqual(obs['current_price'],100);self.assertEqual(obs['regular_price'],100)
        self.assertEqual(obs['branch_id'],'cooperativa_124')
    def test_unknown_or_wrong_city_prevents_import(self):
        with mock.patch.object(sync,'request_json',return_value={'datos':[{'id_local':'124','localidad_desc':'Bahía Blanca','cod_postal':'8000'}]}):
            with self.assertRaises(ValueError):sync.collect_coope('2026-10-30T00:00:00+00:00')
    def test_empty_failure_preserves_previous_prices_and_dates(self):
        old={'id':'p@branch','query_date':'2026-10-29T00:00:00+00:00','current_price':100}
        self.assertEqual(sync.merge_observations([old],[]),[old])
        self.assertEqual(sync.merge_observations([old],[{**old,'query_date':'2026-10-28T00:00:00+00:00','current_price':50}]),[old])
    def test_ean_checksum_and_nonfinite_values(self):
        self.assertTrue(sync.valid_ean('7790272001029'))
        self.assertFalse(sync.valid_ean('7790272001020'))
        for value in ['nan','inf','0','-10']:
            with self.assertRaises(ValueError):sync.positive(value)
    def test_failed_sync_preserves_history(self):
        with tempfile.TemporaryDirectory() as directory:
            snap=Path(directory)/'snapshot.json';history=Path(directory)/'history.json'
            old={'id':'p@branch','query_date':'2026-10-29T00:00:00+00:00','current_price':100}
            sync.atomic_json(snap,{'products':[],'observations':[old],'sources':{},'branches':[]})
            sync.atomic_json(history,[old])
            with mock.patch.object(sync,'SNAPSHOT',snap),mock.patch.object(sync,'HISTORY',history),mock.patch.object(sync,'collect_coope',side_effect=ValueError('Fuente caída')),mock.patch('sys.argv',['sync']):
                with self.assertRaises(SystemExit):sync.main()
            self.assertEqual(sync.read_json(history,[]),[old])
            self.assertEqual(sync.read_json(snap,{})['observations'],[old])
    def test_csv_rejects_missing_traceability(self):
        with tempfile.NamedTemporaryFile('w',suffix='.csv') as file:
            file.write('supermarket_id,ean\ncoto,incorrecto\n');file.flush()
            with self.assertRaises(ValueError):sync.load_csv(file.name,datetime.now(timezone.utc))
