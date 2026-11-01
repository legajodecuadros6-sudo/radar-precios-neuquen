import importlib.util
from pathlib import Path
from unittest import TestCase, mock
from datetime import datetime, timezone
import tempfile, csv
spec=importlib.util.spec_from_file_location('sync',Path(__file__).resolve().parents[1]/'scripts/scrapers/sync_verified_prices.py')
sync=importlib.util.module_from_spec(spec);spec.loader.exec_module(sync)
class VerifiedImportTests(TestCase):
    def test_categories_do_not_confuse_flavours_with_product_types(self):
        self.assertEqual(sync.category('Vino tinto 1L'), 'Bebidas alcohólicas')
        self.assertEqual(sync.category('Cerveza sin alcohol 473cc'), 'Bebidas')
        self.assertEqual(sync.category('Papas fritas lays 134grs'), 'Snacks')
        self.assertIn('manaos pomelo', sync.TERMS)
        self.assertIn('lays', sync.TERMS)
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
    def test_empty_end_page_is_not_a_source_failure(self):
        branch={'id_local':124,'localidad_desc':'Neuquén','cod_postal':8300,'descripcion':'Oeste','direccion':'Dirección','datos':{'coordenadas':{'latitud':-38.95,'longitud':-68.1}}}
        article={'cod_interno':'123','descripcion':'papas fritas lays 134grs','estado':'1','precio':100,'gramaje':134,'unimed_desc':'grs'}
        with mock.patch.object(sync,'request_json',side_effect=[{'datos':[branch]},{'estado':1,'datos':[article]},{'estado':2,'datos':[]}]),mock.patch.object(sync.time,'sleep'):
            products,observations,_,errors=sync.collect_coope('2026-11-01T00:00:00+00:00',terms=['lays'])
        self.assertEqual(len(products),1);self.assertEqual(len(observations),1);self.assertEqual(errors,[])

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


class MakroTests(TestCase):
    def page(self,name='ACEITE M&amp;K BTX900ML',price='$ 3.740,00'):
        return f"""<p class="mlp-lista-precios__fecha">Fecha de publicación: Sábado 31 De Octubre De 2026, 05:01 hs</p>
        <table class="mlp-lista-precios__table"><tr><th>Código</th><th>Producto</th><th>Precio regular</th><th>Precio sin impuestos nacionales</th></tr>
        <tr><td>12345</td><td>{name}</td><td>{price}</td><td>$ 3.090,91</td></tr></table>
        IVA INCLUIDO PARA LA SUCURSAL DE NEUQUÉN"""
    def test_regular_tax_included_price_and_source_date(self):
        ps,obs,_,_=sync.parse_makro(self.page(),'2026-10-31T23:00:00+00:00')
        self.assertEqual(obs[0]['current_price'],3740)
        self.assertEqual(obs[0]['query_date'],'2026-10-31T05:01:00-03:00')
        self.assertEqual(obs[0]['channel'],'store');self.assertEqual(ps[0]['net_content_number'],.9)
        self.assertNotIn('ean',ps[0]);self.assertEqual(ps[0]['name'],'ACEITE M&K BTX900ML')
    def test_repeated_fetch_does_not_refresh_source_observation(self):
        _,a,_,_=sync.parse_makro(self.page(),'2026-10-31T12:00:00+00:00')
        _,b,_,_=sync.parse_makro(self.page(),'2026-11-01T12:00:00+00:00')
        self.assertEqual(a[0]['query_date'],b[0]['query_date'])
    def test_rejects_stale_future_or_missing_publication(self):
        for stamp in ['2026-10-30T12:00:00+00:00','2026-11-05T12:00:00+00:00']:
            with self.assertRaises(ValueError):sync.parse_makro(self.page(),stamp)
        with self.assertRaises(ValueError):sync.parse_makro(self.page().replace('mlp-lista-precios__fecha','other'),'2026-10-31T23:00:00+00:00')
    def test_rejects_ambiguous_units_wrong_columns_or_wrong_locality(self):
        for page in [self.page('NALGA SIN TAPA'),self.page('TE 25S X2GR'),self.page().replace('Precio regular','Precio por bulto'),self.page().replace('NEUQUÉN','MENDOZA'),self.page(price='$ consultar')]:
            with self.assertRaises(ValueError):sync.parse_makro(page,'2026-10-31T23:00:00+00:00')


class VitalTests(TestCase):
    def fixture(self):
        p={'linkText':'aceite-natura','brand':'Natura'}
        sku={'itemId':'123','ean':'7790272001005','name':'Aceite Natura 900 ml','unitMultiplier':12}
        row={'id':'123','seller':'arvitalne','quantity':1,'availability':'available','measurementUnit':'UN','tax':0,'priceTags':[],'unitMultiplier':12,'price':10000,'sellingPrice':120000,'priceDefinition':{'pricePerUnit':10000}}
        address={'city':'Neuquén','postalCode':'8300','country':'ARG'}
        response={'items':[row],'logisticsInfo':[{'itemIndex':0,'slas':[{'deliveryChannel':'pickup-in-point','pickupStoreInfo':{'address':address}}]}]}
        return p,sku,response,'2026-10-31T23:00:00+00:00'
    def test_bundle_quote_keeps_unit_price_and_quantity_multiple(self):
        p,o=sync.vital_record(*self.fixture())
        self.assertEqual(o['current_price'],100);self.assertEqual(o['min_quantity'],12);self.assertEqual(o['quantity_multiple'],12)
        self.assertEqual(p['net_content_number'],.9)
    def test_rejects_wrong_seller_missing_stock_tax_or_bundle_total(self):
        for k,v in [('seller','1'),('availability','withoutStock'),('tax',100),('sellingPrice',110000),('priceTags',[{'coupon':True}])]:
            args=self.fixture();args[2]['items'][0][k]=v
            self.assertIsNone(sync.vital_record(*args),k)
        args=self.fixture();args[2]['logisticsInfo']=[];self.assertIsNone(sync.vital_record(*args))
    def test_ambiguous_sizes_rejected_and_explicit_multipack_normalized(self):
        args=self.fixture();args[1]['name']='Galletitas 250/300 gr';self.assertIsNone(sync.vital_record(*args))
        args=self.fixture();args[1]['name']='Galletitas 3 u 105 gr'
        p,_=sync.vital_record(*args);self.assertAlmostEqual(p['net_content_number'],.315)
    def test_catalog_reads_graphql_field_name(self):
        state={'p':{'__typename':'Product','items({"filter":"ALL_AVAILABLE"})':[{'id':'sku'}]},'sku':{'__typename':'SKU','ean':'7790272001005','itemId':'1','images':[]}}
        import json
        page='<template data-type="json" data-varname="__STATE__"><script>'+json.dumps(state)+'</script></template>'
        self.assertEqual(len(sync.vital_catalog(page)),1)
