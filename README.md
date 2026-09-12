# Troit — App de fidelización

Prototipo funcional: web app (PWA) que funciona en iPhone, Android y PC desde el navegador, instalable como app.

## Qué incluye

- **Clientes**: se registran, ven el menú, arman su pedido, ganan puntos por cada compra y los canjean por cupones.
- **Checkout**: el cliente elige entre envío a domicilio o retiro en el local. Para envío, fija su ubicación tocando el mapa, arrastrando el marcador o con el botón "Usar mi ubicación" (GPS del celular); la dirección se autocompleta sola. Para retiro, ve la ubicación del local en el mapa. Junto con el método de pago (efectivo o transferencia), al confirmar se abre WhatsApp con el pedido ya redactado (productos, total, dirección o "retiro en el local", y el enlace a la ubicación) listo para enviar al restaurante.
- **Admin**: cuenta con rol de administrador para crear/editar/desactivar productos y cupones, y ver y actualizar el estado de los pedidos.

## Estructura

```
restaurant-loyalty/
├── server/   API (Node + Express + Postgres en Supabase)
└── client/   App web (React + Vite, instalable como PWA)
```

## Cómo correrlo

### 1. Backend

```bash
cd server
npm install
npm start
```

Corre en `http://localhost:4000`. Las tablas y los datos de ejemplo (productos, cupones y un usuario admin) se crean solos en Postgres la primera vez que arranca.

**Necesitás un proyecto de [Supabase](https://supabase.com) (gratis)** para la base de datos y el almacenamiento de imágenes. En `server/.env` (o `server/.env.example` como referencia):
- `DATABASE_URL`: en tu proyecto de Supabase, botón **Connect → Direct connection** (usá **Session pooler** si tu servidor sale a internet por IPv4, que es lo normal) y copiá la cadena, reemplazando `[YOUR-PASSWORD]` por la contraseña de la base que elegiste al crear el proyecto.
- `SUPABASE_URL` y `SUPABASE_SERVICE_KEY`: en **Settings → API Keys** de tu proyecto. Usá la **secret key** (nunca la publishable/anon en el backend).
- `WHATSAPP_NUMBER`: el número de WhatsApp del restaurante en formato internacional sin `+` ni espacios (ej. `5491122334455`).
- `POINTS_PER_UNIT`: cuántos dólares hay que gastar para ganar 1 punto (por defecto, 1 punto por cada $1 — los precios del local son en USD).
- `JWT_SECRET`: cámbialo por un valor secreto propio antes de publicar la app.
- `RESTAURANT_NAME`, `RESTAURANT_ADDRESS`, `RESTAURANT_LAT`, `RESTAURANT_LNG`: la ubicación real de tu local — se usa para mostrar el mapa de "Retiro en el local". Busca tus coordenadas abriendo tu local en [Google Maps](https://maps.google.com), haciendo clic derecho sobre el punto exacto y copiando los dos números que aparecen arriba del menú (latitud, longitud).

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Corre en `http://localhost:5173`. En desarrollo, las llamadas a `/api` se redirigen automáticamente al backend (ver `vite.config.js`).

### Cuenta de administrador de prueba

- Email: `admin@restaurante.com`
- Contraseña: `admin123`

Cambia esta contraseña (o el usuario) antes de usar la app en producción.

## Cómo usan la app tus clientes

Al publicar la app (ver más abajo), tus clientes entran desde el navegador de su celular o PC. En Chrome/Edge/Safari van a ver la opción "Agregar a pantalla de inicio" / "Instalar app", y les queda como un ícono más, sin pasar por App Store ni Google Play.

## Publicar la app (producción)

Este prototipo corre en tu máquina. Para que tus clientes lo usen desde afuera necesitas:

1. **Alojar el backend** (`server/`) en un servicio como Render, Railway o un VPS. No necesita disco persistente — la base de datos (Postgres) y las imágenes (Supabase Storage) viven afuera, en Supabase.
2. **Base de datos y almacenamiento**: Postgres + Storage en Supabase, plan gratuito. No se pierden datos aunque el servidor se reinicie o se redeploye.
3. **Alojar el frontend** (`client/`, generado con `npm run build` en la carpeta `dist/`) en Vercel, Netlify o el mismo servidor del backend.
4. Configurar la variable de entorno del frontend para apuntar a la URL pública del backend (hoy usa rutas relativas `/api`, pensadas para que ambos convivan bajo el mismo dominio o detrás de un proxy).
5. Usar HTTPS (necesario para que la PWA sea instalable y para que el GPS del mapa funcione en producción).
6. Configurar el login con Google (ver más abajo) con las URLs reales de producción.

## Login con Google

Además de registro directo (email + contraseña), los clientes pueden entrar con su cuenta de Google. Para activarlo:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/) → crea un proyecto (o usa uno existente).
2. Ve a **APIs y servicios → Pantalla de consentimiento de OAuth**: elige "Externo", completa el nombre de la app (ej. "Troit") y tu email de contacto.
3. Ve a **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**. Tipo de aplicación: "Aplicación web".
4. En **"Orígenes de JavaScript autorizados"** agrega la URL donde corre tu frontend (ej. `http://localhost:5173` para probar, y tu dominio real como `https://tudominio.com` cuando publiques).
5. Copia el **Client ID** que te da Google (termina en `.apps.googleusercontent.com`) y pégalo en **dos** lugares:
   - `client/.env` → `VITE_GOOGLE_CLIENT_ID=...`
   - `server/.env` → `GOOGLE_CLIENT_ID=...`
6. Reinicia el frontend y el backend para que tomen la variable nueva.

Si dejas esas variables vacías, el botón de Google simplemente no aparece — el registro directo sigue funcionando igual. Cuando un cliente entra con Google por primera vez, se le crea la cuenta automáticamente (sin contraseña); si ya tenía una cuenta con el mismo email, se la vincula.

## Cómo funciona el envío a WhatsApp

Al confirmar el pedido, la app arma un mensaje con el detalle (productos, dirección, total, método de pago) y abre un enlace `wa.me` con ese texto precargado, apuntando al número configurado en `WHATSAPP_NUMBER`. El cliente solo tiene que apretar "Enviar" en WhatsApp — es gratis y no requiere ninguna cuenta especial. Si más adelante quieres que el pedido llegue automáticamente sin que el cliente presione enviar, hace falta contratar la API de WhatsApp Business (de pago, requiere verificación de negocio).

## Mapa y ubicación

El mapa usa [Leaflet](https://leafletjs.com/) con mapas de [OpenStreetMap](https://www.openstreetmap.org/) — gratis, sin necesidad de API key ni tarjeta de crédito. La dirección se completa automáticamente a partir del punto marcado usando el servicio gratuito de geocodificación de OpenStreetMap (Nominatim). Para uso con mucho volumen de pedidos, conviene revisar la [política de uso](https://operations.osmfoundation.org/policies/nominatim/) de ese servicio o migrar a un proveedor pago (Google Maps, Mapbox) si hace falta.

## Lógica de puntos y cupones

- Cada pedido suma puntos según el total de los productos, sin contar el envío (`POINTS_PER_UNIT` en `server/.env`).
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

Estas reglas viven en `server/src/promoRules.js` (y su espejo en `client/src/promoRules.js`, solo para la vista previa) — si agregás una promo nueva con una mecánica distinta a las de arriba, avisame y le sumamos el tipo de regla correspondiente.

## Costo de envío

Para pedidos a domicilio, la app calcula automáticamente el costo de envío según la distancia en línea recta entre el local (`RESTAURANT_LAT`/`RESTAURANT_LNG`) y el punto que el cliente marcó en el mapa, usando el tarifario de VR-46 Delivery (definido en `server/src/deliveryPricing.js`, con una copia idéntica en `client/src/deliveryPricing.js` solo para mostrar la vista previa antes de confirmar — el monto que se cobra siempre lo calcula el servidor). Si cambia el proveedor de delivery o sus tarifas, actualiza la tabla `TIERS` en ese archivo del servidor (y opcionalmente la del cliente, para que la vista previa coincida). Las "zonas rojas bajo cotización" del tarifario no están automatizadas — para pedidos muy alejados vas a tener que coordinar el precio manualmente por WhatsApp.
