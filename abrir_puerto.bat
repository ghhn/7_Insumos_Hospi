@echo off
color 0B
echo.
echo ==============================================
echo   ABRIENDO PUERTO PARA COMPARTIR POR WI-FI
echo ==============================================
echo.

:: Comprobar permisos de administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Tienes permisos de Administrador.
    echo.
    echo Abriendo el puerto 5354 en el Firewall de Windows...
    netsh advfirewall firewall add rule name="Next.js Port 5354" dir=in action=allow protocol=TCP localport=5354
    echo.
    echo [EXITO] El puerto ha sido abierto. Ya pueden conectarse!
    echo.
    pause
) else (
    echo [ATENCION] Se requieren permisos de Administrador.
    echo Aparecera una ventana preguntando si permites cambios, dile que SI.
    echo.
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs"
)
