# ☕ Orígenes SV · Sistema ERP + POS

Sistema integral de **Planificación de Recursos Empresariales (ERP)** y **Punto de Venta (POS)** diseñado para restaurantes y cafeterías de especialidad con operación multi-sucursal en El Salvador.

> **Proyecto de Cátedra · Programación Web (Ciclo 02, 2026)**

---

## 🏗️ Arquitectura y Puertos del Sistema

El sistema opera bajo una arquitectura cliente-servidor desacoplada en tres capas:

| Capa | Tecnología | Puerto | Función Principal |
| :--- | :--- | :---: | :--- |
| **Frontend (SPA)** | React 18 + Vite + Reactstrap + Bootstrap 5 | `5173` | Interfaz gráfica responsiva, enrutamiento dinámico por rol y proxy inverso (`/api` -> `:4000`). |
| **Backend (API REST)** | Node.js (ES Modules) + Express | `4000` | Lógica de negocio, autenticación JWT, transacciones ACID, autocarga de rutas y cálculos fiscales. |
| **Base de Datos** | PostgreSQL 14+ | `5432` | Modelo relacional de 19 tablas con integridad referencial, bloqueos de fila (`FOR UPDATE`) y tipos exactos. |

### Estructura del Proyecto

```text
origenes-sv/
├── database/
│   └── schema.sql            # Esquema relacional completo (19 tablas, llaves, CHECK, UNIQUE)
├── backend/
│   ├── scripts/
│   │   ├── seedData.js       # Datos iniciales (sucursales, 25 insumos, 17 productos, usuarios)
│   │   └── setupDb.js        # Automatización: crea BD, aplica esquema y carga semillas
│   ├── src/
│   │   ├── middleware/       # Autenticación JWT, control de roles y manejo central de errores
│   │   ├── routes/           # Endpoints REST autocargados dinámicamente (/api/<modulo>)
│   │   ├── services/         # Lógica financiera: facturación/IVA, cuadre de caja y nómina SV
│   │   ├── utils/            # Helpers HTTP, redondeo financiero y control multi-sucursal
│   │   ├── db.js             # Pool de conexiones PostgreSQL y wrapper transaccional withTx()
│   │   └── server.js         # Servidor Express y cargador dinámico de rutas
│   └── .env.example          # Plantilla de variables de entorno
└── frontend/
    ├── src/
    │   ├── auth/             # Contexto global de sesión (AuthContext) y pantalla Login
    │   ├── components/       # Layout responsivo, impresión de tickets y selectores
    │   ├── pages/            # Módulos del sistema autodescubiertos por rol
    │   └── utils/            # Cliente HTTP fetch con interceptor JWT y formateadores
    └── vite.config.js        # Configuración del servidor y proxy hacia el backend
```

---

## 🚀 Guía de Instalación y Ejecución

### Requisitos Previos
* **Node.js** v18 o superior
* **PostgreSQL** v14 o superior activo en el puerto `5432`
* **Git**

### 1. Configurar el Backend y Base de Datos
Abre una terminal en la raíz del repositorio y ejecuta:

```bash
cd backend
npm install
```

Crea el archivo de variables de entorno copiando la plantilla y coloca tu contraseña de PostgreSQL en `DB_PASSWORD`:

```bash
# En Windows (CMD):
copy .env.example .env

# En Mac / Linux / Git Bash:
cp .env.example .env
```

Ejecuta el script de inicialización para crear la base de datos `origenes_sv`, construir las 19 tablas y cargar los datos de prueba:

```bash
npm run db:setup
```
> *Nota: Puedes volver a ejecutar `npm run db:setup` en cualquier momento para restablecer la base de datos a su estado inicial.*

Inicia el servidor API (mantén esta terminal abierta):

```bash
npm start
# O en modo desarrollo con recarga automática: npm run dev
```
*Salida esperada:* `API Orígenes SV en http://localhost:4000`

### 2. Configurar e Iniciar el Frontend
Abre una **segunda terminal** en la raíz del proyecto:

```bash
cd frontend
npm install
npm run dev
```
Abre tu navegador en **`http://localhost:5173`**.

---

## 🔐 Usuarios y Roles de Prueba

El sistema adapta automáticamente el menú lateral y los permisos de API según el rol del usuario:

| Rol | Correo Electrónico | Contraseña | Sucursal | Permisos y Alcance |
| :--- | :--- | :--- | :--- | :--- |
| **Administrador** | `admin@origenes.sv` | `admin123` | Todas (Selector) | Acceso total a los 8 módulos y cambio entre sucursales. |
| **Gerente** | `gerente@origenes.sv` | `gerente123` | Todas (Selector) | Acceso operativo, inventario, recetas, compras, reportes y nómina. |
| **Cajero (Centro)** | `cajero1@origenes.sv` | `cajero123` | Centro Histórico | Restringido a su sucursal: Caja, Punto de Venta y Facturas emitidas. |
| **Cajero (Escalón)** | `cajero2@origenes.sv` | `cajero123` | Paseo Escalón | Restringido a su sucursal: Caja, Punto de Venta y Facturas emitidas. |

---

## 📖 Manual de Uso por Módulo

1. **💵 Caja y Turnos:** Antes de facturar, el cajero debe abrir un turno indicando el fondo inicial. Al finalizar la jornada, realiza el arqueo ingresando lo contado en efectivo, vouchers de tarjeta y pagos digitales (Bitcoin/Chivo Wallet); el sistema calcula al instante si el cuadre es exacto o si existe sobrante/faltante.
2. **🧾 Punto de Venta (POS):** Catálogo filtrable por categorías con cálculo en vivo de venta gravada e **IVA 13%**. Permite emitir **Factura Consumidor Final (FCF)** o **Comprobante de Crédito Fiscal (CCF)** (exigiendo Razón Social, NIT y NRC), soporta **pagos divididos** entre múltiples métodos y calcula el vuelto en efectivo. Cada venta descuenta automáticamente los insumos de la receta en el inventario de esa sucursal.
3. **📄 Facturas Emitidas:** Historial filtrable por rango de fechas, sucursal y tipo de documento (`FCF` / `CCF`), con vista previa e impresión térmica/navegador.
4. **📦 Inventario:** Control de existencias por sucursal con alertas visuales (`Stock bajo`) cuando un insumo alcanza su mínimo, buscador y ajustes por conteo físico. *(Nota: La sucursal Escalón inicia con el insumo "Viñeta" bajo el mínimo para demostrar las alertas).*
5. **🍽️ Menú y Recetas:** Gestión de productos **elaborados** (con múltiples insumos) y de **reventa** (1 insumo unitario). Calcula automáticamente el costo de producción y el margen de ganancia neto sobre el precio sin IVA.
6. **🚚 Compras y Cuentas por Pagar:** Registro de facturas de **Costo** (incrementa stock y recalcula el costo promedio ponderado global del insumo) y **Gasto** (servicios/alquileres). Si la compra es a crédito, genera automáticamente una Cuenta por Pagar con fecha de vencimiento según los días de crédito del proveedor y permite registrar abonos parciales o totales.
7. **👥 Empleados y 🧮 Planilla Quincenal:** Administración de personal y generación automática de nómina quincenal conforme a la normativa salvadoreña: retención de **ISSS (3% con tope quincenal de $500)**, **AFP (7.25%)**, **Impuesto sobre la Renta (ISR)** por tramos legales y cálculo de aportes patronales (**ISSS 7.5%** y **AFP 8.75%**).
8. **📊 Panel General (Dashboard):** Indicadores gerenciales en tiempo real: ventas del día, tickets emitidos, ticket promedio, gráfico de barras de los últimos 7 días, top 5 productos del mes, turnos abiertos, cuentas por pagar vencidas y alertas de inventario.

---

## ⚙️ Reglas de Negocio y Seguridad Técnica

* **Integridad Transaccional (ACID):** Operaciones críticas como ventas, cierre de caja, ingreso de compras y generación de planilla se ejecutan dentro de transacciones PostgreSQL (`BEGIN / COMMIT / ROLLBACK`), garantizando que nunca queden registros a medias.
* **Control de Concurrencia (`FOR UPDATE`):** Al facturar, el sistema bloquea a nivel de fila los registros de inventario y correlativos fiscales para evitar sobreventa de insumos o duplicidad de números de factura en cajas simultáneas.
* **Borrado Lógico:** Los productos desactivados del menú (`activo = FALSE`) dejan de mostrarse en el POS pero conservan intacta la integridad histórica de las facturas emitidas.
* **Seguridad de API:** Todas las rutas protegidas validan tokens JWT (`Bearer`) con expiración de 10 horas y aplican control de acceso basado en roles (`requireRole`).

---

## 🛠️ Solución de Problemas Frecuentes

| Error | Causa Probable | Solución |
| :--- | :--- | :--- |
| `password authentication failed` | La clave en `backend/.env` no coincide con PostgreSQL. | Verifica `DB_PASSWORD` en `backend/.env` y reinicia el servidor. |
| `connect ECONNREFUSED 5432` | El servicio de PostgreSQL está detenido. | Inicia el servicio de PostgreSQL en tu sistema operativo. |
| `No se pudo conectar con el servidor` | El backend no está corriendo en el puerto `4000`. | Ejecuta `npm start` dentro de la carpeta `backend/`. |
| `Port 4000 already in use` | Otro proceso ocupa el puerto `4000`. | Cambia `PORT` en `backend/.env` y el destino del proxy en `frontend/vite.config.js`. |
| `Debes abrir tu turno de caja` | Regla de negocio activa en el POS. | Ve al módulo **Caja y turnos** y abre un turno antes de vender. |
