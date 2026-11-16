interface ApiRequest {
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    body?: unknown;
    on?: (event: string, listener: (chunk: Buffer | string) => void) => void;
}

interface ApiResponse {
    status: (code: number) => ApiResponse;
    json: (data: unknown) => void;
    setHeader: (name: string, value: string) => void;
    end: (body?: string) => void;
}

const readJsonBody = async (req: ApiRequest): Promise<Record<string, unknown>> => {
    if (req.body && typeof req.body === 'object') {
        return req.body as Record<string, unknown>;
    }
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body) as Record<string, unknown>;
        } catch {
            return {};
        }
    }
    if (!req.on) return {};

    const raw = await new Promise<string>((resolve) => {
        let data = '';
        req.on?.('data', (chunk) => {
            data += chunk.toString();
        });
        req.on?.('end', () => resolve(data));
    });

    try {
        return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
        return {};
    }
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Allow', 'POST, OPTIONS');
        res.status(204).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, message: 'Método no permitido' });
        return;
    }

    const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

    if (!supabaseUrl || !supabaseKey) {
        res.status(503).json({
            ok: false,
            notConfigured: true,
            message: 'Supabase aún no está configurado en el servidor.',
        });
        return;
    }

    const body = await readJsonBody(req);
    const action = String(body.action || '');
    const adminEmail = String(body.adminEmail || '');
    const accessKey = String(body.accessKey || '');

    let rpcName = '';
    let rpcPayload: Record<string, unknown> = {};

    switch (action) {
        case 'verify':
            rpcName = 'verify_admin_access';
            rpcPayload = { p_admin_email: adminEmail, p_access_key: accessKey };
            break;
        case 'dashboard':
            rpcName = 'admin_list_dashboard';
            rpcPayload = { p_admin_email: adminEmail, p_access_key: accessKey };
            break;
        case 'upsert_student':
            rpcName = 'admin_upsert_student';
            rpcPayload = {
                p_admin_email: adminEmail,
                p_access_key: accessKey,
                p_email: String(body.email || ''),
                p_purchase_code: String(body.purchaseCode || ''),
                p_full_name: String(body.fullName || ''),
                p_classroom_password: String(body.classroomPassword || ''),
                p_classroom_url: String(body.classroomUrl || ''),
                p_max_devices: Number(body.maxDevices || 2),
                p_is_active: body.isActive !== false,
            };
            break;
        case 'bulk_upsert_students':
            rpcName = 'admin_upsert_students_bulk';
            rpcPayload = {
                p_admin_email: adminEmail,
                p_access_key: accessKey,
                p_students: Array.isArray(body.students) ? body.students : [],
            };
            break;
        case 'reset_devices':
            rpcName = 'admin_reset_student_devices';
            rpcPayload = {
                p_admin_email: adminEmail,
                p_access_key: accessKey,
                p_student_id: String(body.studentId || ''),
            };
            break;
        case 'delete_student':
            rpcName = 'admin_delete_student';
            rpcPayload = {
                p_admin_email: adminEmail,
                p_access_key: accessKey,
                p_student_id: String(body.studentId || ''),
            };
            break;
        case 'reply_forum_question':
            rpcName = 'admin_reply_forum_question';
            rpcPayload = {
                p_admin_email: adminEmail,
                p_access_key: accessKey,
                p_question_id: String(body.questionId || ''),
                p_teacher_name: String(body.teacherName || ''),
                p_reply_body: String(body.replyBody || ''),
            };
            break;
        case 'delete_forum_question':
            rpcName = 'admin_delete_forum_question';
            rpcPayload = {
                p_admin_email: adminEmail,
                p_access_key: accessKey,
                p_question_id: String(body.questionId || ''),
            };
            break;
        default:
            res.status(400).json({ ok: false, message: 'Acción de administrador no válida.' });
            return;
    }

    try {
        const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify(rpcPayload),
        });

        const data = await rpcRes.json();
        if (!rpcRes.ok) {
            res.status(rpcRes.status).json({
                ok: false,
                message: (data as { message?: string })?.message || 'Error al ejecutar operación de administrador.',
            });
            return;
        }

        res.status(200).json(data);
    } catch {
        res.status(500).json({
            ok: false,
            message: 'Error de conexión con el panel de administrador.',
        });
    }
}
