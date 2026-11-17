import * as XLSX from 'xlsx';

export interface ParsedStudentImportRow {
    email: string;
    purchaseCode: string;
    fullName: string;
    classroomPassword: string;
    classroomUrl: string;
    maxDevices: number;
    isActive: boolean;
}

export interface SpreadsheetParseResult {
    rows: ParsedStudentImportRow[];
    skippedCount: number;
    autoCodedCount: number;
}

const normalizeHeader = (header: string): string =>
    header
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

const generateCode = (index: number): string => {
    const suffix = Math.floor(1000 + ((Date.now() + index * 137) % 9000));
    return `CANVA-${suffix}`;
};

const parseBooleanCell = (value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    const str = String(value ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    if (!str) return true;
    return !['no', 'false', '0', 'inactivo', 'inactiva', 'suspendida', 'suspendido'].includes(str);
};

const pickValue = (row: Record<string, unknown>, candidates: string[]): string => {
    for (const key of candidates) {
        if (row[key] !== undefined && row[key] !== null) {
            const val = String(row[key]).trim();
            if (val) return val;
        }
    }
    return '';
};

export async function parseStudentsSpreadsheet(file: File): Promise<SpreadsheetParseResult> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
        return { rows: [], skippedCount: 0, autoCodedCount: 0 };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawObjects = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    const rows: ParsedStudentImportRow[] = [];
    let skippedCount = 0;
    let autoCodedCount = 0;

    rawObjects.forEach((rawRow, idx) => {
        const normalizedRow: Record<string, unknown> = {};
        Object.entries(rawRow).forEach(([k, v]) => {
            normalizedRow[normalizeHeader(k)] = v;
        });

        const email = pickValue(normalizedRow, [
            'correo',
            'email',
            'correo_electronico',
            'usuario',
            'mail',
            'e_mail',
        ]).toLowerCase();

        if (!email || !email.includes('@')) {
            // Ignora filas vacías o de encabezado secundario
            const hasAnyContent = Object.values(normalizedRow).some((v) => String(v ?? '').trim() !== '');
            if (hasAnyContent) skippedCount += 1;
            return;
        }

        const classroomPassword = pickValue(normalizedRow, [
            'clave_acceso',
            'clave_aula',
            'clave',
            'contrasena',
            'contrasena_aula',
            'password',
            'classroom_password',
        ]);

        let purchaseCode = pickValue(normalizedRow, [
            'codigo_compra',
            'codigo',
            'codigo_unico',
            'codigo_de_compra',
            'purchase_code',
            'code',
            'pedido',
            'folio',
        ]).toUpperCase();

        if (!purchaseCode && classroomPassword) {
            purchaseCode = classroomPassword.toUpperCase();
        }

        if (!purchaseCode) {
            purchaseCode = generateCode(idx + 1);
            autoCodedCount += 1;
        }

        const effectivePassword = classroomPassword || purchaseCode;

        const fullName = pickValue(normalizedRow, [
            'nombre',
            'nombre_completo',
            'alumna',
            'alumno',
            'participante',
            'full_name',
            'name',
        ]);

        const classroomUrl = pickValue(normalizedRow, [
            'url_aula',
            'enlace_aula',
            'url',
            'enlace',
            'classroom_url',
        ]);

        const rawMax = Number(
            pickValue(normalizedRow, ['max_dispositivos', 'dispositivos', 'max_devices', 'equipos'])
        );
        const maxDevices =
            Number.isFinite(rawMax) && rawMax >= 1 && rawMax <= 5 ? Math.round(rawMax) : 2;

        const isActive =
            normalizedRow.activo !== undefined
                ? parseBooleanCell(normalizedRow.activo)
                : normalizedRow.estado !== undefined
                  ? parseBooleanCell(normalizedRow.estado)
                  : normalizedRow.is_active !== undefined
                    ? parseBooleanCell(normalizedRow.is_active)
                    : true;

        rows.push({
            email,
            purchaseCode,
            fullName,
            classroomPassword: effectivePassword,
            classroomUrl,
            maxDevices,
            isActive,
        });
    });

    return { rows, skippedCount, autoCodedCount };
}

const TEMPLATE_SAMPLE_DATA = [
    {
        correo: 'maria.gonzalez@ejemplo.com',
        clave_acceso: 'ClaveNavidad2026',
        nombre: 'María González',
        url_aula: '',
        max_dispositivos: 2,
        activo: 'SI',
    },
    {
        correo: 'ana.perez@ejemplo.com',
        clave_acceso: 'FeriaCanva456',
        nombre: 'Ana Pérez',
        url_aula: '',
        max_dispositivos: 2,
        activo: 'SI',
    },
];

export function downloadStudentsTemplate(format: 'xlsx' | 'csv'): void {
    const worksheet = XLSX.utils.json_to_sheet(TEMPLATE_SAMPLE_DATA);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inscritos');

    if (format === 'csv') {
        const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'plantilla_inscritos_feria_canva.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
    }

    XLSX.writeFile(workbook, 'plantilla_inscritos_feria_canva.xlsx');
}
