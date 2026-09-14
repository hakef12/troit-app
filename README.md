# Troit — App de fidelización

Prototipo funcional: web app (PWA) que funciona en iPhone, Android y PC desde el navegador, instalable como app.

## Qué incluye

- **Clientes**: se registran, ven el menú, arman su pedido, ganan puntos por cada compra y los canjean por cupones.
- **Checkout**: el cliente elige entre envío a domicilio o retiro en el local. Para envío, fija su ubicación tocando el mapa, arrastrando el marcador o con el botón "Usar mi ubicación" (GPS del celular); la dirección se autocompleta sola. Para retiro, ve la ubicación del local en el mapa. Junto con el método de pago (efectivo o transferencia), al confirmar se abre WhatsApp con el pedido ya redactado (productos, total, dirección o "retiro en el local", y el enlace a la ubicación) listo para enviar al restaurante.
- **Admin**: cuenta con rol de administrador para crear/editar/desactivar productos y cupones, y ver y actualizar el estado de los pedidos.

## Estructura

```
restaurant-loyalty/
└── client/
    ├── api/    Backend (Node + Express) como funciones serverless de Vercel
    └── src/    App web (React + Vite, instalable como PWA)
```

Frontend y backend viven en el mismo proyecto de Vercel: `client/` es la raíz del proyecto, `client/api/` se despliega como funciones serverless y el resto (`client/src/`) se compila como sitio estático. No hay ningún servidor separado que mantener — Vercel aloja ambos, y Supabase (Postgres + Storage) es la única pieza externa.

## Cómo correrlo

### 1. Backend (funciones serverless, en local)

```bash
cd client
npm install
npm run dev:api
```

Corre en `http://localhost:4000` usando `api/_dev-server.js` (el mismo código Express que corre en Vercel, solo que con `app.listen()` para desarrollo local). Las tablas y los datos de ejemplo (productos, cupones y un usuario admin) se crean solos en Postgres la primera vez que arranca.

**Necesitás un proyecto de [Supabase](https://supabase.com) (gratis)** para la base de datos y el almacenamiento de imágenes. En `client/.env` (o `client/.env.example` como referencia):
- `DATABASE_URL`: en tu proyecto de Supabase, botón **Connect → Session pooler** (compatible con IPv4, que es lo normal) y copiá la cadena, reemplazando `[YOUR-PASSWORD]` por la contraseña de la base que elegiste al crear el proyecto.
- `SUPABASE_URL` y `SUPABASE_SERVICE_KEY`: en **Settings → API Keys** de tu proyecto. Usá la **secret key** (nunca la publishable/anon en el backend).
- `WHATSAPP_NUMBER`: el número de WhatsApp del restaurante en formato internacional sin `+` ni espacios (ej. `5491122334455`).
- `POINTS_PER_UNIT`: cuántos dólares hay que gastar para ganar 1 punto (por defecto, 1 punto por cada $1 — los precios del local son en USD).
- `JWT_SECRET`: cámbialo por un valor secreto propio antes de publicar la app.
- `RESTAURANT_NAME`, `RESTAURANT_ADDRESS`, `RESTAURANT_LAT`, `RESTAURANT_LNG`: la ubicación real de tu local — se usa para mostrar el mapa de "Retiro en el local". Busca tus coordenadas abriendo tu local en [Google Maps](https://maps.google.com), haciendo clic derecho sobre el punto exacto y copiando los dos números que aparecen arriba del menú (latitud, longitud).

En producción (Vercel), estas mismas variables se configuran desde el dashboard del proyecto (**Settings → Environment Variables**), no desde `client/.env` (ese archivo nunca se sube al repo).

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Corre en `http://localhost:5173`. En desarrollo, las llamadas a `/api` se redirigen automáticamente al backend local (ver `vite.config.js`).

### Cuenta de administrador de prueba

- Email: `admin@restaurante.com`
- Contraseña: `admin123`

Cambia esta contraseña (o el usuario) antes de usar la app en producción.

## Cómo usan la app tus clientes

Al publicar la app (ver más abajo), tus clientes entran desde el navegador de su celular o PC. En Chrome/Edge/Safari van a ver la opción "Agregar a pantalla de inicio" / "Instalar app", y les queda como un ícono más, sin pasar por App Store ni Google Play.

## Publicar la app (producción)

Todo el proyecto (frontend + backend) se despliega como un único proyecto de [Vercel](https://vercel.com), con "Root Directory" apuntando a `client/`:

1. **Conectar el repo de GitHub a Vercel** (o hacer `vercel deploy` desde `client/`). Vercel detecta automáticamente que es un proyecto Vite y compila `client/src` a estático; `client/api/index.js` se despliega como función serverless, con el `vercel.json` de la raíz de `client/` enrutando todo `/api/*` hacia ella (ver nota más abajo sobre por qué el rewrite es explícito).
2. **Base de datos y almacenamiento**: Postgres + Storage en Supabase, plan gratuito. No se pierden datos aunque el proyecto se re-despliegue — usá el modo **Session pooler** de Supabase para el `DATABASE_URL` (compatible con conexiones IPv4, que es como sale Vercel).
3. **Configurar las variables de entorno** en el dashboard de Vercel (**Settings → Environment Variables**): las mismas que en `client/.env.example` (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `WHATSAPP_NUMBER`, `POINTS_PER_UNIT`, `RESTAURANT_*`, `GOOGLE_CLIENT_ID`, `ORS_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`), más `VITE_GOOGLE_CLIENT_ID` para el frontend.
4. HTTPS viene gratis con Vercel (necesario para que la PWA sea instalable y para que el GPS del mapa funcione en producción).
5. Configurar el login con Google (ver más abajo) con la URL real de producción.

No hace falta ningún otro servicio de hosting — antes el backend corría en Render por separado, pero se migró a funciones serverless de Vercel para no depender de un segundo proveedor ni de los tiempos de arranque en frío de un plan gratuito de servidor siempre-activo.

**Nota sobre el rewrite de `/api/*`**: aunque Vercel soporta funciones "catch-all" por convención de nombre de archivo (`api/[...path].js`), en la práctica solo enrutó bien las rutas de un segmento (`/api/health`) y devolvía 404 en rutas de dos o más segmentos (`/api/auth/login`, `/api/orders/mine`). Por eso la función se llama `api/index.js` y `client/vercel.json` define el rewrite explícito `/api/:path*` → `/api/index`, que es el patrón más confiable para correr Express completo como una sola función en Vercel.

## Login con Google

Además de registro directo (email + contraseña), los clientes pueden entrar con su cuenta de Google. Para activarlo:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/) → crea un proyecto (o usa uno existente).
2. Ve a **APIs y servicios → Pantalla de consentimiento de OAuth**: elige "Externo", completa el nombre de la app (ej. "Troit") y tu email de contacto.
3. Ve a **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**. Tipo de aplicación: "Aplicación web".
4. En **"Orígenes de JavaScript autorizados"** agrega la URL donde corre tu frontend (ej. `http://localhost:5173` para probar, y tu dominio real como `https://tudominio.com` cuando publiques).
5. Copia el **Client ID** que te da Google (termina en `.apps.googleusercontent.com`) y pégalo en **dos** lugares:
   - `client/.env` → `VITE_GOOGLE_CLIENT_ID=...` y `GOOGLE_CLIENT_ID=...` (las dos van en el mismo archivo ahora)
6. Reinicia el frontend y el backend para que tomen la variable nueva.

Si dejas esas variables vacías, el botón de Google simplemente no aparece — el registro directo sigue funcionando igual. Cuando un cliente entra con Google por primera vez, se le crea la cuenta automáticamente (sin contraseña); si ya tenía una cuenta con el mismo email, se la vincula.

## Cómo funciona el envío a WhatsApp

Al confirmar el pedido, la app arma un mensaje con el detalle (productos, dirección, total, método de pago) y abre un enlace `wa.me` con ese texto precargado, apuntando al número configurado en `WHATSAPP_NUMBER`. El cliente solo tiene que apretar "Enviar" en WhatsApp — es gratis y no requiere ninguna cuenta especial. Si más adelante quieres que el pedido llegue automáticamente sin que el cliente presione enviar, hace falta contratar la API de WhatsApp Business (de pago, requiere verificación de negocio).

## Mapa y ubicación

El mapa usa [Leaflet](https://leafletjs.com/) con mapas de [OpenStreetMap](https://www.openstreetmap.org/) — gratis, sin necesidad de API key ni tarjeta de crédito. La dirección se completa automáticamente a partir del punto marcado usando el servicio gratuito de geocodificación de OpenStreetMap (Nominatim). Para uso con mucho volumen de pedidos, conviene revisar la [política de uso](https://operations.osmfoundation.org/policies/nominatim/) de ese servicio o migrar a un proveedor pago (Google Maps, Mapbox) si hace falta.

## Lógica de puntos y cupones

- Cada pedido suma puntos según el total de los productos, sin contar el envío (`POINTS_PER_UNIT` en `client/.env`).
- **Si cancelas un pedido desde el panel de admin, los puntos que había otorgado se descuentan automáticamente** (y el cupón que haya usado vuelve a quedar disponible). Si te equivocaste y lo reviertes a otro estado, los puntos y el cupón se restauran. Así el cliente nunca pierde puntos por un pedido normal (se le dan apenas confirma en la app), pero un pedido falso o no pagado que termines cancelando no le deja puntos de regalo.
- Los cupones se canjean con puntos desde la sección "Cupones"; quedan disponibles para aplicarse como descuento en el próximo pedido desde el checkout.
- **Un cupón canjeado se marca como usado apenas se aplica a un pedido, y no se puede volver a usar** — el servidor lo valida siempre (`used = 0` en la base), así que aunque alguien manipule la app desde el navegador no puede reutilizar el mismo canje dos veces. Para volver a tener ese descuento disponible, el cliente tiene que canjearlo de nuevo gastando puntos otra vez — cada canje es una "ficha" de un solo uso.
- Los precios y descuentos siempre se recalculan en el servidor a partir de la base de datos — la app nunca confía en los precios que manda el navegador.

## Promos del día — cómo se reflejan sus condiciones

Cada promo tiene un título, una imagen (el flyer) y una condición/descripción (ej. "Válido solo para la Detroit Hot Chicken"). Esa condición **siempre se muestra como una franja debajo del flyer** en el menú, sin importar si la imagen ya la menciona o no — así el cliente siempre ve las reglas con claridad, aunque el diseño de la imagen no las incluya.

**El descuento de la promo del día se aplica solo, automáticamente**, si el carrito cumple la condición — el cliente no tiene que hacer nada especial ni pedirlo por WhatsApp. El servidor mira el día de hoy (nunca confía en la fecha del navegador) y calcula el descuento según la regla de esa promo:

- **Lunes** (2 Reinas por $11.99) y **Miércoles** (2 Hot Chicken por $13.99): se descuenta automáticamente cada vez que el carrito tiene 2 (o 4, o 6...) unidades de esa pizza puntual.
- **Martes** (2da pizza al 50%): junta todas las pizzas individuales del carrito y aplica 50% de descuento a la más barata de cada par.
- **Jueves** (todas las pizzas a $7.50): cualquier pizza individual que cueste más de $7.50 baja a ese precio, sin importar cuántas pida.

El checkout muestra el descuento en la vista previa del carrito antes de confirmar, y el pedido final (tanto en la pantalla de confirmación como en el mensaje de WhatsApp y el panel de admin) siempre indica qué promo se aplicó y cuánto se descontó. Los puntos ganados se calculan sobre el total ya con el descuento de la promo aplicado.

Estas reglas viven en `client/api/_lib/promoRules.js` (y su espejo en `client/src/promoRules.js`, solo para la vista previa) — si agregás una promo nueva con una mecánica distinta a las de arriba, avisame y le sumamos el tipo de regla correspondiente.

## Costo de envío

Para pedidos a domicilio, la app calcula automáticamente el costo de envío según la **distancia real en carretera** (no en línea recta) entre el local (`RESTAURANT_LAT`/`RESTAURANT_LNG`) y el punto que el cliente marcó en el mapa, usando el tarifario de VR-46 Delivery (definido en `client/api/_lib/deliveryPricing.js`). Las distancias se calculan con [OpenRouteService](https://openrouteservice.org) (plan gratis, hasta 2.000 rutas por día, más que de sobra para un restaurante) — configurá tu propia clave en `ORS_API_KEY`. Si esa clave no está configurada, o el servicio falla por cualquier motivo, la app cae automáticamente a la distancia en línea recta como resguardo, para que un pedido nunca se rompa.

La vista previa del checkout (antes de confirmar) le pide esa misma distancia real al servidor a través de `GET /api/delivery-estimate`, así el cliente ve el costo correcto desde el principio — la clave de OpenRouteService nunca llega al navegador. El monto que finalmente se cobra siempre lo recalcula el servidor al confirmar el pedido.

Si cambia el proveedor de delivery o sus tarifas, actualiza la tabla `TIERS` en `client/api/_lib/deliveryPricing.js`. Las "zonas rojas bajo cotización" del tarifario no están automatizadas — para pedidos muy alejados vas a tener que coordinar el precio manualmente por WhatsApp.
