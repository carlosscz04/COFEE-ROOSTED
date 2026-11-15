// Datos semilla del restaurante. Usado por scripts/setupDb.js
export const sucursales = [
  { nombre: 'Orígenes Centro Histórico', direccion: '4a Calle Poniente, San Salvador' },
  { nombre: 'Orígenes Escalón', direccion: 'Paseo General Escalón, San Salvador' },
];

// [nombre, unidad, costo_promedio, stock_minimo, stock_inicial]
export const insumos = [
  ['Café de especialidad', 'g', 0.025, 1000, 5000],
  ['Leche entera', 'ml', 0.0012, 5000, 20000],
  ['Vaso 16oz', 'unidad', 0.08, 50, 400],
  ['Vaso 12oz', 'unidad', 0.06, 50, 400],
  ['Vaso 4oz', 'unidad', 0.04, 30, 200],
  ['Tapadera', 'unidad', 0.03, 100, 800],
  ['Viñeta', 'unidad', 0.01, 100, 800],
  ['Azúcar', 'g', 0.002, 500, 4000],
  ['Chocolate en polvo', 'g', 0.01, 500, 3000],
  ['Té chai concentrado', 'ml', 0.008, 1000, 5000],
  ['Masa de maíz', 'g', 0.003, 3000, 20000],
  ['Queso blando', 'g', 0.009, 1500, 8000],
  ['Frijoles molidos', 'g', 0.003, 1000, 6000],
  ['Chicharrón', 'g', 0.012, 1000, 6000],
  ['Pan francés', 'unidad', 0.15, 20, 120],
  ['Pollo desmenuzado', 'g', 0.007, 1500, 8000],
  ['Salsa criolla', 'ml', 0.002, 500, 3000],
  ['Yuca', 'g', 0.002, 2000, 12000],
  ['Jamón', 'g', 0.012, 800, 4000],
  ['Pan ciabatta', 'unidad', 0.35, 15, 80],
  ['Masa de elote', 'g', 0.004, 1500, 8000],
  ['Agua embotellada 600ml', 'unidad', 0.35, 24, 150],
  ['Barra de granola', 'unidad', 0.9, 12, 60],
  ['Bolsa de café Orígenes 340g', 'unidad', 5.5, 6, 30],
  ['Galleta de avena empacada', 'unidad', 0.75, 12, 60],
];

// [nombre, categoria, tipo, precio (IVA incluido), emoji, receta [[insumo, cantidad]...]]
export const productos = [
  ['Latte Grande 16oz', 'Bebidas calientes', 'elaborado', 3.5, '☕', [['Café de especialidad', 18], ['Leche entera', 250], ['Vaso 16oz', 1], ['Tapadera', 1], ['Viñeta', 1]]],
  ['Latte Mediano 12oz', 'Bebidas calientes', 'elaborado', 3.0, '☕', [['Café de especialidad', 14], ['Leche entera', 200], ['Vaso 12oz', 1], ['Tapadera', 1], ['Viñeta', 1]]],
  ['Espresso', 'Bebidas calientes', 'elaborado', 1.75, '☕', [['Café de especialidad', 9], ['Vaso 4oz', 1], ['Viñeta', 1]]],
  ['Capuchino 12oz', 'Bebidas calientes', 'elaborado', 3.25, '☕', [['Café de especialidad', 18], ['Leche entera', 150], ['Vaso 12oz', 1], ['Tapadera', 1], ['Viñeta', 1]]],
  ['Café Americano 12oz', 'Bebidas calientes', 'elaborado', 2.25, '☕', [['Café de especialidad', 18], ['Vaso 12oz', 1], ['Tapadera', 1], ['Viñeta', 1]]],
  ['Chocolate Caliente', 'Bebidas calientes', 'elaborado', 3.0, '🍫', [['Chocolate en polvo', 30], ['Leche entera', 250], ['Azúcar', 10], ['Vaso 12oz', 1], ['Tapadera', 1], ['Viñeta', 1]]],
  ['Chai Latte 16oz', 'Bebidas calientes', 'elaborado', 3.5, '🫖', [['Té chai concentrado', 60], ['Leche entera', 200], ['Vaso 16oz', 1], ['Tapadera', 1], ['Viñeta', 1]]],
  ['Pupusa de Queso', 'Comida salvadoreña', 'elaborado', 1.25, '🫓', [['Masa de maíz', 90], ['Queso blando', 40]]],
  ['Pupusa Revuelta', 'Comida salvadoreña', 'elaborado', 1.5, '🫓', [['Masa de maíz', 90], ['Queso blando', 30], ['Frijoles molidos', 30], ['Chicharrón', 30]]],
  ['Pan con Pollo', 'Comida salvadoreña', 'elaborado', 4.5, '🥖', [['Pan francés', 1], ['Pollo desmenuzado', 120], ['Salsa criolla', 30]]],
  ['Yuca Frita con Chicharrón', 'Comida salvadoreña', 'elaborado', 4.0, '🍟', [['Yuca', 200], ['Chicharrón', 80], ['Salsa criolla', 40]]],
  ['Sándwich de Jamón y Queso', 'Sándwiches', 'elaborado', 3.75, '🥪', [['Pan ciabatta', 1], ['Jamón', 60], ['Queso blando', 40]]],
  ['Tamal de Elote', 'Comida salvadoreña', 'elaborado', 1.5, '🌽', [['Masa de elote', 120], ['Queso blando', 15]]],
  ['Agua Embotellada 600ml', 'Reventa', 'reventa', 1.0, '💧', [['Agua embotellada 600ml', 1]]],
  ['Barra de Granola', 'Reventa', 'reventa', 1.75, '🍫', [['Barra de granola', 1]]],
  ['Bolsa de Café Orígenes 340g', 'Reventa', 'reventa', 9.5, '🛍️', [['Bolsa de café Orígenes 340g', 1]]],
  ['Galleta de Avena', 'Reventa', 'reventa', 1.5, '🍪', [['Galleta de avena empacada', 1]]],
];

export const proveedores = [
  ['Café Cuscatlán S.A. de C.V.', '0614-010190-101-2', '2222-1010', 'ventas@cafecuscatlan.sv', 30],
  ['Lácteos La Vaquita', '0614-150385-102-5', '2260-4545', 'pedidos@lavaquita.sv', 15],
  ['Distribuidora El Buen Envase', '0614-200780-103-8', '2270-7788', 'info@buenenvase.sv', 0],
  ['Insumos Gastronómicos SV', '0614-050992-104-1', '2288-3030', 'comercial@insumossv.sv', 30],
];

// [nombre, dui, nit, cargo, sucursal(1|2), salario_mensual]
export const empleados = [
  ['María Fernanda López', '04567891-2', '0614-120590-101-3', 'gerente', 1, 1200],
  ['Carlos Alberto Ramírez', '03214567-8', '0614-230488-102-4', 'gerente', 2, 1100],
  ['Ana Lucía Martínez', '05123456-7', '0614-010995-103-5', 'barista', 1, 450],
  ['José Roberto Hernández', '02987654-3', '0614-150793-104-6', 'barista', 1, 480],
  ['Karla Beatriz Flores', '04456123-9', '0614-081096-105-7', 'barista', 2, 460],
  ['Luis Enrique Pineda', '03789012-5', '0614-300891-106-8', 'cajero', 1, 420],
  ['Daniela Sofía Cruz', '05234871-0', '0614-171197-107-9', 'cajero', 2, 410],
  ['Mauricio Antonio Rivas', '01876543-6', '0614-220689-108-0', 'barista', 2, 1050],
];

// [nombre, email, password, rol, sucursal]
export const usuarios = [
  ['Administrador General', 'admin@origenes.sv', 'admin123', 'admin', 1],
  ['María Fernanda López', 'gerente@origenes.sv', 'gerente123', 'gerente', 1],
  ['Luis Pineda (Caja Centro)', 'cajero1@origenes.sv', 'cajero123', 'cajero', 1],
  ['Daniela Cruz (Caja Escalón)', 'cajero2@origenes.sv', 'cajero123', 'cajero', 2],
];
