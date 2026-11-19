DROP SCHEMA public CASCADE; CREATE SCHEMA public;

CREATE TABLE sucursales (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  direccion VARCHAR(200),
  activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin','gerente','cajero')),
  sucursal_id INT REFERENCES sucursales(id),
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE insumos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  unidad VARCHAR(10) NOT NULL,
  costo_promedio NUMERIC(12,4) NOT NULL DEFAULT 0,
  stock_minimo NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE inventario (
  sucursal_id INT NOT NULL REFERENCES sucursales(id),
  insumo_id INT NOT NULL REFERENCES insumos(id),
  stock NUMERIC(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (sucursal_id, insumo_id)
);

CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  categoria VARCHAR(40) NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('elaborado','reventa')),
  precio NUMERIC(10,2) NOT NULL,
  emoji VARCHAR(8) DEFAULT '🍽️',
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE recetas (
  producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  insumo_id INT NOT NULL REFERENCES insumos(id),
  cantidad NUMERIC(12,2) NOT NULL CHECK (cantidad > 0),
  PRIMARY KEY (producto_id, insumo_id)
);

CREATE TABLE correlativos (
  tipo VARCHAR(10) NOT NULL,
  sucursal_id INT NOT NULL REFERENCES sucursales(id),
  serie VARCHAR(10) NOT NULL,
  ultimo INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tipo, sucursal_id)
);

CREATE TABLE turnos_caja (
  id SERIAL PRIMARY KEY,
  sucursal_id INT NOT NULL REFERENCES sucursales(id),
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  apertura TIMESTAMP NOT NULL DEFAULT NOW(),
  monto_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
  cierre TIMESTAMP,
  estado VARCHAR(10) NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto','cerrado')),
  esperado_efectivo NUMERIC(12,2), esperado_tarjeta NUMERIC(12,2), esperado_digital NUMERIC(12,2),
  contado_efectivo NUMERIC(12,2),  contado_tarjeta NUMERIC(12,2),  contado_digital NUMERIC(12,2),
  diferencia NUMERIC(12,2),
  observaciones VARCHAR(250)
);

CREATE TABLE ventas (
  id SERIAL PRIMARY KEY,
  sucursal_id INT NOT NULL REFERENCES sucursales(id),
  turno_id INT NOT NULL REFERENCES turnos_caja(id),
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  tipo_doc VARCHAR(3) NOT NULL CHECK (tipo_doc IN ('FCF','CCF')),
  serie VARCHAR(10) NOT NULL,
  correlativo INT NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT NOW(),
  cliente_nombre VARCHAR(120), cliente_nit VARCHAR(20), cliente_nrc VARCHAR(20), cliente_giro VARCHAR(120),
  subtotal NUMERIC(12,2) NOT NULL,
  iva NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  UNIQUE (tipo_doc, serie, correlativo)
);

CREATE TABLE venta_detalle (
  id SERIAL PRIMARY KEY,
  venta_id INT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id INT NOT NULL REFERENCES productos(id),
  descripcion VARCHAR(100) NOT NULL,
  cantidad INT NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL
);

CREATE TABLE venta_pagos (
  id SERIAL PRIMARY KEY,
  venta_id INT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  metodo VARCHAR(12) NOT NULL CHECK (metodo IN ('efectivo','tarjeta','bitcoin','chivo')),
  monto NUMERIC(12,2) NOT NULL
);

CREATE TABLE proveedores (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  nit VARCHAR(20), telefono VARCHAR(20), email VARCHAR(120),
  dias_credito INT NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE compras (
  id SERIAL PRIMARY KEY,
  sucursal_id INT NOT NULL REFERENCES sucursales(id),
  proveedor_id INT NOT NULL REFERENCES proveedores(id),
  clasificacion VARCHAR(10) NOT NULL CHECK (clasificacion IN ('costo','gasto')),
  concepto VARCHAR(150),
  num_factura VARCHAR(40) NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  condicion VARCHAR(10) NOT NULL CHECK (condicion IN ('contado','credito')),
  subtotal NUMERIC(12,2) NOT NULL, iva NUMERIC(12,2) NOT NULL, total NUMERIC(12,2) NOT NULL,
  usuario_id INT REFERENCES usuarios(id)
);

CREATE TABLE compra_detalle (
  id SERIAL PRIMARY KEY,
  compra_id INT NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  insumo_id INT NOT NULL REFERENCES insumos(id),
  cantidad NUMERIC(12,2) NOT NULL CHECK (cantidad > 0),
  costo_unitario NUMERIC(12,4) NOT NULL
);

CREATE TABLE cuentas_por_pagar (
  id SERIAL PRIMARY KEY,
  compra_id INT NOT NULL UNIQUE REFERENCES compras(id) ON DELETE CASCADE,
  proveedor_id INT NOT NULL REFERENCES proveedores(id),
  monto NUMERIC(12,2) NOT NULL,
  saldo NUMERIC(12,2) NOT NULL,
  vencimiento DATE NOT NULL,
  estado VARCHAR(10) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','pagada'))
);

CREATE TABLE pagos_cxp (
  id SERIAL PRIMARY KEY,
  cxp_id INT NOT NULL REFERENCES cuentas_por_pagar(id) ON DELETE CASCADE,
  monto NUMERIC(12,2) NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE empleados (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  dui VARCHAR(12), nit VARCHAR(20),
  cargo VARCHAR(20) NOT NULL CHECK (cargo IN ('barista','cajero','gerente')),
  sucursal_id INT REFERENCES sucursales(id),
  salario_mensual NUMERIC(10,2) NOT NULL,
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE planillas (
  id SERIAL PRIMARY KEY,
  anio INT NOT NULL, mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  quincena INT NOT NULL CHECK (quincena IN (1,2)),
  generada TIMESTAMP NOT NULL DEFAULT NOW(),
  total_neto NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE (anio, mes, quincena)
);

CREATE TABLE planilla_detalle (
  id SERIAL PRIMARY KEY,
  planilla_id INT NOT NULL REFERENCES planillas(id) ON DELETE CASCADE,
  empleado_id INT NOT NULL REFERENCES empleados(id),
  salario_bruto NUMERIC(10,2) NOT NULL,
  isss NUMERIC(10,2) NOT NULL, afp NUMERIC(10,2) NOT NULL, renta NUMERIC(10,2) NOT NULL,
  neto NUMERIC(10,2) NOT NULL,
  isss_patronal NUMERIC(10,2) NOT NULL, afp_patronal NUMERIC(10,2) NOT NULL
);
