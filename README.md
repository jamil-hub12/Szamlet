# Taller Szamlet — Sistema de Gestión

Sistema web para la gestión de pedidos, clientes, pagos e inventario de un taller de confección textil en Gamarra, Lima.

## Tecnologías

- **React 18** + TypeScript + Vite
- **Tailwind CSS v4**
- **Supabase** (PostgreSQL + Auth + Realtime)
- **EmailJS** — notificaciones automáticas por correo
- **React Context API** — gestión de estado global
- **React Router v7**

## Instalación

### 1. Clonar e instalar dependencias

```bash
git clone <repository-url>
cd <project-directory>
pnpm install
```

### 2. Variables de entorno

Crea un archivo `.env` en la raíz:

```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key

VITE_EMAILJS_SERVICE_ID=tu_service_id
VITE_EMAILJS_TEMPLATE_ID=tu_template_id
VITE_EMAILJS_PUBLIC_KEY=tu_public_key
```

### 3. Iniciar

```bash
pnpm dev
```

Disponible en `http://localhost:5173`

## Roles

| Rol                     | Acceso                                                                     |
| ----------------------- | -------------------------------------------------------------------------- |
| **Administrador**       | Acceso completo: pedidos, clientes, empleados, productos, pagos, auditoría |
| **Atención al Cliente** | Pedidos, clientes y pagos                                                  |

## Módulos

- **Pedidos** — ciclo de vida completo: Recibido → En confección → Listo para entrega → Entregado
- **Clientes** — registro, búsqueda e historial
- **Pagos** — Efectivo y QR/Transferencia, estados Pendiente / Parcial / Pagado
- **Inventario** — stock automático por talla y color
- **Auditoría** — trazabilidad de todas las acciones
- **Notificaciones** — emails automáticos al cambiar el estado de un pedido

## Notas

- El sistema usa zona horaria Perú (UTC-5)
- El tiempo real requiere habilitar replicación en Supabase Dashboard → Database → Replication
- Pedidos cancelados antes de ejecutar el script de reactivación no podrán ser reactivados
