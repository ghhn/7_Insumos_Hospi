import pandas as pd

file_path = r'd:\00_OFI_PRESUPUESTOS_progra\7_Insumos_rado\PROGRAMA.xlsx'
df = pd.read_excel(file_path, sheet_name='ACU_Compara', header=1) # Usar la fila 1 como cabecera (indice 1 en pd.read_excel header=1 significa fila 1, que es la segunda fila)

print("Columnas:", list(df.columns))
print(df[['Item', 'Partida', 'Código', 'Descripción', 'Unid.', 'Cantidad', 'Metrado', 'adquirido']].head(10).to_string())
