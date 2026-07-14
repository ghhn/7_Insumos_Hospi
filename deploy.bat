@echo off
REM Script de despliegue para Hostinger (Windows)
REM Uso: deploy.bat

setlocal enabledelayedexpansion

echo.
echo 🚀 Iniciando despliegue para Hostinger...
echo.

REM 1. Validar que estamos en el directorio correcto
if not exist "package.json" (
    echo ❌ Error: package.json no encontrado. Ejecuta este script desde la raiz del proyecto.
    exit /b 1
)

REM 2. Verificar Node.js y npm
echo 📦 Verificando herramientas...
call node --version
call npm --version
echo.

REM 3. Instalar dependencias
echo 📥 Instalando dependencias...
call npm install
if errorlevel 1 (
    echo ❌ Error instalando dependencias
    exit /b 1
)
echo ✓ Dependencias instaladas
echo.

REM 4. Ejecutar build
echo 🔨 Compilando aplicacion...
call npm run build
if errorlevel 1 (
    echo ❌ Error compilando
    exit /b 1
)
echo ✓ Build completado
echo.

REM 5. Listar archivos generados
echo 📁 Estructura de salida:
if exist ".next" (
    dir .next /s /b | findstr /c:".next" | head -20
) else (
    echo (Build sin .next)
)
echo.

REM 6. Validar que .env existe
if not exist ".env" (
    echo ⚠️  Advertencia: Archivo .env no encontrado
    echo    Copia .env.example a .env y configura tus variables de entorno
    echo.
)

echo ✅ Despliegue local completado
echo.
echo 📋 Próximos pasos:
echo    1. Confirma que todas las variables de entorno están configuradas en .env
echo    2. Sube los archivos a Hostinger via Git o FTP
echo    3. Ejecuta 'npm start' en el servidor
echo    4. Verifica que la app esté accesible en tu dominio
echo.
echo 📖 Lee HOSTINGER_DEPLOYMENT.md para más detalles
echo.
