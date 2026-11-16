import type { Clase } from '../types';

const STOPWORDS = new Set([
    'de',
    'del',
    'la',
    'las',
    'el',
    'los',
    'para',
    'con',
    'en',
    'y',
    'o',
    'un',
    'una',
    'unos',
    'unas',
    'al',
    'por',
    'que',
    'como',
    'hacer',
    'taller',
]);

const SYNONYM_GROUPS: string[][] = [
    ['franela', 'franelas', 'camisa', 'camisas', 'camiseta', 'camisetas', 'playera', 'playeras', 'polera', 'poleras', 'sublimar', 'sublimacion'],
    ['calendario', 'calendarios', 'adviento', 'agenda', 'agendas'],
    ['arbol', 'arboles', 'adorno', 'adornos', 'esfera', 'esferas', 'decoracion', 'decorar', 'pino'],
    ['tarjeta', 'tarjetas', 'postal', 'postales', 'foto', 'fotos', 'marco', 'marcos'],
    ['regalo', 'regalos', 'obsequio', 'obsequios', 'gift'],
    ['juego', 'juegos', 'tablero', 'tableros', 'mesa', 'jugar'],
    ['invitacion', 'invitaciones', 'invitar', 'interactiva', 'interactivas', 'cena', 'evento'],
    ['santa', 'noel'],
    ['navidad', 'navideno', 'navidenos', 'navidena', 'navidenas', 'fiesta', 'fiestas'],
];

export function normalizeSpanishText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function stemSpanishWord(rawWord: string): string {
    let w = normalizeSpanishText(rawWord);
    if (w.length <= 3) return w;

    const suffixes = [
        'aciones',
        'iciones',
        'acion',
        'icion',
        'amiento',
        'amientos',
        'izable',
        'izables',
        'izados',
        'izadas',
        'izado',
        'izada',
        'ables',
        'ibles',
        'able',
        'ible',
        'ando',
        'iendo',
        'cion',
        'sion',
        'ador',
        'adora',
        'adores',
        'ar',
        'er',
        'ir',
        'es',
        'os',
        'as',
        's',
        'o',
        'a',
    ];

    for (const suffix of suffixes) {
        if (w.endsWith(suffix) && w.length - suffix.length >= 4) {
            w = w.slice(0, -suffix.length);
            break;
        }
    }

    if (w.length > 5 && (w.endsWith('o') || w.endsWith('a') || w.endsWith('e'))) {
        w = w.slice(0, -1);
    }

    return w;
}

function getExpandedTermsForToken(tokenNorm: string): string[] {
    const tokenStem = stemSpanishWord(tokenNorm);
    const terms = new Set<string>([tokenNorm, tokenStem]);

    for (const group of SYNONYM_GROUPS) {
        const matchesGroup = group.some((word) => {
            const wStem = stemSpanishWord(word);
            return (
                word === tokenNorm ||
                wStem === tokenStem ||
                (tokenStem.length >= 4 && wStem.length >= 4 && (wStem.startsWith(tokenStem) || tokenStem.startsWith(wStem)))
            );
        });
        if (matchesGroup) {
            for (const word of group) {
                terms.add(word);
                terms.add(stemSpanishWord(word));
            }
        }
    }

    return Array.from(terms).filter((t) => t.length >= 2);
}

export function matchesTextQuery(textFields: Array<string | undefined>, rawQuery: string): boolean {
    const queryNorm = normalizeSpanishText(rawQuery);
    if (!queryNorm) return true;

    const rawTokens = queryNorm.split(' ').filter(Boolean);
    const queryTokens = rawTokens.filter(
        (t) => !STOPWORDS.has(t) || rawTokens.length === 1
    );

    if (queryTokens.length === 0) return true;

    const haystackNorm = normalizeSpanishText(textFields.filter(Boolean).join(' '));
    const haystackTokens = haystackNorm.split(' ').filter((t) => t.length > 0 && !STOPWORDS.has(t));
    const haystackEntries = haystackTokens.map((tok) => ({
        tok,
        stem: stemSpanishWord(tok),
    }));

    return queryTokens.every((qToken) => {
        const expandedTerms = getExpandedTermsForToken(qToken);

        return expandedTerms.some((term) => {
            if (term.length < 4) {
                return haystackEntries.some((h) => h.tok === term);
            }

            return haystackEntries.some((h) => {
                if (h.tok === term || h.stem === term) return true;
                if (h.stem.length >= 4 && (h.stem.startsWith(term) || term.startsWith(h.stem))) {
                    return true;
                }
                return qToken.length >= 4 && h.tok.includes(qToken);
            });
        });
    });
}

export function matchesWorkshopPrimaryQuery(clase: Clase, rawQuery: string): boolean {
    return matchesTextQuery(
        [
            clase.titulo,
            clase.shortTitle,
            ...clase.ponentes.map((p) => p.nombre),
        ],
        rawQuery
    );
}

export function matchesWorkshopQuery(clase: Clase, rawQuery: string): boolean {
    return matchesTextQuery(
        [
            clase.titulo,
            clase.shortTitle,
            clase.descripcion,
            clase.bono,
            ...clase.ponentes.map((p) => p.nombre),
        ],
        rawQuery
    );
}

export function filterWorkshopsByQuery(classes: Clase[], rawQuery: string): Clase[] {
    if (!normalizeSpanishText(rawQuery)) return classes;
    const primaryMatches = classes.filter((c) => matchesWorkshopPrimaryQuery(c, rawQuery));
    if (primaryMatches.length > 0) {
        return primaryMatches;
    }
    return classes.filter((c) => matchesWorkshopQuery(c, rawQuery));
}
