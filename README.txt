# Control de Operarios — Panel web

Panel web para gestionar el personal, los pagos (nóminas, adelantos, extras) y los
cobros de contado de tus operarios. Es la **primera pieza** del proyecto completo;
la base de datos ya incluye las tablas de **fichajes** y **vacaciones**, preparadas
para cuando construyamos la app nativa de operarios (fase 2).

## Qué incluye

- **Backend**: Node.js + Express + SQLite (base de datos en un solo archivo,
  sin necesidad de instalar un servidor de base de datos aparte).
- **Frontend**: panel de administración (HTML/CSS/JS, sin frameworks, para que
  cualquier persona pueda mantenerlo).
- **API REST** con autenticación (JWT), lista para ser consumida más adelante
  por la app de operarios.

## Funcionalidades de esta fase

1. **Operarios**: alta, edición, baja (el histórico de pagos nunca se borra),
   búsqueda y ficha con código único (OP0001, OP0002…).
2. **Pagos**: registrar nóminas, adelantos, extras u otros pagos; marcarlos como
   pagados o anularlos; filtrar por operario, estado o concepto.
3. **Cobros de contado**: registrar el dinero en efectivo que cobra un operario
   a un cliente, y marcarlo como entregado a caja/empresa.
4. **Resumen (dashboard)**: operarios activos, total pendiente de pago, total
   pagado este mes, cobros sin entregar y próximos pagos.

## Instalación (en tu ordenador o servidor)

Necesitas tener instalado [Node.js](https://nodejs.org) (versión 18 o superior).

```bash
# 1. Entra en la carpeta del proyecto
cd operarios-app

# 2. Instala las dependencias
npm install

# 3. Copia el archivo de configuración y edítalo
cp .env.example .env
```

Abre `.env` con un editor de texto y cambia estos valores:

```
JWT_SECRET=pon-aqui-una-frase-larga-y-aleatoria-que-nadie-adivine
ADMIN_EMAIL=tu-email@tuempresa.com
ADMIN_PASSWORD=una-contraseña-segura
ADMIN_NOMBRE=Tu nombre
```

```bash
# 4. Crea el usuario administrador (solo la primera vez)
npm run seed

# 5. Arranca el panel
npm start
```

Abre el navegador en **http://localhost:3000** e inicia sesión con el email y
la contraseña que pusiste en `.env`.

> Puedes cambiar la contraseña desde la propia sesión llamando al endpoint
> `POST /api/auth/cambiar-password`, o simplemente editando `.env` y volviendo
> a ejecutar `npm run seed` con un email nuevo.

## Añadir más usuarios (personas que pueden entrar al panel)

`npm run seed` solo crea **un** usuario (el de `.env`), pensado para el primer
arranque. Para añadir más personas que puedan iniciar sesión, usa el script
`crear-usuario.js` desde la terminal, dentro de la carpeta del proyecto:

```bash
node crear-usuario.js email@ejemplo.com contraseña "Nombre completo"
```

Ejemplo real:

```bash
node crear-usuario.js maria@tuempresa.com Clave1234! "María López"
```

Esto crea un usuario nuevo en la tabla `usuarios` de la base de datos. A partir
de ese momento, esa persona puede entrar en el panel con ese email y esa
contraseña, exactamente igual que el usuario administrador.

> Todavía no hay una pantalla dentro del panel para hacer esto con un clic;
> por ahora se hace desde la terminal con este script. Si quieres, en el
> futuro puedo añadir una sección "Usuarios" dentro del propio panel web para
> no tener que usar la terminal.

## Poner el panel accesible desde internet (para tu equipo)

Para que tú y otras personas de administración accedáis desde cualquier sitio,
necesitas subir esta carpeta a un servidor. Opciones sencillas y económicas:

- **Railway** o **Render**: conectas tu repositorio de GitHub y despliegan la
  app automáticamente (soportan Node.js y disco persistente para el archivo
  SQLite).
- **Un VPS propio** (por ejemplo DigitalOcean, Hetzner): subes la carpeta,
  instalas Node.js, ejecutas `npm install && npm run seed && npm start`, y
  usas algo como `pm2` para mantenerlo siempre encendido, con Nginx delante
  para HTTPS.

Si quieres, en el siguiente paso te ayudo a preparar el despliegue concreto
en la plataforma que elijas.

## Estructura del proyecto

```
operarios-app/
├── server.js           → arranque del servidor
├── db.js                → conexión y esquema de la base de datos
├── seed.js               → crea el usuario administrador inicial
├── middleware/auth.js     → protección de rutas con JWT
├── routes/
│   ├── auth.js            → login, sesión, cambio de contraseña
│   ├── operarios.js       → alta, edición, baja, ficha
│   ├── pagos.js           → registrar, pagar, anular
│   ├── cobros.js          → registrar cobros de contado, marcar entregado
│   └── dashboard.js        → resumen para la pantalla principal
├── public/                → todo el panel web (frontend)
└── data/operarios.db      → base de datos (se crea sola al arrancar)
```

## Próxima fase: la app de operarios (Play Store)

La base de datos ya tiene las tablas `fichajes` y `vacaciones` listas. Los
siguientes pasos, cuando quieras continuar, serán:

1. Añadir a esta misma API los endpoints que la app necesitará (fichar
   entrada/salida, solicitar vacaciones, ver el estado de sus pagos y cobros).
2. Construir la app nativa Android (y opcionalmente iOS) que se conecta a esta
   misma API — cada operario iniciará sesión con su propio usuario.
3. Publicarla en Google Play, lo que requiere una cuenta de Google Play
   Console (pago único de 25 $) a tu nombre o el de tu empresa.

Dime cuándo quieres retomarlo y seguimos con esa fase.
