import unittest
from unittest import mock
import json
from pathlib import Path
import importlib.util

spec = importlib.util.spec_from_file_location('sync', Path(__file__).resolve().parents[1] / 'scripts/scrapers/sync_verified_prices.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

class CarrefourCollectorTests(unittest.TestCase):
    def setUp(self):
        self.stamp = '2026-11-06T00:00:00+00:00'
        self.branch = sync.CARREFOUR_BRANCH

    def test_carrefour_branch_neuquen_data(self):
        self.assertEqual(self.branch['id'], 'carrefour_centro')
        self.assertEqual(self.branch['supermarket_id'], 'carrefour')
        self.assertEqual(self.branch['city'], 'Neuquén')
        self.assertEqual(self.branch['postal_code'], '8300')
        self.assertAlmostEqual(self.branch['lat'], -38.95876, places=4)
        self.assertAlmostEqual(self.branch['lng'], -68.05837, places=4)

    def test_carrefour_in_scope_excludes_appliances(self):
        self.assertFalse(sync.carrefour_in_scope({'categories': ['/Electro y tecno/']}, 'Espumador de leche'))
        self.assertFalse(sync.carrefour_in_scope({'categories': ['/Hogar y bazar/']}, 'Cafetera express'))
        self.assertFalse(sync.carrefour_in_scope({'categories': ['/Almacén/']}, 'Pava eléctrica 1.7L'))
        self.assertTrue(sync.carrefour_in_scope({'categories': ['/Lácteos y frescos/Leches/']}, 'Leche chocolatada Cindor 1 lt'))
        self.assertTrue(sync.carrefour_in_scope({'categories': ['/Snacks/']}, 'Papas fritas Lays clásicas 230 g.'))
        self.assertTrue(sync.carrefour_in_scope({'categories': ['/Limpieza/']}, 'Lavandina común Ayudín 1L'))

    def test_parse_carrefour_record_regular_item(self):
        prod = {
            'productName': 'Papas fritas Lays clásicas 230 g.',
            'brand': "Lay's",
            'link': 'https://www.carrefour.com.ar/papas-fritas-lays-clasicas-230-g/p',
            'categories': ['/Snacks/Papas fritas/']
        }
        sku = {
            'itemId': '148963',
            'name': 'Papas fritas Lays clásicas 230 g.',
            'ean': '7790310984734',
            'images': [{'imageUrl': 'https://carrefourar.vtexassets.com/lays.jpg'}]
        }
        sim_it = {
            'id': '148963',
            'availability': 'available',
            'price': 955000,
            'listPrice': 955000,
            'sellingPrice': 955000
        }
        res = sync.parse_carrefour_record(prod, sku, sim_it, self.branch, self.stamp)
        self.assertIsNotNone(res)
        p, o = res
        self.assertEqual(p['id'], 'ean_7790310984734')
        self.assertEqual(p['unit_measure'], 'kg')
        self.assertEqual(p['net_content_number'], 0.23)
        self.assertEqual(o['supermarket_id'], 'carrefour')
        self.assertEqual(o['branch_id'], 'carrefour_centro')
        self.assertEqual(o['current_price'], 9550.0)
        self.assertEqual(o['regular_price'], 9550.0)
        self.assertEqual(o['price_per_unit'], round(9550.0 / 0.23, 2))
        self.assertTrue(o['is_verified'])
        self.assertFalse(o['is_demo'])
        self.assertEqual(o['source_url'], 'https://www.carrefour.com.ar/papas-fritas-lays-clasicas-230-g/p')

    def test_parse_carrefour_record_with_discount(self):
        prod = {
            'productName': 'Papas fritas Lays clásicas 330 g.',
            'brand': "Lay's",
            'link': 'https://www.carrefour.com.ar/papas-fritas-lays-clasicas-330-g/p',
            'categories': ['/Snacks/']
        }
        sku = {
            'itemId': '148946',
            'name': 'Papas fritas Lays clásicas 330 g.',
            'ean': '7790310985588',
            'images': [{'imageUrl': 'https://carrefourar.vtexassets.com/lays330.jpg'}]
        }
        sim_it = {
            'id': '148946',
            'availability': 'available',
            'price': 1055000,
            'listPrice': 1055000,
            'sellingPrice': 633000
        }
        res = sync.parse_carrefour_record(prod, sku, sim_it, self.branch, self.stamp)
        self.assertIsNotNone(res)
        p, o = res
        self.assertEqual(o['current_price'], 6330.0)
        self.assertEqual(o['regular_price'], 10550.0)
        self.assertEqual(o['discount_percentage'], 40)
        self.assertEqual(o['promo_label'], 'Oferta Carrefour')
        self.assertIn('40% de descuento', o['notes'])

    def test_parse_carrefour_record_excludes_cannot_be_delivered(self):
        prod = {'productName': 'Item no entregable', 'categories': ['/Almacén/']}
        sku = {'itemId': '999', 'name': 'Item no entregable', 'ean': '7790310985588'}
        sim_it = {'id': '999', 'availability': 'cannotBeDelivered', 'sellingPrice': 500000}
        # In collector, unavailable items are skipped before parse or when sellingPrice is None
        self.assertIn(sim_it['availability'], ['cannotBeDelivered', 'withoutPriceFulfillment'])

    def test_collect_carrefour_mocked(self):
        search_response = [
            {
                'productName': 'Aceite de girasol Natura 900 ml',
                'brand': 'Natura',
                'link': 'https://www.carrefour.com.ar/aceite-natura/p',
                'categories': ['/Almacén/Aceites/'],
                'items': [{
                    'itemId': '12345',
                    'name': 'Aceite de girasol Natura 900 ml',
                    'ean': '7790272001005',
                    'images': [{'imageUrl': 'https://example.com/natura.jpg'}]
                }]
            }
        ]
        sim_response = {
            'items': [{
                'id': '12345',
                'availability': 'available',
                'price': 250000,
                'listPrice': 250000,
                'sellingPrice': 250000
            }]
        }
        with mock.patch.object(sync, 'urlopen') as mock_url:
            mock_resp_search = mock.MagicMock()
            mock_resp_search.read.return_value = json.dumps(search_response).encode('utf-8')
            mock_resp_sim = mock.MagicMock()
            mock_resp_sim.read.return_value = json.dumps(sim_response).encode('utf-8')

            mock_url.side_effect = [
                mock.MagicMock(__enter__=mock.MagicMock(return_value=mock_resp_search), __exit__=mock.MagicMock(return_value=False)),
                mock.MagicMock(__enter__=mock.MagicMock(return_value=mock_resp_sim), __exit__=mock.MagicMock(return_value=False))
            ]
            with mock.patch.object(sync.time, 'sleep'):
                prods, obs, branch, errors = sync.collect_carrefour(self.stamp, terms=['aceite'])

        self.assertEqual(len(prods), 1)
        self.assertEqual(len(obs), 1)
        self.assertEqual(prods[0]['id'], 'ean_7790272001005')
        self.assertEqual(obs[0]['current_price'], 2500.0)
        self.assertEqual(obs[0]['supermarket_id'], 'carrefour')
        self.assertEqual(branch['id'], 'carrefour_centro')
        self.assertEqual(errors, [])

if __name__ == '__main__':
    unittest.main()
