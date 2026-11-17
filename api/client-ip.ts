interface ApiRequest {
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    socket?: { remoteAddress?: string };
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

export default function handler(req: ApiRequest, res: ApiResponse) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Allow', 'GET, OPTIONS');
        res.status(204).end();
        return;
    }

    const forwarded =
        getHeader(req.headers, 'x-vercel-forwarded-for') ||
        getHeader(req.headers, 'x-forwarded-for');
    const rawIp =
        forwarded.split(',')[0]?.trim() ||
        getHeader(req.headers, 'x-real-ip').trim() ||
        req.socket?.remoteAddress ||
        '127.0.0.1';

    const cleanIp = rawIp.replace(/^::ffff:/, '').replace(/^::1$/, '127.0.0.1');

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ip: cleanIp || '127.0.0.1' });
}
