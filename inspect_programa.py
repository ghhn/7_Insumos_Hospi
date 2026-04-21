import pandas as pd
import sys

file_path = r'd:\00_OFI_PRESUPUESTOS_progra\7_Insumos_rado\PROGRAMA.xlsx'
try:
    xls = pd.ExcelFile(file_path)
    print(f"Hojas encontradas: {xls.sheet_names}\n")
    for sheet in xls.sheet_names:
        print(f"--- Hoja: {sheet} ---")
        df = pd.read_excel(xls, sheet_name=sheet)
        print(f"Columnas: {list(df.columns)}")
        print("Primeras 3 filas:")
        print(df.head(3).to_string())
        print("\n")
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
