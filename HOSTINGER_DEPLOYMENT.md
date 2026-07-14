# 🚀 Guía de Despliegue en Hostinger

## Requisitos Previos

- Cuenta activa en Hostinger con plan que soporte Node.js
- Acceso al panel de control de Hostinger (cPanel o similar)
- Git configurado en el servidor o acceso FTP
- Base de datos PostgreSQL (Supabase) accesible desde Hostinger

## 1. Preparación Local (Completada ✓)

El proyecto ya está configurado con:
- ✓ Next.js 16.2.4 con salida estática optimizada
- ✓ Variables de entorno en `.env.example`
- ✓ Build optimizado para hosting compartido
- ✓ TypeScript sin errores de compilación

## 2. Build Final Antes de Desplegar

```bash
npm install
npm run build
```

**Salida esperada:** 
- Carpeta `.next/` con código compilado
- Carpeta `public/` con assets estáticos
- Archivo `package.json` con dependencias

## 3. Variables de Entorno en Hostinger

Accede al panel de Hostinger y configura las siguientes variables de entorno:

```
DB_USER=postgres.ndcqypwtkiayagkykdrx
DB_PASSWORD=sr03mrywXGDz1X8Q
DB_HOST=aws-1-us-west-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
NODE_ENV=production
```

**Ubicación típica:**
- cPanel → Node.js Selector → Variables de Entorno
- O en el archivo `.env` del servidor

## 4. Método de Despliegue Recomendado

### Opción A: Git (Recomendado)

1. **Clonar el repositorio en el servidor:**
```bash
cd /home/cuenta/public_html
git clone https://github.com/ghhn/7_Insumos_Hospi.git .
```

2. **Instalar dependencias:**
```bash
npm install --production
```

3. **Ejecutar build:**
```bash
npm run build
```

4. **Iniciar aplicación:**
```bash
npm start
```

### Opción B: FTP

1. Descarga el proyecto localmente: `git clone https://github.com/ghhn/7_Insumos_Hospi.git`
2. Ejecuta `npm install` y `npm run build`
3. Sube via FTP:
   - Carpeta `.next/` (el build compilado)
   - Carpeta `public/`
   - Carpeta `src/` (si necesaria)
   - Archivos: `package.json`, `next.config.ts`, `tsconfig.json`
4. En el servidor ejecuta: `npm install --production`

## 5. Configuración del Servidor Node.js

En el panel de Hostinger (Node.js Selector):

- **Versión Node.js:** 18.x o superior (recomendado 20.x)
- **Versión npm:** 10.x
- **Puerto:** Usualmente 3000 (el servidor lo redirige automáticamente)
- **Comando de Inicio:** `npm start`
- **Directorio de la App:** `/home/cuenta/public_html` (o donde clonaste el repo)

## 6. Configuración del Proxy Inverso (cPanel)

Si usas cPanel con WHM, configura el proxy inverso:

```
Dominio: tudominio.com
Puerto Local: 3000
Protocolo: HTTP
```

Esto asegura que el tráfico HTTPS del dominio se redirija correctamente a tu aplicación Node.js.

## 7. Verificación del Despliegue

**Endpoint de prueba de base de datos:**
```
https://tudominio.com/api/test-db
```

Debería mostrar:
```json
{
  "connected": true,
  "DB_USER": "postgres.ndcqypwtkiayagkykdrx",
  "DB_HOST": "aws-1-us-west-1.pooler.supabase.com",
  "DB_PORT": "6543",
  "DB_NAME": "postgres",
  "PASSWORD_SET": true
}
```

## 8. Monitoreo y Logs

**Ver logs en tiempo real:**
```bash
# Si tienes acceso SSH
tail -f /home/cuenta/logs/nodejs.log
```

**Reiniciar la aplicación:**
- Panel de Hostinger → Node.js Selector → Reiniciar

## 9. Solución de Problemas

### Error: "Cannot find module"
```bash
npm install --production
npm run build
```

### Error: "Port already in use"
- Reinicia la aplicación desde el panel
- Verifica que el puerto 3000 esté disponible

### Error: "Database connection refused"
- Verifica las credenciales en `.env`
- Asegúrate que Supabase permite conexiones desde la IP de Hostinger
- En Supabase: Database Settings → Network → Agregar IP permitida

### Error: "EACCES permission denied"
- Verifica permisos en la carpeta del proyecto
- Ejecuta: `chmod -R 755 /home/cuenta/public_html`

## 10. Estructura de Archivos en Hostinger

```
/home/cuenta/public_html/
├── .next/                  (output de build)
├── node_modules/
├── public/                 (assets estáticos)
├── src/                    (código fuente)
├── .env                    (variables de entorno - NO versionear)
├── .env.example            (template)
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

## 11. Actualizar el Repositorio en Producción

Para actualizar cambios nuevos:

```bash
git pull origin main
npm install
npm run build
# Reinicia desde el panel de Hostinger
```

## 12. Seguridad

- ✓ Las credenciales se configuran en variables de entorno (no en el código)
- ✓ `.env` NO debe estar en el repositorio (usa `.env.example`)
- ✓ Las APIs de Hostinger están protegidas por autenticación
- ✓ SSL/TLS se configura automáticamente en Hostinger

## Contacto y Soporte

Si tienes problemas:
1. Revisa los logs del Node.js en el panel
2. Verifica la conectividad a Supabase
3. Confirma que las variables de entorno están configuradas correctamente
