interface ApiRequest {
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    body?: unknown;
    socket?: { remoteAddress?: string };
    on?: (event: string, listener: (chunk: Buffer | string) => void) => void;
}

interface ApiResponse {
    status: (code: number) => ApiResponse;
    json: (data: unknown) => void;
    setHeader: (name: string, value: string) => void;
    end: (body?: string) => void;
}

const getHeader = (headers: ApiRequest['headers'], name: string): string => {
    const raw = headers[name.toLowerCase()];
    if (Array.isArray(raw)) return raw[0] || '';
    return raw || '';
};

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

const isPrivateOrLocalIp = (ip: string): boolean => {
    if (!ip) return true;
    const clean = ip.replace(/^::ffff:/, '');
    return (
        clean === '127.0.0.1' ||
        clean === '::1' ||
        clean.startsWith('10.') ||
        clean.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(clean)
    );
};

async function extractGeoContext(req: ApiRequest): Promise<{ ip: string; country: string; city: string }> {
    const forwardedFor =
        getHeader(req.headers, 'x-vercel-forwarded-for') ||
        getHeader(req.headers, 'x-forwarded-for');
    const rawIp =
        forwardedFor.split(',')[0]?.trim() ||
        getHeader(req.headers, 'x-real-ip').trim() ||
        req.socket?.remoteAddress ||
        '';
    const ip = rawIp.replace(/^::ffff:/, '').replace(/^::1$/, '127.0.0.1');

    let country =
        getHeader(req.headers, 'x-vercel-ip-country').trim().toUpperCase() ||
        getHeader(req.headers, 'cf-ipcountry').trim().toUpperCase();

    let city = decodeURIComponent(getHeader(req.headers, 'x-vercel-ip-city') || '');

    if (!country && !isPrivateOrLocalIp(ip)) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1800);
            const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (res.ok) {
                const geo = (await res.json()) as { success?: boolean; country_code?: string; city?: string };
                if (geo.success && geo.country_code) {
                    country = geo.country_code.toUpperCase();
                    if (!city && geo.city) city = geo.city;
                }
            }
        } catch {
            // Fallback silencioso si no hay respuesta de geolocalización externa
        }
    }

    return { ip, country, city };
}

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
    const action = typeof body.action === 'string' ? body.action : 'verify';
    const geo = await extractGeoContext(req);

    let rpcName = 'verify_student_access';
    let rpcPayload: Record<string, unknown>;

    if (action === 'save_credentials') {
        rpcName = 'save_student_classroom_credentials';
        rpcPayload = {
            p_email: String(body.email || ''),
            p_purchase_code: String(body.purchaseCode || ''),
            p_device_id: String(body.deviceId || ''),
            p_classroom_password: String(body.classroomPassword || ''),
        };
    } else if (action === 'save_progress') {
        rpcName = 'save_student_progress';
        rpcPayload = {
            p_email: String(body.email || ''),
            p_purchase_code: String(body.purchaseCode || ''),
            p_device_id: String(body.deviceId || ''),
            p_completed_class_ids: Array.isArray(body.completedClassIds) ? body.completedClassIds : [],
        };
    } else {
        rpcPayload = {
            p_email: String(body.email || ''),
            p_purchase_code: String(body.purchaseCode || ''),
            p_device_id: String(body.deviceId || ''),
            p_device_label: String(body.deviceLabel || 'Dispositivo'),
            p_ip_address: geo.ip,
            p_country_code: geo.country,
            p_city: geo.city,
        };
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
                message: (data as { message?: string })?.message || 'Error al validar en Supabase.',
            });
            return;
        }

        res.status(200).json(data);
    } catch {
        res.status(500).json({
            ok: false,
            message: 'Error de conexión al verificar el acceso.',
        });
    }
}
