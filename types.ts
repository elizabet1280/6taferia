export interface PonenteDatos {
    usuario?: string;
    instagram?: string;
    pais?: string;
    codigoPais?: string;
}

export interface Ponente {
    nombre: string;
    foto: string;
    datos: PonenteDatos;
}

export interface BotonAcceso {
    habilitado: boolean;
    texto: string;
    animacion: string;
}

export interface Clase {
    id: string;
    titulo: string;
    shortTitle?: string;
    descripcion: string;
    bono?: string;
    date: string;
    time: string;
    horarioConfirmado: boolean;
    startTime?: Date;
    endTime?: Date;
    ponentes: Ponente[];
    botonAcceso: BotonAcceso;
    whatsappMessage?: string;
}

export interface DiaEvento {
    diaSemana: string;
    numero: string;
    fechaCompleta: string;
    estadoHorario: string;
}

export type StudentAccessStatus =
    | 'UNVERIFIED'
    | 'VERIFIED'
    | 'INVALID_CREDENTIALS'
    | 'INACTIVE'
    | 'BLOCKED_MAX_DEVICES'
    | 'BLOCKED_GEO';

export interface VerifiedStudentSession {
    studentId: string;
    email: string;
    fullName: string;
    purchaseCode: string;
    classroomPassword: string;
    classroomUrl: string;
    primaryCountry: string;
    activeDevicesCount: number;
    maxDevices: number;
    verifiedAt: string;
}

export interface AccessVerificationResult {
    ok: boolean;
    status: StudentAccessStatus;
    message: string;
    student?: VerifiedStudentSession;
    detectedDevicesCount?: number;
    maxDevices?: number;
    primaryCountry?: string;
    attemptedCountry?: string;
    countriesSeen?: string[];
    attemptedIp?: string;
}

export interface AdminStudentRecord {
    id: string;
    email: string;
    fullName: string;
    purchaseCode: string;
    classroomPassword: string;
    classroomUrl: string;
    primaryCountry: string | null;
    maxDevices: number;
    isActive: boolean;
    authorizedDevicesCount: number;
    totalDevicesCount: number;
    createdAt: string;
}

export interface DeviceAccessAlert {
    id: string;
    studentId: string;
    email: string;
    fullName: string;
    detectedDevicesCount: number;
    countriesSeen: string[];
    attemptedDeviceLabel: string;
    attemptedIp: string;
    attemptedCountry: string;
    reason: 'MAX_DEVICES' | 'COUNTRY_MISMATCH';
    resolved: boolean;
    createdAt: string;
}

export interface SavedAdminCredentials {
    email: string;
    accessKey: string;
    displayName: string;
    remember: boolean;
}

export type ForumQuestionStatus = 'pending' | 'answered';

export interface ForumReply {
    id: string;
    questionId: string;
    authorName: string;
    authorRole: 'student' | 'teacher';
    body: string;
    isOfficial: boolean;
    createdAt: string;
}

export interface ForumQuestion {
    id: string;
    workshopId: string;
    workshopTitle: string;
    authorName: string;
    title: string;
    body: string;
    status: ForumQuestionStatus;
    createdAt: string;
    replies: ForumReply[];
}