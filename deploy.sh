#!/bin/bash
# Script de despliegue para Hostinger
# Uso: ./deploy.sh

set -e

echo "🚀 Iniciando despliegue para Hostinger..."
echo ""

# 1. Validar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json no encontrado. Ejecuta este script desde la raíz del proyecto."
    exit 1
fi

# 2. Verificar Node.js y npm
echo "📦 Verificando herramientas..."
node --version
npm --version
echo ""

# 3. Instalar dependencias
echo "📥 Instalando dependencias..."
npm install
echo "✓ Dependencias instaladas"
echo ""

# 4. Ejecutar build
echo "🔨 Compilando aplicación..."
npm run build
echo "✓ Build completado"
echo ""

# 5. Listar archivos generados
echo "📁 Estructura de salida:"
ls -lah .next/ 2>/dev/null | head -20 || echo "(Build sin .next)"
echo ""

# 6. Validar que .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Advertencia: Archivo .env no encontrado"
    echo "   Copia .env.example a .env y configura tus variables de entorno"
    echo ""
fi

echo "✅ Despliegue local completado"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Confirma que todas las variables de entorno están configuradas en .env"
echo "   2. Sube los archivos a Hostinger via Git o FTP"
echo "   3. Ejecuta 'npm start' en el servidor"
echo "   4. Verifica que la app esté accesible en tu dominio"
echo ""
echo "📖 Lee HOSTINGER_DEPLOYMENT.md para más detalles"
