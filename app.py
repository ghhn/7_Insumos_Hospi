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

# Barra lateral (Sidebar)
with st.sidebar:
    st.header("🏢 Menú Principal")
    st.markdown("---")
    
    # Navegación básica inicial (se ampliará en fases posteriores)
    page = st.radio(
        "Navegación",
        ["Dashboard", "Gestión de Partidas", "Control de Insumos", "Exportar OSCE"]
    )
    
    st.markdown("---")
    st.info("💡 **Proyecto**: 7_Insumos_rado\n\n👤 **Usuario**: Equipo Presupuestos OFI")

# Contenido principal basado en la navegación
if page == "Dashboard":
    st.header("📊 Dashboard General")
    st.write("Bienvenido al sistema de control. Aquí se mostrarán las métricas generales.")
    
    # Prueba rápida de conexión (opcional y oculta en UI final, útil para debug inicial)
    try:
        # Intentar obtener solo un límite para ver si conecta
        df_test = get_dataframe("SELECT current_database(), current_user, version();")
        if not df_test.empty:
            st.success("✅ Conexión a la base de datos PostgreSQL exitosa.")
            with st.expander("Ver Info de DB"):
                st.dataframe(df_test)
        else:
            st.warning("⚠️ No se pudo obtener información de la base de datos.")
    except Exception as e:
        st.error(f"❌ Error conectando a PostgreSQL: {e}")

elif page == "Gestión de Partidas":
    st.header("📋 Gestión de Partidas")
    st.info("Módulo en construcción...")

elif page == "Control de Insumos":
    st.header("⚙️ Ajuste y Control de Insumos")
    st.info("Módulo en construcción... (Aquí aplicaremos los forms colaborativos y motor matemático)")

elif page == "Exportar OSCE":
    st.header("📑 Reportes OSCE")
    st.info("Módulo en construcción... (Aquí integraremos el exportador excel)")
