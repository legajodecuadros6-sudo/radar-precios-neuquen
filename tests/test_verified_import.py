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
        for stamp in ['2026-10-20T12:00:00+00:00','2026-11-10T12:00:00+00:00']:
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

class YaguarTests(TestCase):
    def test_price_scale_minimum_and_last_page_warning(self):
        item={'id':82303,'type':'simple','is_purchasable':True,'is_in_stock':True,'is_on_backorder':False,
              'permalink':'https://yaguar.com.ar/neuquen/producto/gaseosa-manaos-pomelo-blanco-225lt/',
              'prices':{'currency_code':'ARS','currency_minor_unit':0,'price':'2168','regular_price':'2168','price_range':None},
              'add_to_cart':{'minimum':1,'multiple_of':1},'name':'GASEOSA MANAOS POMELO BLANCO 2,25LT','brands':[]}
        product,obs=sync.yagu_record(item,'2026-11-03T00:00:00+00:00')
        self.assertEqual(product['id'],'yaguar_82303');self.assertEqual(product['net_content_number'],2.25)
        self.assertEqual(obs['current_price'],2168);self.assertEqual(obs['min_quantity'],1)
    def test_rejects_wrong_city_ambiguo_or_out_of_stock(self):
        base={'id':1,'type':'simple','is_purchasable':True,'is_in_stock':True,'is_on_backorder':False,
              'permalink':'https://yaguar.com.ar/neuquen/producto/x/','prices':{'currency_code':'ARS','currency_minor_unit':0,'price':'100','regular_price':'100','price_range':None},'add_to_cart':{'minimum':1,'multiple_of':1},'name':'GASEOSA X'}
        self.assertIsNone(sync.yagu_record({**base,'is_in_stock':False},'s'))
        with self.assertRaises(ValueError):sync.yagu_record({**base,'permalink':'https://yaguar.com.ar/producto/x/'},'s')
        with self.assertRaises(ValueError):sync.yagu_record({**base,'permalink':'https://yaguar.com.ar/cipolletti/producto/x/'},'s')
        bad={**base,'prices':{**base['prices'],'currency_minor_unit':'0'}}
        with self.assertRaises(ValueError):sync.yagu_record(bad,'s')
        bad2={**base,'add_to_cart':{'minimum':0,'multiple_of':1}}
        with self.assertRaises(ValueError):sync.yagu_record(bad2,'s')
    def test_minimum_greater_than_one_translates_to_terms(self):
        item={'id':2,'type':'simple','is_purchasable':True,'is_in_stock':True,'is_on_backorder':False,
              'permalink':'https://yaguar.com.ar/neuquen/producto/papas-fritas-lays-ketchup-77gr/',
              'prices':{'currency_code':'ARS','currency_minor_unit':0,'price':'3638','regular_price':'4020','price_range':None},
              'add_to_cart':{'minimum':2,'multiple_of':2},'name':'PAPAS FRITAS LAYS KETCHUP 77GR','brands':[]}
        _,obs=sync.yagu_record(item,'2026-11-03T00:00:00+00:00')
        self.assertEqual(obs['regular_price'],4020);self.assertEqual(obs['current_price'],3638)
        self.assertEqual(obs['min_quantity'],2);self.assertEqual(obs['quantity_multiple'],2)

class CotoTests(TestCase):
    BRANCH={'id':'coto_185','supermarket_id':'coto','name':'Coto · Neuquén','brand_name':'Coto','type':'minorista','address':'Ruta Provincial Nº 7 y Dr. Ramón','city':'Neuquén','postal_code':'8300','lat':-38.9411580,'lng':-68.0631931}
    def item(self):
        return {'value':'Gaseosa Pomelo Blanco Manaos Bot 2.25 Ltr','data':{'sku_id':'sku00617702','sku_display_name':'Gaseosa Pomelo Blanco Manaos Bot 2.25 Ltr','product_brand':'MANAOS','product_main_ean':'7798113301024','url':'_/R-00617702-00617702-200','image_url':'https://static.cotodigital3.com.ar/sitios/fotos/large/00617700/00617702.jpg','product_format':'Litro','price':[{'id':'pl091_00617702','store':'091','listPrice':2420,'priceList':'priceList091'},{'id':'pl185_00617702','store':'185','listPrice':2420,'priceList':'priceList185','saleImage1':'oferta.png'}],'discounts':[{'discountText':'15%Dto','discountPrice':'$2057.00','comments':'No acumulable con otras promos'}]}}
    def test_search_price_scale_ean_and_discount(self):
        product,obs=sync.coto_record(self.item(),'185',self.BRANCH,'2026-11-03T20:00:00+00:00')
        self.assertEqual(product['id'],'ean_7798113301024');self.assertEqual(product['ean'],'7798113301024')
        self.assertEqual(product['unit_measure'],'litro');self.assertEqual(product['net_content_number'],2.25)
        self.assertEqual(obs['regular_price'],2420);self.assertEqual(obs['current_price'],2420)
        self.assertNotIn('discount_percentage',obs);self.assertEqual(obs['unit_label'],'$ / L')
        self.assertTrue(obs['source_url'].startswith('https://www.cotodigital.com.ar/sitios/cdigi/browse/_/R-'))
        self.assertIn('Confirmar stock',obs['notes'])
    def test_without_offer_uses_list_price(self):
        item=self.item();item['data']['discounts']=[]
        product,obs=sync.coto_record(item,'185',self.BRANCH,'s')
        self.assertEqual(obs['current_price'],2420);self.assertEqual(obs['regular_price'],2420)
        self.assertNotIn('discount_percentage',obs);self.assertNotIn('promo_label',obs)
    def test_rejects_other_store_weighed_and_multipack(self):
        with self.assertRaises(ValueError):sync.coto_record(self.item(),'091',self.BRANCH,'s')
        weighed=self.item();weighed['data']['sku_id']='sku90001';weighed['data']['sku_display_name']='Pomelo Rojo . Xkg';weighed['value']='Pomelo Rojo . Xkg'
        self.assertIsNone(sync.coto_record(weighed,'185',self.BRANCH,'s'))
        pack=self.item();pack['data']['sku_id']='sku90002';pack['data']['sku_display_name']='Pack 2 Gaseosas Manaos 2.25 lt'
        self.assertIsNone(sync.coto_record(pack,'185',self.BRANCH,'s'))
        overdue=self.item();overdue['data']['price']=[p for p in overdue['data']['price'] if p['store']!='185']
        self.assertIsNone(sync.coto_record(overdue,'185',self.BRANCH,'s'))
        no_sku=self.item();no_sku['data']['sku_id']=''
        with self.assertRaises(ValueError):sync.coto_record(no_sku,'185',self.BRANCH,'s')
    def test_branch_list_finds_neuquen_and_requires_it(self):
        page='{"heading":"NEUQUÉN","rows":[{"sucursal":"185","nombre":"NEUQUEN","direccion":"RUTA PROVINCIAL N 7 Y DR RAMON - NEUQUÉN","tipo":"HIPER"}]}'
        code,branch=sync.coto_branch(page=page)
        self.assertEqual(code,'185');self.assertEqual(branch['id'],'coto_185')
        page_no_nq='{"heading":"SANTA FE","rows":[{"sucursal":"060","nombre":"SANTA FE","direccion":"ROSARIO - SANTA FE"}]}'
        with self.assertRaises(ValueError):sync.coto_branch(page=page_no_nq)

class LaAnonimaTests(TestCase):
    def branch_fixture(self):
        return {
            'id': 'la_anonima_patagonia',
            'supermarket_id': 'la_anonima',
            'name': 'La Anónima · Paseo de la Patagonia',
            'address': 'Antártida Argentina 1111',
            'city': 'Neuquén',
            'postal_code': '8300'
        }

    def test_record_units_offers_and_ean(self):
        branch = self.branch_fixture()
        item = {
            'code': '2438409',
            'name': 'Aceite de Girasol La Anónima x 900 cc.',
            'brand': 'La Anonima',
            'price': '5200',
            'regular_price': '6000',
            'href': '/aceite-de-girasol-la-anonima-x-900-cc/art_2438409/',
            'image_url': 'https://d34zqip92wkcpm.cloudfront.net/test.jpg',
            'stock': '779'
        }
        product, obs = sync.anonima_record(item, branch, '2026-11-03T00:00:00+00:00', ean='7799044003780')
        self.assertEqual(product['id'], 'ean_7799044003780')
        self.assertEqual(product['ean'], '7799044003780')
        self.assertEqual(product['net_content_number'], 0.9)
        self.assertEqual(product['unit_measure'], 'litro')
        self.assertEqual(obs['product_id'], 'ean_7799044003780')
        self.assertEqual(obs['current_price'], 5200.0)
        self.assertEqual(obs['regular_price'], 6000.0)
        self.assertEqual(obs['discount_percentage'], 13)
        self.assertEqual(obs['promo_label'], 'Oferta online')
        self.assertEqual(obs['branch_id'], 'la_anonima_patagonia')
        self.assertEqual(obs['source_url'], 'https://www.laanonima.com.ar/aceite-de-girasol-la-anonima-x-900-cc/art_2438409/')
        self.assertTrue(obs['is_verified'])

        # Without EAN, product id uses anonima_<code>
        p_no_ean, _ = sync.anonima_record(item, branch, '2026-11-03T00:00:00+00:00', ean=None)
        self.assertEqual(p_no_ean['id'], 'anonima_2438409')
        self.assertNotIn('ean', p_no_ean)

    def test_rejects_out_of_stock_motor_oil_and_missing_code(self):
        branch = self.branch_fixture()
        base = {'code': '123', 'name': 'Aceite de Girasol 900 cc', 'price': '1000', 'stock': '10', 'href': '/art_123/'}
        self.assertIsNone(sync.anonima_record({**base, 'stock': '-1'}, branch, 'stamp'))
        self.assertIsNone(sync.anonima_record({**base, 'stock': '0'}, branch, 'stamp'))
        self.assertIsNone(sync.anonima_record({**base, 'name': 'Aceite Totalenergies 10w40 1l'}, branch, 'stamp'))
        self.assertIsNone(sync.anonima_record({**base, 'code': ''}, branch, 'stamp'))

    def test_multipacks_kept_as_units(self):
        branch = self.branch_fixture()
        pack = {'code': '1', 'name': 'Cerveza Quilmes Lata 710 cc x 4', 'price': '10000', 'stock': '5'}
        p1, _ = sync.anonima_record(pack, branch, 'stamp')
        self.assertEqual(p1['unit_measure'], 'unidad')
        self.assertEqual(p1['net_content_number'], 1)

        single = {'code': '2', 'name': 'Yerba Mate c/Palo Suave Playadito x 1 Kg.', 'price': '4950', 'stock': '20'}
        p2, _ = sync.anonima_record(single, branch, 'stamp')
        self.assertEqual(p2['unit_measure'], 'kg')
        self.assertEqual(p2['net_content_number'], 1.0)

    def test_html_parser_extracts_cards_with_spaced_attributes(self):
        mock_html = """
        <div id-codigo-producto="101" class="producto-item large-4 cell">
            <a href="/yerba-playadito/art_101/" data-codigo = "101" data-nombre = "Yerba Mate Playadito x 1 Kg."
               data-marca = "Playadito" data-precio = "4950" data-precio_anterior = "5500" data-precio_oferta = "4950">
                <img data-src="https://img.test/yerba.jpg">
                <span data-stock="15"></span>
            </a>
        </div>
        """
        parser = sync.AnonimaCardParser()
        parser.feed(mock_html)
        parser.close()
        self.assertEqual(len(parser.items), 1)
        self.assertEqual(parser.items[0]['code'], '101')
        self.assertEqual(parser.items[0]['name'], 'Yerba Mate Playadito x 1 Kg.')
        self.assertEqual(parser.items[0]['price'], '4950')
        self.assertEqual(parser.items[0]['stock'], '15')

    def test_branch_validation_rejects_missing_neuquen(self):
        with mock.patch.object(sync, 'urlopen') as mock_url:
            mock_resp = mock.MagicMock()
            mock_resp.read.return_value = b'{"super":{"haySucursalSuper":true,"sucursales":[{"descLocalidad":"Bariloche","idSucursalSuper":"5"}]}}'
            mock_url.return_value.__enter__.return_value = mock_resp
            with self.assertRaises(ValueError):
                sync.anonima_branch()


class JumboTests(TestCase):
    def test_record_units_offers_and_ean(self):
        branch = sync.JUMBO_BRANCH
        prod = {
            'productName': 'Gaseosa Cola Sabor Original 2.25 Lts Coca Cola',
            'brand': 'Coca Cola',
            'link': 'https://www.jumbo.com.ar/gaseosa-coca-cola-2-25-lts/p'
        }
        sku = {
            'itemId': '246613',
            'name': 'Gaseosa Cola Sabor Original 2.25 Lts Coca Cola',
            'ean': '7790895000997',
            'images': [{'imageUrl': 'https://jumboargentinaio.vtexassets.com/test.jpg'}]
        }
        p, o = sync.jumbo_record(prod, sku, 6290.0, 7000.0, branch, '2026-11-03T00:00:00+00:00')
        self.assertEqual(p['id'], 'ean_7790895000997')
        self.assertEqual(p['ean'], '7790895000997')
        self.assertEqual(p['unit_measure'], 'litro')
        self.assertEqual(p['net_content_number'], 2.25)
        self.assertEqual(o['supermarket_id'], 'jumbo')
        self.assertEqual(o['branch_id'], 'jumbo_portal_patagonia')
        self.assertEqual(o['current_price'], 6290.0)
        self.assertEqual(o['regular_price'], 7000.0)
        self.assertEqual(o['discount_percentage'], 10)
        self.assertEqual(o['promo_label'], 'Oferta Jumbo')
        self.assertTrue(o['is_verified'])

        # Without EAN
        sku_no_ean = {**sku, 'ean': ''}
        p2, o2 = sync.jumbo_record(prod, sku_no_ean, 6290.0, 6290.0, branch, '2026-11-03T00:00:00+00:00')
        self.assertEqual(p2['id'], 'jumbo_246613')
        self.assertNotIn('ean', p2)
        self.assertNotIn('promo_label', o2)

    def test_rejects_weighed_multipack_and_out_of_scope(self):
        branch = sync.JUMBO_BRANCH
        prod = {'productName': 'Test', 'brand': 'Test'}
        sku = {'itemId': '123', 'ean': '7790895000997'}
        # Pesable
        self.assertIsNone(sync.jumbo_record({**prod, 'productName': 'Banana x kg'}, sku, 1000, 1000, branch, 's'))
        # Multipack
        self.assertIsNone(sync.jumbo_record({**prod, 'productName': 'Pack 6 Cerveza 473 ml'}, sku, 1000, 1000, branch, 's'))
        # Fuera de rubro
        self.assertIsNone(sync.jumbo_record({**prod, 'productName': 'Aceite Totalenergies 10w40'}, sku, 1000, 1000, branch, 's'))

    def test_branch_metadata_valid(self):
        self.assertEqual(sync.JUMBO_BRANCH['id'], 'jumbo_portal_patagonia')
        self.assertEqual(sync.JUMBO_BRANCH['supermarket_id'], 'jumbo')
        self.assertEqual(sync.JUMBO_SELLER, 'jumboargentinaj5216neuquen')



class RegionalSafetyTests(TestCase):
    def test_yaguar_request_error_is_reported_without_attribute_error(self):
        with mock.patch.object(sync,'yagu_json',side_effect=[{'name':'Yaguar Neuquen','timezone_string':'America/Argentina/Buenos_Aires'},ValueError('fuente caída')]):
            with self.assertRaisesRegex(ValueError,'fuente caída'):
                sync.collect_yaguar('date',terms=['lays'])

    def test_yaguar_partial_failure_is_not_reported_as_complete(self):
        item={'id':1}
        record=({'id':'p'}, {'id':'o'})
        with mock.patch.object(sync,'yagu_json',side_effect=[{'name':'Yaguar Neuquen','timezone_string':'America/Argentina/Buenos_Aires'},[item],ValueError('error segundo término')]),mock.patch.object(sync,'yagu_record',return_value=record):
            _,observations,_,errors=sync.collect_yaguar('date',terms=['lays','manaos'])
        self.assertEqual(len(observations),1)
        self.assertTrue(any('error segundo término' in e for e in errors))

    def test_unknown_stock_is_not_verification(self):
        for stock in ['',None,'unknown','-1','0']:
            self.assertIsNone(sync.anonima_record({'code':'123','name':'Leche 1L','price':'100','stock':stock},{},'date'))

    def test_jumbo_requires_matching_local_unit_quote(self):
        row={'seller':sync.JUMBO_SELLER,'availability':'available','quantity':1,'measurementUnit':'un','unitMultiplier':1,'price':10000,'sellingPrice':10000,'tax':0,'priceTags':[]}
        self.assertTrue(sync.jumbo_quote_is_local(row))
        for bad in [{'seller':'1'},{'quantity':2},{'measurementUnit':'kg'},{'unitMultiplier':6},{'tax':10},{'sellingPrice':9000},{'priceTags':[{'name':'promo'}]}]:
            self.assertFalse(sync.jumbo_quote_is_local({**row,**bad}))
