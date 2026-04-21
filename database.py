import os
import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

# Obtener credenciales
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

# Construir la URL de conexión para SQLAlchemy
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def get_engine():
    """Crea y devuelve un engine de SQLAlchemy conectado a la base de datos local."""
    return create_engine(DATABASE_URL)

def get_dataframe(query: str, params: tuple = None) -> pd.DataFrame:
    """Ejecuta una consulta SQL y devuelve un DataFrame de pandas."""
    engine = get_engine()
    try:
        if params:
            # SQLAlchemy requiere parametros nombrados o tuplas con consultas textuales
            # pero pd.read_sql funciona bien pasándole engine y la query string
            return pd.read_sql(query, engine, params=params)
        return pd.read_sql(query, engine)
    except Exception as e:
        print(f"Error al ejecutar la consulta: {e}")
        return pd.DataFrame()

def save_dataframe(df: pd.DataFrame, table_name: str, if_exists: str = "append", index: bool = False):
    """Guarda un DataFrame de pandas directamente en PostgreSQL."""
    engine = get_engine()
    try:
        df.to_sql(table_name, engine, if_exists=if_exists, index=index)
        return True
    except Exception as e:
        print(f"Error al guardar los datos: {e}")
        return False
