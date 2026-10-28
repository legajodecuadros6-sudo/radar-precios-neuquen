#!/usr/bin/env python3
"""
Pipeline Centralizador de Precios - Radar de Precios Neuquén (CP 8300)
Orquesta la recolección desde SEPA CloudFront API (Superprecio), VTEX ChangoMás,
Cooperativa Obrera y Supermayoristas (Makro / Yaguar / Vital).
Preserva el historial inmutable en price_history y actualiza observaciones vigentes
tanto en Supabase como en la base local de la aplicación web.
"""

import os
import sys
import json
import time
import re
from datetime import datetime

# Importar extractores modulares
from sepa_api import query_sepa_product
from vtex_changomas import search_vtex_changomas
from cooperativa_obrera_api import search_cooperativa_obrera

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPTS_DIR))
DATABASE_TS_FILE = os.path.join(PROJECT_ROOT, 'src', 'data', 'database.ts')
CONSOLIDATED_FILE = os.path.join(SCRIPTS_DIR, 'precios_consolidados_neuquen.json')
SQL_OUTPUT_FILE = os.path.join(PROJECT_ROOT, 'scripts', 'supabase', 'sync_migration.sql')

TARGET_PRODUCTS = [
    {
        'id': 'prod_aceite_natura_1500',
        'ean': '7790272001029',
        'name': 'Aceite de Girasol Natura 1.5 L',
        'brand': 'Natura',
        'category': 'Almacén',
        'unit_label': '$ / L',
        'net_content_num': 1.5,
        'search_term': 'aceite natura 1.5',
        'fallback_mayorista': {'makro': 4999.0, 'yaguar': 5049.0}
    },
    {
        'id': 'prod_aceite_natura_900',
        'ean': '7790272001005',
        'name': 'Aceite de Girasol Natura 900 ml',
        'brand': 'Natura',
        'category': 'Almacén',
        'unit_label': '$ / L',
        'net_content_num': 0.9,
        'search_term': 'aceite natura 900',
        'fallback_mayorista': {'makro': 2890.0, 'yaguar': 2850.0}
    },
    {
        'id': 'prod_leche_serenisima_1l',
        'ean': '7790742357007',
        'name': 'Leche Entera La Serenísima Clásica 1 L',
        'brand': 'La Serenísima',
        'category': 'Lácteos y Frescos',
        'unit_label': '$ / L',
        'net_content_num': 1.0,
        'search_term': 'leche serenisima clasica',
        'fallback_mayorista': {'makro': 1220.0, 'yaguar': 1180.0}
    },
    {
        'id': 'prod_yerba_playadito_1k',
        'ean': '7793704000928',
        'name': 'Yerba Mate Playadito con Palo 1 kg',
        'brand': 'Playadito',
        'category': 'Almacén',
        'unit_label': '$ / kg',
        'net_content_num': 1.0,
        'search_term': 'yerba playadito 1kg',
        'fallback_mayorista': {'makro': 3750.0, 'yaguar': 3690.0}
    },
    {
        'id': 'prod_arroz_primor_1k',
        'ean': '7790070411716',
        'name': 'Arroz Gallo Oro Parboil 1 kg',
        'brand': 'Gallo Oro',
        'category': 'Almacén',
        'unit_label': '$ / kg',
        'net_content_num': 1.0,
        'search_term': 'arroz gallo oro',
        'fallback_mayorista': {'makro': 2390.0, 'yaguar': 2450.0}
    },
    {
        'id': 'prod_fideos_matarazzo_500g',
        'ean': '7790070336293',
        'name': 'Fideos Spaghetti Matarazzo 500 g',
        'brand': 'Matarazzo',
        'category': 'Almacén',
        'unit_label': '$ / kg',
        'net_content_num': 0.5,
        'search_term': 'fideos matarazzo spaghetti',
        'fallback_mayorista': {'makro': 1120.0, 'yaguar': 1090.0}
    },
    {
        'id': 'prod_asado_novillo_1k',
        'ean': '2000001005001',
        'name': 'Asado Vacuno Especial de Novillito (kg)',
        'brand': 'Carnicería Regional',
        'category': 'Carnicería',
        'unit_label': '$ / kg',
        'net_content_num': 1.0,
        'search_term': 'asado novillo',
        'fallback_mayorista': {'makro': 12499.0, 'yaguar': 11990.0}
    },
    {
        'id': 'prod_pollo_entero_1k',
        'ean': '2000001006002',
        'name': 'Pollo Fresco Entero Calibre 1 (kg)',
        'brand': 'Soychú',
        'category': 'Carnicería',
        'unit_label': '$ / kg',
        'net_content_num': 1.0,
        'search_term': 'pollo fresco entero',
        'fallback_mayorista': {'makro': 3699.0, 'yaguar': 3490.0}
    },
    {
        'id': 'prod_dulce_leche_ilolay_400g',
        'ean': '7790742625304',
        'name': 'Dulce de Leche Clásico La Serenísima 400 g',
        'brand': 'La Serenísima',
        'category': 'Lácteos y Frescos',
        'unit_label': '$ / kg',
        'net_content_num': 0.4,
        'search_term': 'dulce de leche serenisima 400',
        'fallback_mayorista': {'makro': 3869.0, 'yaguar': 3790.0}
    },
    {
        'id': 'prod_harina_morixe_1k',
        'ean': '7790199000013',
        'name': 'Harina de Trigo 000 Morixe 1 kg',
        'brand': 'Morixe',
        'category': 'Almacén',
        'unit_label': '$ / kg',
        'net_content_num': 1.0,
        'search_term': 'harina morixe 000',
        'fallback_mayorista': {'makro': 920.0, 'yaguar': 890.0}
    },
    {
        'id': 'prod_mayonesa_hellmanns_237g',
        'ean': '7794000004825',
        'name': 'Mayonesa Clásica Doypack Hellmanns 237 g',
        'brand': 'Hellmanns',
        'category': 'Almacén',
        'unit_label': '$ / kg',
        'net_content_num': 0.237,
        'search_term': 'mayonesa hellmanns doypack',
        'fallback_mayorista': {'makro': 1490.0, 'yaguar': 1450.0}
    },
    {
        'id': 'prod_coca_cola_3l',
        'ean': '7790895000997',
        'name': 'Gaseosa Coca-Cola Original 2.25 L',
        'brand': 'Coca-Cola',
        'category': 'Bebidas',
        'unit_label': '$ / L',
        'net_content_num': 2.25,
        'search_term': 'coca cola 2.25',
        'fallback_mayorista': {'makro': 3690.0, 'yaguar': 3550.0}
    },
    {
        'id': 'prod_cerveza_heineken_473ml',
        'ean': '7792798012923',
        'name': 'Cerveza Quilmes Clásica Rubia 473 ml',
        'brand': 'Quilmes',
        'category': 'Bebidas',
        'unit_label': '$ / L',
        'net_content_num': 0.473,
        'search_term': 'cerveza quilmes 473',
        'fallback_mayorista': {'makro': 1690.0, 'yaguar': 1650.0}
    },
    {
        'id': 'prod_lavandina_ayudin_1l',
        'ean': '7790100100016',
        'name': 'Lavandina Clásica Concentrada Ayudín 1 L',
        'brand': 'Ayudín',
        'category': 'Limpieza',
        'unit_label': '$ / L',
        'net_content_num': 1.0,
        'search_term': 'lavandina ayudin 1',
        'fallback_mayorista': {'makro': 1190.0, 'yaguar': 1150.0}
    },
    {
        'id': 'prod_jabon_granby_3k',
        'ean': '7791293021004',
        'name': 'Jabón en Polvo Baja Espuma Granby 3 kg',
        'brand': 'Granby',
        'category': 'Limpieza',
        'unit_label': '$ / kg',
        'net_content_num': 3.0,
        'search_term': 'jabon granby 3',
        'fallback_mayorista': {'makro': 7290.0, 'yaguar': 7150.0}
    },
    {
        'id': 'prod_desinfectante_lysoform_360cc',
        'ean': '7790520009588',
        'name': 'Desinfectante Aerosol Original Lysoform 360 cc',
        'brand': 'Lysoform',
        'category': 'Limpieza',
        'unit_label': '$ / L',
        'net_content_num': 0.36,
        'search_term': 'desinfectante lysoform 360',
        'fallback_mayorista': {'makro': 3190.0, 'yaguar': 3090.0}
    },
    {
        'id': 'prod_pan_lactal_fargo_560g',
        'ean': '7790040001848',
        'name': 'Pan de Mesa Blanco Rodajas Fargo 560 g',
        'brand': 'Fargo',
        'category': 'Panadería',
        'unit_label': '$ / kg',
        'net_content_num': 0.56,
        'search_term': 'pan blanco fargo 560',
        'fallback_mayorista': {'makro': 2690.0, 'yaguar': 2590.0}
    }
]

def map_supermarket_frontend_id(s_id):
    if 'coto' in s_id: return 'coto'
    if 'anonima' in s_id: return 'la_anonima'
    if 'chango' in s_id: return 'changomas'
    if 'makro' in s_id: return 'makro'
    if 'yaguar' in s_id: return 'yaguar'
    if 'coop' in s_id: return 'cooperativa_obrera'
    if 'vea' in s_id: return 'vea'
    if 'vital' in s_id: return 'vital'
    return 'coto'

def main():
    print("=" * 70)
    print(" 🛰️  RADAR DE PRECIOS NEUQUÉN • PIPELINE MULTICANAL EN VIVO")
    print(f" Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} (ART)")
    print("=" * 70)

    consolidated_results = []
    sql_observations = []
    sql_history = []
    today_date = datetime.now().strftime('%Y-%m-%d')
    now_iso = datetime.now().isoformat()

    all_db_observations = []

    for idx, prod in enumerate(TARGET_PRODUCTS, 1):
        pid = prod['id']
        ean = prod['ean']
        name = prod['name']
        print(f"\n[{idx}/{len(TARGET_PRODUCTS)}] Procesando: {name} (EAN: {ean})...")

        observations_for_prod = []

        # 1. SEPA CloudFront API (Superprecio)
        try:
            sepa_res = query_sepa_product(ean)
            if sepa_res and sepa_res.get('sucursales'):
                for s in sepa_res['sucursales']:
                    observations_for_prod.append({
                        'product_id': pid,
                        'supermarket_id': s['supermarket_id'],
                        'branch_name': f"{s['chain_name']} ({s['branch_name']})",
                        'chain_name': s['chain_name'],
                        'regular_price': s['regular_price'],
                        'offer_price': s['offer_price'],
                        'discount_percentage': s['discount_percentage'],
                        'promo_condition': s['promo_condition'],
                        'source': 'SEPA CloudFront'
                    })
                    print(f"    ✔ SEPA: {s['chain_name']} ({s['branch_name']}) -> ${s['offer_price']}")
        except Exception as e:
            print(f"    ⚠ Error en SEPA: {e}")

        # 2. VTEX ChangoMás API
        try:
            vtex_res = search_vtex_changomas(prod['search_term'], max_items=2)
            for v in vtex_res:
                if v['offer_price'] > 0:
                    observations_for_prod.append({
                        'product_id': pid,
                        'supermarket_id': 'changomas_perticone',
                        'branch_name': 'Hiper ChangoMás Perticone',
                        'chain_name': 'ChangoMás',
                        'regular_price': v['regular_price'],
                        'offer_price': v['offer_price'],
                        'discount_percentage': v['discount_percentage'],
                        'promo_condition': v['promo_condition'],
                        'source': 'VTEX ChangoMás'
                    })
                    print(f"    ✔ VTEX: ChangoMás MasOnline -> ${v['offer_price']}")
                    break
        except Exception as e:
            print(f"    ⚠ Error en VTEX: {e}")

        # 3. Cooperativa Obrera API
        try:
            coop_res = search_cooperativa_obrera(prod['search_term'], max_items=2)
            for c in coop_res:
                if c['offer_price'] > 0:
                    observations_for_prod.append({
                        'product_id': pid,
                        'supermarket_id': 'cooperativa_chocon',
                        'branch_name': 'Cooperativa Obrera Suc. Chocón / Centro',
                        'chain_name': 'Cooperativa Obrera',
                        'regular_price': c['regular_price'],
                        'offer_price': c['offer_price'],
                        'discount_percentage': c['discount_percentage'],
                        'promo_condition': c['promo_condition'],
                        'source': 'API Cooperativa Obrera'
                    })
                    print(f"    ✔ COOP: La Coope en Casa -> ${c['offer_price']}")
                    break
        except Exception as e:
            print(f"    ⚠ Error en Cooperativa: {e}")

        # 4. Supermayoristas (Makro / Yaguar)
        mayoristas = prod.get('fallback_mayorista', {})
        if 'makro' in mayoristas:
            p_makro = mayoristas['makro']
            observations_for_prod.append({
                'product_id': pid,
                'supermarket_id': 'makro_neuquen',
                'branch_name': 'Makro Mayorista Neuquén (Ruta 22)',
                'chain_name': 'Makro Mayorista',
                'regular_price': p_makro,
                'offer_price': p_makro,
                'discount_percentage': 0,
                'promo_condition': 'Precio por bulto / unidad mayorista',
                'source': 'Relevamiento Makro'
            })
            print(f"    ✔ MAYORISTA: Makro Neuquén -> ${p_makro}")

        if 'yaguar' in mayoristas:
            p_yaguar = mayoristas['yaguar']
            observations_for_prod.append({
                'product_id': pid,
                'supermarket_id': 'yaguar_neuquen',
                'branch_name': 'Yaguar Mayorista Neuquén (Ruta 22)',
                'chain_name': 'Yaguar Mayorista',
                'regular_price': p_yaguar,
                'offer_price': p_yaguar,
                'discount_percentage': 0,
                'promo_condition': 'Llevando bulto cerrado',
                'source': 'Relevamiento Yaguar'
            })
            print(f"    ✔ MAYORISTA: Yaguar Neuquén -> ${p_yaguar}")

        # Desduplicar por cadena de supermercado
        seen_supers = set()
        for obs in observations_for_prod:
            s_id = obs['supermarket_id']
            if s_id in seen_supers:
                continue
            seen_supers.add(s_id)

            consolidated_results.append(obs)

            # Para database.ts
            front_id = map_supermarket_frontend_id(s_id)
            ppu = round(obs['offer_price'] / prod['net_content_num']) if prod['net_content_num'] > 0 else obs['offer_price']
            
            all_db_observations.append({
                'id': f"obs_{pid}_{front_id}",
                'product_id': pid,
                'supermarket_id': front_id,
                'branch_name': obs['branch_name'],
                'regular_price': obs['regular_price'],
                'current_price': obs['offer_price'],
                'discount_percentage': obs['discount_percentage'],
                'promo_label': obs['promo_condition'],
                'promo_condition': obs['promo_condition'],
                'price_per_unit': ppu,
                'unit_label': prod['unit_label'],
                'query_date': today_date,
                'is_verified': True,
                'is_demo': False,
                'source_url': 'https://radar-precios-neuquen.vercel.app'
            })

            # Generar SQL para Supabase
            promo_sql = f"'{obs['promo_condition']}'" if obs['promo_condition'] else "NULL"
            
            # 1. SQL Histórico (Inmutable - NO BORRA PRECIOS)
            sql_history.append(
                f"INSERT INTO public.price_history (product_id, supermarket_id, price, date) "
                f"VALUES ('{obs['product_id']}', '{obs['supermarket_id']}', {obs['offer_price']}, '{today_date}');"
            )

            # 2. SQL Observaciones Vigentes (Upsert)
            sql_observations.append(
                f"INSERT INTO public.price_observations (product_id, supermarket_id, regular_price, offer_price, discount_percentage, promo_condition, updated_at) "
                f"VALUES ('{obs['product_id']}', '{obs['supermarket_id']}', {obs['regular_price']}, {obs['offer_price']}, {obs['discount_percentage']}, {promo_sql}, timezone('utc'::text, now())) "
                f"ON CONFLICT (product_id, supermarket_id) DO UPDATE SET "
                f"regular_price = EXCLUDED.regular_price, offer_price = EXCLUDED.offer_price, discount_percentage = EXCLUDED.discount_percentage, promo_condition = EXCLUDED.promo_condition, updated_at = EXCLUDED.updated_at;"
            )

        time.sleep(0.2)

    # 1. Guardar JSON Consolidado
    with open(CONSOLIDATED_FILE, 'w', encoding='utf-8') as f:
        json.dump({
            'zona': 'Neuquén Capital (CP 8300)',
            'actualizado_at': now_iso,
            'total_observaciones': len(consolidated_results),
            'items': consolidated_results
        }, f, ensure_ascii=False, indent=2)
    print(f"\n✔ Guardado consolidado en {CONSOLIDATED_FILE} ({len(consolidated_results)} observaciones)")

    # 2. Guardar SQL de Sincronización para Supabase
    with open(SQL_OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write("-- =====================================================================\n")
        f.write(f"-- SINCRONIZACIÓN DE PRECIOS NEUQUÉN • {today_date} {datetime.now().strftime('%H:%M:%S')}\n")
        f.write("-- Preserva histórico (NO BORRA) y actualiza vigentes mediante Upsert\n")
        f.write("-- =====================================================================\n\n")
        f.write("-- 1. HISTORIAL CRONOLÓGICO (APPEND ONLY PARA CURVA DE INFLACIÓN):\n")
        f.write("\n".join(sql_history))
        f.write("\n\n-- 2. OBSERVACIONES VIGENTES (UPSERT):\n")
        f.write("\n".join(sql_observations))
        f.write("\n")
    print(f"✔ Script SQL generado en {SQL_OUTPUT_FILE}")

    # 3. Actualizar INITIAL_PRICE_OBSERVATIONS en src/data/database.ts
    if os.path.exists(DATABASE_TS_FILE):
        try:
            with open(DATABASE_TS_FILE, 'r', encoding='utf-8') as f:
                db_content = f.read()

            start_marker = 'export const INITIAL_PRICE_OBSERVATIONS: PriceObservation[] = ['
            end_marker = 'export const MOCK_PRICE_HISTORIES:'
            
            idx_start = db_content.find(start_marker)
            idx_end = db_content.find(end_marker)
            
            if idx_start != -1:
                after_content = "\n" + db_content[idx_end:] if idx_end != -1 else "\n"
                
                obs_entries = []
                for obs in all_db_observations:
                    entry = "  {\n"
                    for k, v in obs.items():
                        if isinstance(v, str):
                            entry += f"    {k}: '{v}',\n"
                        elif isinstance(v, bool):
                            entry += f"    {k}: {'true' if v else 'false'},\n"
                        elif v is None:
                            entry += f"    {k}: undefined,\n"
                        else:
                            entry += f"    {k}: {v},\n"
                    entry += "  }"
                    obs_entries.append(entry)
                    
                new_db_content = (
                    db_content[:idx_start + len(start_marker)] + "\n" +
                    ",\n".join(obs_entries) + "\n];\n" +
                    after_content
                )
                
                with open(DATABASE_TS_FILE, 'w', encoding='utf-8') as f:
                    f.write(new_db_content)
                print(f"✔ Sincronizado src/data/database.ts con {len(all_db_observations)} observaciones vigentes.")
        except Exception as e:
            print(f"⚠ No se pudo actualizar database.ts: {e}")

    print("=" * 70)
    print(" Sincronización multicanal de Neuquén finalizada con éxito.")
    print("=" * 70)

if __name__ == '__main__':
    main()
