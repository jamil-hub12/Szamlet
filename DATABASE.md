# Esquema de Base de Datos

## Visión General

El sistema utiliza **PostgreSQL** a través de **Supabase** con las siguientes tablas principales:

## Diagrama de Relaciones

```
empleados (1) ──< (N) pedidos
clientes (1) ──< (N) pedidos
pedidos (1) ──< (N) pedido_items
pedidos (1) ──< (N) pagos
productos (1) ──< (N) producto_variantes
producto_variantes (1) ──< (N) producto_colores
pedido_items (N) ──> (1) producto_colores

auditoria (registro de acciones)
notificaciones (sistema de notificaciones)
```

## Tablas

### empleados
Usuarios del sistema con permisos.

```sql
CREATE TABLE empleados (
  codigo TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  celular TEXT,
  rol TEXT NOT NULL CHECK (rol IN ('Administrador', 'Atención al cliente')),
  estado TEXT DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Licencia', 'Inactivo')),
  fecha_contratacion DATE,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices**:
- `email` (UNIQUE)
- `rol`
- `estado`

### clientes
Base de datos de clientes.

```sql
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  email TEXT,
  celular TEXT NOT NULL,
  direccion TEXT,
  dni TEXT NOT NULL,
  ruc TEXT,
  fecha_registro DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices**:
- `codigo` (UNIQUE)
- `dni`
- `email`

### pedidos
Pedidos de clientes.

```sql
CREATE TABLE pedidos (
  codigo TEXT PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  articulo TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Recibido' CHECK (
    estado IN ('Recibido', 'En confección', 'Listo para entrega', 'Entregado', 'Cancelado')
  ),
  fecha DATE NOT NULL,
  urgente BOOLEAN DEFAULT FALSE,
  notas TEXT,
  motivo_cancelacion TEXT,
  estado_anterior_cancelacion TEXT,
  
  -- Información de pago
  monto_total DECIMAL(10,2),
  monto_pagado DECIMAL(10,2) DEFAULT 0,
  estado_pago TEXT GENERATED ALWAYS AS (
    CASE
      WHEN monto_total IS NULL OR monto_total = 0 THEN 'Pendiente'
      WHEN monto_pagado >= monto_total THEN 'Pagado'
      WHEN monto_pagado > 0 AND monto_pagado < monto_total THEN 'Parcial'
      ELSE 'Pendiente'
    END
  ) STORED,
  metodo_pago TEXT,
  referencia_pago TEXT,
  fecha_pago DATE,
  notas_pago TEXT,
  
  fecha_entrega DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices**:
- `cliente_id`
- `estado`
- `fecha`
- `urgente`
- `estado_pago`

**Triggers**:
- Generación automática de código (`PED-XXXX`)
- Actualización de `updated_at`

### pedido_items
Items de cada pedido (productos, tallas, colores).

```sql
CREATE TABLE pedido_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_codigo TEXT NOT NULL REFERENCES pedidos(codigo) ON DELETE CASCADE,
  producto_codigo TEXT NOT NULL,
  modelo TEXT NOT NULL,
  tela TEXT NOT NULL,
  disenio TEXT NOT NULL,
  talla TEXT NOT NULL,
  color TEXT NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10,2),
  subtotal DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices**:
- `pedido_codigo`
- `producto_codigo`

### productos
Catálogo de productos.

```sql
CREATE TABLE productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT UNIQUE NOT NULL,
  modelo TEXT NOT NULL,
  tela TEXT NOT NULL,
  disenio TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices**:
- `codigo` (UNIQUE)

### producto_variantes
Variantes de productos por talla.

```sql
CREATE TABLE producto_variantes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  talla TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(producto_id, talla)
);
```

**Índices**:
- `producto_id`
- `(producto_id, talla)` (UNIQUE)

### producto_colores
Colores y stock por variante.

```sql
CREATE TABLE producto_colores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variante_id UUID NOT NULL REFERENCES producto_variantes(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(variante_id, color)
);
```

**Índices**:
- `variante_id`
- `(variante_id, color)` (UNIQUE)
- `stock`

### pagos
Registro de pagos.

```sql
CREATE TABLE pagos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_codigo TEXT NOT NULL REFERENCES pedidos(codigo),
  monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
  metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('Efectivo', 'QR/Transferencia')),
  referencia TEXT,
  fecha_pago TIMESTAMPTZ NOT NULL,
  usuario_codigo TEXT NOT NULL,
  usuario_nombre TEXT NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices**:
- `pedido_codigo`
- `fecha_pago`
- `usuario_codigo`
- `metodo_pago`

### auditoria
Log de auditoría del sistema.

```sql
CREATE TABLE auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_codigo TEXT NOT NULL,
  usuario_nombre TEXT NOT NULL,
  accion TEXT NOT NULL CHECK (
    accion IN ('crear', 'editar', 'eliminar', 'cambiar_estado', 'cancelar', 'reactivar')
  ),
  modulo TEXT NOT NULL CHECK (
    modulo IN ('pedidos', 'clientes', 'productos', 'empleados', 'pagos')
  ),
  entidad_id TEXT NOT NULL,
  entidad_nombre TEXT NOT NULL,
  detalles JSONB,
  fecha_hora TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices**:
- `usuario_codigo`
- `accion`
- `modulo`
- `fecha_hora`
- `entidad_id`

### notificaciones
Sistema de notificaciones persistentes.

```sql
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo TEXT NOT NULL CHECK (tipo IN ('exito', 'error', 'info', 'advertencia')),
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  pedido_codigo TEXT,
  estado_anterior TEXT,
  estado_nuevo TEXT,
  email_enviado BOOLEAN,
  leida BOOLEAN DEFAULT FALSE,
  usuario_codigo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices**:
- `usuario_codigo`
- `leida`
- `created_at` (DESC)
- `pedido_codigo`

## Triggers y Funciones

### Generación de Códigos

```sql
-- Función para generar código de pedido
CREATE OR REPLACE FUNCTION generar_codigo_pedido()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NULL THEN
    NEW.codigo := 'PED-' || LPAD(
      (COALESCE(
        (SELECT MAX(CAST(SUBSTRING(codigo FROM 5) AS INTEGER)) 
         FROM pedidos), 
        0
      ) + 1)::TEXT, 
      4, 
      '0'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generar_codigo_pedido
  BEFORE INSERT ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION generar_codigo_pedido();
```

### Actualización Automática de Timestamps

```sql
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas con updated_at
CREATE TRIGGER trigger_actualizar_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_updated_at();
```

### Trigger para Estado de Pago

El campo `estado_pago` se calcula automáticamente como columna generada:

```sql
estado_pago TEXT GENERATED ALWAYS AS (
  CASE
    WHEN monto_total IS NULL OR monto_total = 0 THEN 'Pendiente'
    WHEN monto_pagado >= monto_total THEN 'Pagado'
    WHEN monto_pagado > 0 AND monto_pagado < monto_total THEN 'Parcial'
    ELSE 'Pendiente'
  END
) STORED
```

### Trigger para Actualizar Monto Pagado

```sql
CREATE OR REPLACE FUNCTION actualizar_monto_pagado()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pedidos
  SET monto_pagado = (
    SELECT COALESCE(SUM(monto), 0)
    FROM pagos
    WHERE pedido_codigo = NEW.pedido_codigo
  )
  WHERE codigo = NEW.pedido_codigo;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_monto_pagado
  AFTER INSERT ON pagos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_monto_pagado();
```

## Row Level Security (RLS)

Se recomienda configurar RLS para seguridad adicional:

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
-- ... etc

-- Políticas de ejemplo (ajustar según necesidades)
CREATE POLICY empleados_select_policy ON empleados
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY pedidos_select_policy ON pedidos
  FOR SELECT USING (auth.uid() IS NOT NULL);
```

## Consultas Útiles

### Pedidos con información completa

```sql
SELECT 
  p.*,
  c.nombre as cliente_nombre,
  c.email as cliente_email,
  c.celular as cliente_celular,
  COUNT(pi.id) as cantidad_items
FROM pedidos p
JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN pedido_items pi ON p.codigo = pi.pedido_codigo
GROUP BY p.codigo, c.nombre, c.email, c.celular
ORDER BY p.created_at DESC;
```

### Ingresos por período

```sql
SELECT 
  DATE_TRUNC('month', fecha_pago) as mes,
  metodo_pago,
  COUNT(*) as cantidad_pagos,
  SUM(monto) as total_ingresos
FROM pagos
WHERE fecha_pago >= '2026-01-01'
GROUP BY DATE_TRUNC('month', fecha_pago), metodo_pago
ORDER BY mes DESC, metodo_pago;
```

### Stock bajo

```sql
SELECT 
  p.modelo,
  p.tela,
  p.disenio,
  pv.talla,
  pc.color,
  pc.stock
FROM producto_colores pc
JOIN producto_variantes pv ON pc.variante_id = pv.id
JOIN productos p ON pv.producto_id = p.id
WHERE pc.stock < 10
ORDER BY pc.stock ASC;
```

### Auditoría por usuario

```sql
SELECT 
  fecha_hora,
  accion,
  modulo,
  entidad_nombre,
  detalles
FROM auditoria
WHERE usuario_codigo = 'EMP-0001'
ORDER BY fecha_hora DESC
LIMIT 50;
```

## Migraciones

Los scripts SQL para crear/actualizar el esquema están en `/database/`:

1. `notificaciones-persistentes.sql` - Crear tabla de notificaciones
2. `agregar-reactivacion-pedidos.sql` - Agregar columna para reactivación
3. `configurar-timezone-peru.sql` - Configurar zona horaria

## Backup y Restauración

Se recomienda configurar backups automáticos en Supabase:
- Backups diarios
- Retención de 30 días
- Exports periódicos a almacenamiento externo

---

**Nota**: Este esquema es específico para el sistema de gestión de taller de confección y puede requerir ajustes según las necesidades específicas del negocio.
