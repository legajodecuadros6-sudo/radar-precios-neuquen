import importlib.util
from pathlib import Path
from unittest import TestCase

spec = importlib.util.spec_from_file_location('yaguar', Path(__file__).resolve().parents[1] / 'scripts/scrapers/probe_yaguar.py')
yaguar = importlib.util.module_from_spec(spec)
spec.loader.exec_module(yaguar)

class YaguarProbeTests(TestCase):
    def row(self):
        return {'id':82303,'sku':'9333','name':'GASEOSA MANAOS POMELO BLANCO 2,25LT',
                'permalink':'https://yaguar.com.ar/neuquen/producto/gaseosa-manaos-pomelo-blanco-225lt/',
                'type':'simple','is_purchasable':True,'is_in_stock':True,'is_on_backorder':False,
                'prices':{'currency_code':'ARS','currency_minor_unit':0,'price':'2168','price_range':None},
                'add_to_cart':{'minimum':6,'multiple_of':6}}

    def test_price_scale_minimum_and_pending_status(self):
        row=self.row();record=yaguar.parse_product(row,'2026-11-01T00:00:00+00:00')
        self.assertEqual(record['api_price_ars'],2168)
        self.assertEqual(record['minimum'],6)
        self.assertEqual(record['multiple'],6)
        self.assertFalse(record['is_verified'])
        self.assertIsNone(record['tax_included'])
        self.assertNotIn('ean',record)
        row['prices'].update(currency_minor_unit=2,price='216800')
        self.assertEqual(yaguar.parse_product(row,'date')['api_price_ars'],2168)

    def test_wrong_branch_currency_and_minimum_are_rejected(self):
        for mutation in [lambda r:r.update(permalink='https://yaguar.com.ar/salta/producto/foo/'),
                         lambda r:r['prices'].update(currency_code='USD'),
                         lambda r:r['prices'].update(price='NaN'),
                         lambda r:r['add_to_cart'].update(multiple_of=0)]:
            row=self.row();mutation(row)
            with self.assertRaises(ValueError):yaguar.parse_product(row,'date')

    def test_out_of_stock_is_not_imported(self):
        row=self.row();row['is_in_stock']=False
        self.assertIsNone(yaguar.parse_product(row,'date'))
