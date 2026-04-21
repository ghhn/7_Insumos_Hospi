import streamlit as st
from database import get_dataframe

# Configuración de página principal
st.set_page_config(
    page_title="Control de Insumos - Proyecto Rado",
    page_icon="🏗️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Estilos CSS personalizados para apariencia institucional/industrial
st.markdown("""
<style>
    .reportview-container {
        background: #F0F2F6;
    }
    .sidebar .sidebar-content {
        background: #1F3864;
        color: white;
    }
    h1, h2, h3 {
        color: #1F3864;
    }
    .stButton>button {
        background-color: #1F3864;
        color: white;
        border-radius: 4px;
        border: none;
    }
    .stButton>button:hover {
        background-color: #2F5496;
        color: white;
    }
</style>
""", unsafe_allow_html=True)

# Título principal
st.title("🏗️ Sistema de Control y Ajuste de Insumos")
st.markdown("---")

# Barra lateral informativa (Streamlit genera la navegación de páginas automáticamente arriba)
with st.sidebar:
    st.info("💡 **Proyecto**: 7_Insumos_rado\n\n👤 **Usuario**: Equipo Presupuestos OFI")

st.header("📊 Dashboard General")
st.write("Bienvenido al sistema de control. Utiliza el menú de la izquierda para navegar a los módulos.")

# Prueba rápida de conexión
try:
    df_test = get_dataframe("SELECT current_database(), current_user, version();")
    if not df_test.empty:
        st.success("✅ Conexión a la base de datos PostgreSQL exitosa.")
        with st.expander("Ver Info de DB"):
            st.dataframe(df_test)
    else:
        st.warning("⚠️ No se pudo obtener información de la base de datos.")
except Exception as e:
    st.error(f"❌ Error conectando a PostgreSQL: {e}")
