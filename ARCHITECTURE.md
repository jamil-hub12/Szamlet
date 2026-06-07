# Arquitectura del Sistema

## Visión General

Este proyecto sigue una arquitectura por capas con separación de responsabilidades, inspirada en principios de Clean Architecture y Domain-Driven Design.

## Estructura de Carpetas

```
src/
├── app/                    # Capa de Aplicación
│   ├── components/         # Componentes React (Presentación)
│   ├── contexts/           # Gestión de estado (Application Services)
│   ├── hooks/              # Hooks personalizados
│   ├── utils/              # Lógica de negocio y casos de uso
│   ├── App.tsx             # Aplicación principal
│   └── routes.ts           # Definición de rutas
├── lib/                    # Capa de Infraestructura
│   └── supabase.ts         # Cliente de base de datos
├── config/                 # Configuración
│   └── emailjs.config.ts   # Configuración de servicios externos
├── utils/                  # Utilidades compartidas
│   └── fechas.ts           # Utilidades de fecha/hora
├── styles/                 # Estilos globales
└── main.tsx                # Punto de entrada
```

## Capas de la Arquitectura

### 1. Presentación (UI Layer)
**Ubicación**: `src/app/components/`

Responsable de la interfaz de usuario y la interacción con el usuario.

**Componentes principales**:
- `LoginPage.tsx`: Autenticación de usuarios
- `EmpleadoDashboard.tsx`: Panel para empleados (Atención al Cliente)
- `AdminDashboard.tsx`: Panel para administradores
- Modales: `*Modal.tsx` - Formularios y diálogos

**Principios**:
- Componentes presentacionales puros
- No contienen lógica de negocio
- Delegan acciones a contexts/hooks
- Optimizados para renderizado

### 2. Aplicación (Application Layer)
**Ubicación**: `src/app/contexts/` y `src/app/utils/`

Coordina el flujo de datos y orquesta los casos de uso.

**Contexts (Estado de Aplicación)**:
- `PedidosContext.tsx`: Gestión del ciclo de vida de pedidos
- `ClientesContext.tsx`: Operaciones con clientes
- `PagosContext.tsx`: Gestión de pagos
- `ProductosContext.tsx`: Inventario y catálogo
- `EmpleadosContext.tsx`: Gestión de usuarios
- `AuditoriaContext.tsx`: Sistema de auditoría
- `NotificacionesContext.tsx`: Sistema de notificaciones

**Casos de Uso** (`src/app/utils/`):
- `pedidosCicloVida.ts`: Reglas del ciclo de vida de pedidos
- `stockManager.ts`: Gestión automática de inventario
- `auditoria.ts`: Registro de acciones del sistema
- `formatoMoneda.ts`: Formateo de moneda peruana

**Responsabilidades**:
- Validación de reglas de negocio
- Orquestación entre servicios
- Manejo de estado global
- Transformación de datos

### 3. Infraestructura (Infrastructure Layer)
**Ubicación**: `src/lib/` y `src/config/`

Implementaciones concretas de servicios externos.

**Servicios**:
- `supabase.ts`: Cliente de PostgreSQL (Supabase)
  - Autenticación
  - CRUD de entidades
  - Subscripciones en tiempo real
- `emailjs.config.ts`: Servicio de emails

**Responsabilidades**:
- Acceso a datos (base de datos)
- Servicios externos (emails, almacenamiento)
- Configuración de conexiones

### 4. Dominio (Domain Layer)
**Ubicación**: Distribuido en `src/app/contexts/` (tipos) y `src/app/utils/`

Define las entidades del negocio y reglas del dominio.

**Entidades principales**:
```typescript
// Pedido
type Pedido = {
  id: string;
  codigo: string;
  clienteId: string;
  articulo: string;
  estado: EstadoPedido;
  items?: PedidoItem[];
  // ... más campos
}

// Cliente
type Cliente = {
  id: string;
  codigo: string;
  nombre: string;
  dni: string;
  // ... más campos
}

// Producto
type ProductoCatalogo = {
  id: string;
  codigo: string;
  modelo: string;
  tallas: TallaProducto[];
  // ... más campos
}
```

**Reglas de Negocio**:
- Estados de pedido: `Recibido → En confección → Listo para entrega → Entregado`
- Validaciones de transiciones de estado
- Gestión automática de stock
- Cálculo de estados de pago

## Flujo de Datos

### Ejemplo: Crear un Pedido

```
Usuario (UI)
    ↓
EmpleadoDashboard.tsx (Presentación)
    ↓ handleSubmit()
PedidosContext.agregarPedido() (Aplicación)
    ↓ Validación de reglas
stockManager.actualizarStock() (Caso de Uso)
    ↓ Descuenta inventario
supabase.from('pedidos').insert() (Infraestructura)
    ↓ Guarda en BD
Supabase PostgreSQL (Base de Datos)
    ↓ Retorna resultado
PedidosContext actualiza estado
    ↓
EmpleadoDashboard re-renderiza (Presentación)
```

## Principios de Diseño

### 1. Separación de Responsabilidades
- Cada capa tiene una responsabilidad clara
- No hay lógica de negocio en componentes UI
- No hay código UI en lógica de negocio

### 2. Inversión de Dependencias
- Las capas superiores no dependen de las inferiores
- Se usan interfaces (tipos TypeScript) para desacoplar
- Los contexts actúan como puertos/adaptadores

### 3. Inmutabilidad
- Estado manejado con React Context
- Updates inmutables (`map`, `filter`, spread operator)
- No se mutan objetos directamente

### 4. Composición sobre Herencia
- Componentes pequeños y reutilizables
- Hooks personalizados para lógica compartida
- Context API para estado compartido

## Patrones Utilizados

### Context Pattern
Gestión de estado global sin prop drilling.

```typescript
const PedidosContext = createContext<PedidosContextType>();

export function PedidosProvider({ children }) {
  const [pedidos, setPedidos] = useState([]);
  
  const agregarPedido = async (data) => {
    // Lógica de creación
  };
  
  return (
    <PedidosContext.Provider value={{ pedidos, agregarPedido }}>
      {children}
    </PedidosContext.Provider>
  );
}

export const usePedidos = () => useContext(PedidosContext);
```

### Repository Pattern (Implícito)
Los contexts actúan como repositorios que abstraen el acceso a datos.

```typescript
// Context actúa como Repository
const fetchPedidos = async () => {
  const { data } = await supabase
    .from('pedidos')
    .select('*');
  return data;
};
```

### Service Layer Pattern
Lógica de negocio encapsulada en servicios reutilizables.

```typescript
// stockManager.ts actúa como Service
export async function actualizarStockPedidoCreado(
  pedidoCodigo: string,
  usuarioCodigo: string,
  usuarioNombre: string
): Promise<StockUpdateResult> {
  // Lógica compleja de actualización de stock
}
```

### Observer Pattern
Subscripciones en tiempo real con Supabase.

```typescript
const subscription = supabase
  .channel('pedidos-changes')
  .on('postgres_changes', { event: '*', table: 'pedidos' }, (payload) => {
    // Actualizar estado local
  })
  .subscribe();
```

## Gestión de Estado

### Estado Global (Contexts)
- Datos compartidos entre múltiples componentes
- Operaciones CRUD en entidades
- Sincronización con Supabase

### Estado Local (useState)
- Estado específico de un componente
- Formularios
- UI temporal (modales, tooltips)

### Estado del Servidor (Supabase)
- Fuente de verdad
- Subscripciones en tiempo real
- Optimistic UI updates

## Manejo de Errores

### Estrategia por Capas

**Infraestructura**: Captura errores de red/BD
```typescript
try {
  const { data, error } = await supabase.from('pedidos').insert(data);
  if (error) throw error;
} catch (err) {
  console.error('Error de infraestructura:', err);
  throw err;
}
```

**Aplicación**: Transforma y maneja errores
```typescript
try {
  await supabase...;
} catch (err) {
  setError('No se pudo crear el pedido');
  return false;
}
```

**Presentación**: Muestra errores al usuario
```typescript
const exito = await agregarPedido(data);
if (!exito) {
  toast.error('Error al crear pedido');
}
```

## Seguridad

### Autenticación
- Supabase Auth
- JWT tokens
- Session management

### Autorización
- Roles: Administrador, Atención al Cliente
- Permisos por módulo
- Validación en contextos

### Auditoría
- Log de todas las acciones
- Registro de usuario y timestamp
- Detalles de cambios (antes/después)

## Performance

### Optimizaciones Implementadas

1. **Lazy Loading**: Componentes cargados bajo demanda
2. **Memoization**: React Context optimizado
3. **Debouncing**: Búsquedas y filtros
4. **Paginación**: Límites en consultas grandes
5. **Índices DB**: Optimización de queries

### Real-time Updates
- Subscripciones selectivas (solo datos necesarios)
- Actualización incremental del estado
- Manejo de reconexiones

## Testing (Recomendado)

Aunque no está implementado, se recomienda:

```
tests/
├── unit/
│   ├── utils/
│   └── hooks/
├── integration/
│   └── contexts/
└── e2e/
    └── flows/
```

## Migraciones y Evolución

### Agregar Nueva Entidad

1. Crear tabla en Supabase
2. Agregar tipos en TypeScript
3. Crear Context para gestión de estado
4. Crear componentes UI
5. Agregar casos de uso si es necesario
6. Integrar con auditoría

### Agregar Nueva Funcionalidad

1. Evaluar impacto en capas
2. Implementar de adentro hacia afuera:
   - Domain (tipos, reglas)
   - Application (context, casos de uso)
   - Infrastructure (si requiere servicios externos)
   - Presentation (UI)

## Mejoras Futuras

### Arquitectura Hexagonal Completa
Reorganizar hacia una estructura más explícita:

```
src/
├── domain/           # Entidades y reglas puras
├── application/      # Casos de uso y servicios
├── infrastructure/   # Repositorios y adaptadores
└── presentation/     # Componentes React
```

### Testing
- Implementar tests unitarios
- Tests de integración
- Tests E2E con Playwright

### Performance
- Code splitting avanzado
- Service Workers
- Cache strategies

### Monitoreo
- Error tracking (Sentry)
- Analytics
- Performance monitoring

---

**Última actualización**: Junio 2026
