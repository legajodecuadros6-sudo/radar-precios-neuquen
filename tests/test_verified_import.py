import importlib.util
from pathlib import Path
from unittest import TestCase, mock
from datetime import datetime, timezone
import tempfile, csv
spec=importlib.util.spec_from_file_location('sync',Path(__file__).resolve().parents[1]/'scripts/scrapers/sync_verified_prices.py')
sync=importlib.util.module_from_spec(spec);spec.loader.exec_module(sync)
class VerifiedImportTests(TestCase):
    def test_categories_do_not_confuse_flavours_with_product_types(self):
        self.assertEqual(sync.category('Ramen arcor sabor pollo 70grs'), 'Almacén')
        self.assertEqual(sync.category('Aceite en aerosol sabor manteca'), 'Almacén')
        self.assertEqual(sync.category('Galletitas de agua'), 'Almacén')
        self.assertEqual(sync.category('Pollo entero fresco'), 'Carnicería')
        self.assertEqual(sync.category('Aceite para bebé'), 'Cuidado Personal')

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
            with mock.patch.object(sync,'SNAPSHOT',snap),mock.patch.object(sync,'HISTORY',history),mock.patch.object(sync,'collect_coope',side_effect=ValueError('Fuente caída')),mock.patch('sys.argv',['sync','--source','cooperativa_obrera']):
                with self.assertRaises(SystemExit):sync.main()
            self.assertEqual(sync.read_json(history,[]),[old])
            self.assertEqual(sync.read_json(snap,{})['observations'],[old])
    def test_csv_rejects_missing_traceability(self):
        with tempfile.NamedTemporaryFile('w',suffix='.csv') as file:
            file.write('supermarket_id,ean\ncoto,incorrecto\n');file.flush()
            with self.assertRaises(ValueError):sync.load_csv(file.name,datetime.now(timezone.utc))

class ChangoMasTests(TestCase):
    def fixture(self):
        product={'productName':'Aceite Natura 900 Ml','brand':'NATURA','link':'https://www.masonline.com.ar/aceite/p'}
        sku={'itemId':'13744','ean':'7790272001005','measurementUnit':'un','unitMultiplier':1,'name':'Aceite Natura 900 Ml'}
        row={'id':'13744','seller':sync.MAS_SELLER,'quantity':1,'availability':'available','tax':0,'priceTags':[],'price':471900,'sellingPrice':471900}
        response={'items':[row],'logisticsInfo':[{'itemIndex':0,'slas':[{'deliveryIds':[{'warehouseId':'Inv-Full-3608','dockId':'Muelle-Full-3608'}]}]}]}
        branch={'id':'changomas_3608','name':'ChangoMás Perticone','address':'Perticone 1255'}
        return product,sku,response,branch,'2026-10-31T18:00:00+00:00'
    def test_local_quote_converts_cents_and_retains_official_ean(self):
        p,o=sync.mas_record(*self.fixture())
        self.assertEqual(p['ean'],'7790272001005');self.assertEqual(p['net_content_number'],.9)
        self.assertEqual(o['current_price'],4719);self.assertEqual(o['branch_id'],'changomas_3608')
    def test_rejects_wrong_seller_stock_discount_and_wrong_branch(self):
        for field,value in [('seller','1'),('availability','withoutStock'),('quantity',2),('tax',10),('priceTags',[{'name':'card'}]),('sellingPrice',400000)]:
            args=self.fixture();args[2]['items'][0][field]=value
            self.assertIsNone(sync.mas_record(*args),field)
        args=self.fixture();args[2]['logisticsInfo'][0]['slas'][0]['deliveryIds'][0]['warehouseId']='Buenos Aires'
        self.assertIsNone(sync.mas_record(*args))
    def test_rejects_invalid_ean_and_weighed_products(self):
        for field,value in [('ean','7790272001000'),('measurementUnit','kg'),('unitMultiplier',.5),('isKit',True)]:
            args=self.fixture();args[1][field]=value
            self.assertIsNone(sync.mas_record(*args),field)
    def test_multipacks_do_not_claim_single_unit_normalized_volume(self):
        args=self.fixture();args[1]['name']='Pack aceite 900 ml x 6'
        p,_=sync.mas_record(*args)
        self.assertEqual(p['unit_measure'],'unidad')
    def test_rejects_unconfirmed_branch(self):
        with mock.patch.object(sync,'request_json',return_value={'items':[]}):
            with self.assertRaises(ValueError):sync.mas_branch()

    def test_household_containers_and_motor_oil_are_not_imported_as_food(self):
        for name in ['Rociador De Aceite 450ml','Aceite Totalenergies 9000 5w40 1l','Copa Agua Fiore 400ml']:
            args=self.fixture();args[1]['name']=name
            self.assertIsNone(sync.mas_record(*args))
        self.assertEqual(sync.category('Agua Micelar Vn 200ml'),'Cuidado Personal')
        self.assertEqual(sync.category('Agua Desmineralizada 1 Lts'),'Limpieza')
