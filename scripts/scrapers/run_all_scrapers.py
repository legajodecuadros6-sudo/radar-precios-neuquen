#!/usr/bin/env python3
"""
Pipeline Centralizador de Scraping - Radar de Precios Neuquén (CP 8300)
Ejecuta los scrapers de minoristas (Coto, La Anónima) y mayoristas (Vital, Makro, Yaguar),
consolida las observaciones en un archivo JSON y genera reporte de auditoría.
"""

import os
import json
from datetime import datetime

SCRAPERS_DIR = '/home/rodrigo/Escritorio/ANTIGRAVITY/radar-precios/scripts/scrapers'
OUTPUT_CONSOLIDATED = os.path.join(SCRAPERS_DIR, 'precios_consolidados_neuquen.json')
RAW_YAGUAR_MAKRO = '/home/rodrigo/.gemini/antigravity/brain/6b5d2c54-1a43-4358-a723-d129207f8449/scratch/precios_relevados_neuquen.json'

def load_json_if_exists(filepath):
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return None
    return None

def main():
    print("=" * 65)
    print(" 🛰️  RADAR DE PRECIOS NEUQUÉN • PIPELINE DE SCRAPING CONSOLIDADO")
    print(f" Fecha de ejecución: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 65)

    consolidated = {
        'zona': 'Neuquén capital - CP 8300',
        'fecha_consolidacion': datetime.now().isoformat(),
        'fuentes': []
    }

    # 1. Cargar datos existentes de Makro y Yaguar
    if os.path.exists(RAW_YAGUAR_MAKRO):
        print(" -> Ingestando datos relevados de Makro y Yaguar...")
        yaguar_makro = load_json_if_exists(RAW_YAGUAR_MAKRO)
        if yaguar_makro and 'fuentes' in yaguar_makro:
            consolidated['fuentes'].extend(yaguar_makro['fuentes'])
            for src in yaguar_makro['fuentes']:
                print(f"    ✔ {src['supermercado']}: {len(src.get('items', []))} productos")

    # 2. Cargar Coto Digital
    coto_file = os.path.join(SCRAPERS_DIR, 'coto_scraped.json')
    if os.path.exists(coto_file):
        coto_data = load_json_if_exists(coto_file)
        if coto_data:
            print(f"    ✔ Coto Digital: {len(coto_data)} registros procesados")
            consolidated['fuentes'].append({
                'supermercado': 'Coto',
                'tipo': 'Minorista / Coto Digital',
                'items': coto_data
            })

    # 3. Cargar La Anónima
    la_file = os.path.join(SCRAPERS_DIR, 'la_anonima_scraped.json')
    if os.path.exists(la_file):
        la_data = load_json_if_exists(la_file)
        if la_data:
            print(f"    ✔ La Anónima: {len(la_data)} registros procesados")
            consolidated['fuentes'].append({
                'supermercado': 'La Anónima',
                'tipo': 'Minorista / Tienda Online',
                'items': la_data
            })

    # 4. Cargar Vital
    vital_file = os.path.join(SCRAPERS_DIR, 'vital_scraped.json')
    if os.path.exists(vital_file):
        vital_data = load_json_if_exists(vital_file)
        if vital_data:
            print(f"    ✔ Supermayorista Vital: catálogos y ofertas procesadas")
            consolidated['fuentes'].append({
                'supermercado': 'Vital',
                'tipo': 'Mayorista',
                'data': vital_data
            })

    # Guardar consolidado
    with open(OUTPUT_CONSOLIDATED, 'w', encoding='utf-8') as f:
        json.dump(consolidated, f, ensure_ascii=False, indent=2)

    print("=" * 65)
    print(f" ✔ Archivo consolidado generado exitosamente en:")
    print(f"   {OUTPUT_CONSOLIDATED}")
    print("=" * 65)

if __name__ == '__main__':
    main()
