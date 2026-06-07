# Sistema de Gestión de Taller de Confección

Sistema integral para la gestión de pedidos, clientes, pagos, empleados e inventario de un taller de confección textil.

## 🚀 Características

### Gestión de Pedidos

- ✅ Creación y seguimiento de pedidos con ciclo de vida completo
- ✅ Estados: Recibido → En confección → Listo para entrega → Entregado
- ✅ Marcado de pedidos urgentes
- ✅ Cancelación con motivo y opción de reactivación
- ✅ Gestión de stock automática por pedido

### Gestión de Clientes

- ✅ Registro completo de clientes (DNI, RUC, contacto)
- ✅ Historial de pedidos por cliente
- ✅ Búsqueda y filtros avanzados

### Gestión de Pagos

- ✅ Registro de pagos (Efectivo, QR/Transferencia)
- ✅ Estados de pago: Pendiente, Parcial, Pagado
- ✅ Reportes de ingresos por período
- ✅ Exportación de reportes a PDF

### Gestión de Inventario (Productos)

- ✅ Catálogo de productos con tallas y colores
- ✅ Control de stock en tiempo real
- ✅ Actualización automática al crear/cancelar pedidos

### Gestión de Empleados

- ✅ Roles: Administrador y Atención al Cliente
- ✅ Autenticación con Supabase
- ✅ Gestión de permisos por rol

### Sistema de Notificaciones

- ✅ Notificaciones en tiempo real
- ✅ Historial persistente en base de datos
- ✅ Envío de emails automáticos a clientes (EmailJS)

### Auditoría

- ✅ Registro de todas las acciones del sistema
- ✅ Trazabilidad completa (quién, qué, cuándo)
- ✅ Filtros por usuario, módulo y fecha

### Reportes y Exportación

- ✅ Exportación de pedidos, clientes y pagos a PDF
- ✅ Reportes con filtros personalizados
- ✅ Estadísticas y gráficos en panel de administración

## 🛠️ Tecnologías

- **Frontend**: React 18 + TypeScript + Vite
- **Estilos**: Tailwind CSS v4
- **Base de datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Emails**: EmailJS
- **PDF**: jsPDF + jsPDF-AutoTable
- **Notificaciones**: Sonner (Toast)
- **Iconos**: Lucide React
- **Gestión de estado**: React Context API
- **Routing**: React Router v7

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── components/        # Componentes React
│   │   ├── LoginPage.tsx
│   │   ├── EmpleadoDashboard.tsx
│   │   ├── AdminDashboard.tsx
│   │   └── *Modal.tsx     # Modales de la aplicación
│   ├── contexts/          # Context API para gestión de estado
│   │   ├── PedidosContext.tsx
│   │   ├── ClientesContext.tsx
│   │   ├── PagosContext.tsx
│   │   ├── ProductosContext.tsx
│   │   ├── EmpleadosContext.tsx
│   │   ├── AuditoriaContext.tsx
│   │   └── NotificacionesContext.tsx
│   ├── hooks/             # Hooks personalizados
│   │   └── useCurrentUser.ts
│   ├── utils/             # Utilidades y lógica de negocio
│   │   ├── pedidosCicloVida.ts
│   │   ├── stockManager.ts
│   │   ├── auditoria.ts
│   │   └── formatoMoneda.ts
│   ├── App.tsx            # Componente principal
│   └── routes.ts          # Definición de rutas
├── config/                # Configuración
│   └── emailjs.config.ts  # Configuración de EmailJS
├── lib/                   # Librerías y clientes
│   └── supabase.ts        # Cliente de Supabase
├── styles/                # Estilos globales
│   ├── index.css          # Estilos principales
│   ├── theme.css          # Variables de tema
│   └── fonts.css          # Fuentes
├── utils/                 # Utilidades compartidas
│   └── fechas.ts          # Manejo de fechas (UTC-5 Perú)
└── main.tsx               # Punto de entrada

database/                  # Scripts SQL para Supabase
├── notificaciones-persistentes.sql
├── agregar-reactivacion-pedidos.sql
└── configurar-timezone-peru.sql
```

## 🔧 Instalación

### Prerrequisitos

- Node.js 18+ y pnpm
- Cuenta de Supabase
- Cuenta de EmailJS (opcional, para envío de emails)

### Paso 1: Clonar el repositorio

```bash
git clone <repository-url>
cd <project-directory>
```

### Paso 2: Instalar dependencias

```bash
pnpm install
```

### Paso 3: Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Supabase
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key

# EmailJS (opcional)
VITE_EMAILJS_SERVICE_ID=tu_service_id
VITE_EMAILJS_TEMPLATE_ID=tu_template_id
VITE_EMAILJS_PUBLIC_KEY=tu_public_key
```

### Paso 4: Configurar base de datos en Supabase

Ejecuta los scripts SQL en el siguiente orden en el **SQL Editor** de Supabase:

1. Crea las tablas principales (empleados, clientes, pedidos, productos, etc.)
2. Ejecuta `/database/notificaciones-persistentes.sql`
3. Ejecuta `/database/agregar-reactivacion-pedidos.sql`
4. (Opcional) Ejecuta `/database/configurar-timezone-peru.sql`

**Nota**: El esquema completo de las tablas debe incluir:

- `empleados`: Usuarios del sistema
- `clientes`: Base de datos de clientes
- `pedidos`: Pedidos de clientes
- `pedido_items`: Items de cada pedido (productos, tallas, colores)
- `productos`: Catálogo de productos
- `producto_variantes`: Variantes por talla
- `producto_colores`: Colores y stock por variante
- `pagos`: Registro de pagos
- `auditoria`: Log de auditoría
- `notificaciones`: Notificaciones persistentes

### Paso 5: Iniciar el servidor de desarrollo

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:5173`

## 👥 Usuarios del Sistema

### Roles disponibles:

- **Administrador**: Acceso completo a todos los módulos
- **Atención al Cliente**: Gestión de pedidos, clientes y pagos

### Login inicial:

Crea un empleado en Supabase con rol "Administrador" para acceder por primera vez.

## 📊 Módulos Principales

### Panel de Administración

- Dashboard con KPIs y estadísticas
- Gestión de pedidos con filtros avanzados
- Gestión de clientes
- Gestión de empleados y permisos
- Gestión de productos e inventario
- Reportes de pagos con filtros por fecha
- Auditoría completa del sistema

### Panel de Atención al Cliente

- Gestión de pedidos (crear, editar, cambiar estado)
- Gestión de clientes
- Registro de pagos
- Historial de pedidos por cliente
- Notificaciones en tiempo real

## 🌐 Zona Horaria

El sistema está configurado para usar la zona horaria de Perú (UTC-5). Todas las fechas y horas se manejan en esta zona horaria:

- Utilidades en `/src/utils/fechas.ts`
- Funciones: `obtenerFechaPeruHoy()`, `formatearFechaHoraPeru()`, etc.

## 📧 Configuración de Emails

Para habilitar el envío automático de emails a clientes:

1. Crea una cuenta en [EmailJS](https://www.emailjs.com/)
2. Configura un template de email
3. Actualiza `/src/config/emailjs.config.ts` con tus credenciales
4. Los emails se enviarán automáticamente cuando cambie el estado de un pedido

## 🔐 Seguridad

- Autenticación mediante Supabase Auth
- Row Level Security (RLS) en Supabase (configurable)
- Roles y permisos por usuario
- Auditoría completa de acciones

## 📝 Scripts SQL Importantes

### Habilitar tiempo real (opcional)

Para recibir actualizaciones en tiempo real:

```sql
-- En Supabase Dashboard → Database → Replication
-- Habilitar replicación para:
- pedidos
- clientes
- pagos
- productos
- producto_variantes
- producto_colores
- notificaciones
- auditoria
```

## 🤝 Contribución

Este es un proyecto privado para un taller de confección específico. Si deseas contribuir:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y está protegido por derechos de autor.

## 🐛 Problemas Conocidos

- Los pedidos cancelados antes de ejecutar el script de reactivación no podrán ser reactivados
- El tiempo real requiere habilitar replicación en Supabase
- EmailJS requiere configuración manual de credenciales

## 📮 Contacto

Para soporte o consultas sobre el proyecto, contacta al desarrollador.

---

**Desarrollado con ❤️ usando React + TypeScript + Supabase**
