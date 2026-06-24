import { createClient } from "@supabase/supabase-js";

type RequestLike = {
  method?: string;
  body?: unknown;
};

type ResponseLike = {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => void;
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const body =
    typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  const { email, password } = body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email y password son obligatorios" });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: "Configuración del servidor incompleta" });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Verificar si el usuario ya existe en Auth
    const { data: listado, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listError) throw listError;

    const usuarioExistente = listado.users.find((u) => u.email === email);

    if (usuarioExistente) {
      // Ya existe: actualizar su contraseña en vez de crear uno nuevo
      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(usuarioExistente.id, {
          password,
        });

      if (updateError) throw updateError;
    } else {
      // No existe: crear el usuario con email ya confirmado
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) throw createError;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error en /api/establecer-password:", err);
    const mensaje =
      err instanceof Error ? err.message : "Error al establecer contraseña";
    res.status(500).json({ error: mensaje });
  }
}
