-- Esquema completo para Supabase:
-- 1) Muro de mensajes a colaboradores/profesores
-- 2) Alumnas inscritas, dispositivos autorizados (máx. 2), alertas de IP/país y panel administrador
-- Ejecuta este script completo en el SQL Editor de tu proyecto en Supabase.

create extension if not exists pgcrypto with schema extensions;

-- =====================================================================
-- 1. MENSAJES PARA PROFESORES Y COLABORADORES
-- =====================================================================
create table if not exists public.teacher_messages (
    id uuid primary key default gen_random_uuid(),
    sender_name text not null check (char_length(trim(sender_name)) between 1 and 120),
    recipient text not null check (char_length(trim(recipient)) between 1 and 120),
    message_text text not null check (char_length(trim(message_text)) between 1 and 1500),
    created_at timestamptz not null default now()
);

create index if not exists idx_teacher_messages_created_at
    on public.teacher_messages (created_at desc);

alter table public.teacher_messages enable row level security;

drop policy if exists "Public can read teacher messages" on public.teacher_messages;
create policy "Public can read teacher messages"
    on public.teacher_messages
    for select
    to anon, authenticated
    using (true);

drop policy if exists "Public can insert teacher messages" on public.teacher_messages;
create policy "Public can insert teacher messages"
    on public.teacher_messages
    for insert
    to anon, authenticated
    with check (
        char_length(trim(sender_name)) between 1 and 120
        and char_length(trim(recipient)) between 1 and 120
        and char_length(trim(message_text)) between 1 and 1500
    );

-- =====================================================================
-- 2. CONTROL DE ALUMNAS INSCRITAS, DISPOSITIVOS E IP / PAÍS
-- =====================================================================
create table if not exists public.enrolled_students (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    full_name text not null default '',
    purchase_code text not null,
    classroom_password text not null default '',
    classroom_url text not null default '',
    primary_country text,
    max_devices integer not null default 2 check (max_devices between 1 and 5),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_enrolled_students_email_lower
    on public.enrolled_students (lower(email));

create table if not exists public.student_devices (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.enrolled_students(id) on delete cascade,
    device_id text not null,
    device_label text not null default 'Dispositivo',
    ip_address text not null default '',
    country_code text not null default '',
    city text not null default '',
    is_authorized boolean not null default true,
    first_seen_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    unique (student_id, device_id)
);

create index if not exists idx_student_devices_student
    on public.student_devices (student_id, is_authorized);

create table if not exists public.device_access_alerts (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.enrolled_students(id) on delete cascade,
    email text not null,
    full_name text not null default '',
    detected_devices_count integer not null default 1,
    countries_seen text[] not null default '{}',
    attempted_device_id text not null default '',
    attempted_device_label text not null default '',
    attempted_ip text not null default '',
    attempted_country text not null default '',
    reason text not null check (reason in ('MAX_DEVICES', 'COUNTRY_MISMATCH')),
    resolved boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists idx_device_access_alerts_created
    on public.device_access_alerts (created_at desc);

create table if not exists public.admin_users (
    id uuid primary key default gen_random_uuid(),
    admin_email text not null unique,
    display_name text not null default 'Administrador',
    access_key_hash text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

-- Seguridad estricta: ninguna tabla sensible se lee ni escribe directamente desde el cliente.
-- Todo acceso ocurre mediante funciones RPC SECURITY DEFINER.
alter table public.enrolled_students enable row level security;
alter table public.student_devices enable row level security;
alter table public.device_access_alerts enable row level security;
alter table public.admin_users enable row level security;

-- =====================================================================
-- 3. FUNCIONES RPC PARA ALUMNAS (VALIDACIÓN DE PAGO, IP Y DISPOSITIVOS)
-- =====================================================================
create or replace function public.verify_student_access(
    p_email text,
    p_purchase_code text,
    p_device_id text,
    p_device_label text default 'Dispositivo',
    p_ip_address text default '',
    p_country_code text default '',
    p_city text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_email text := lower(trim(coalesce(p_email, '')));
    v_code text := upper(trim(coalesce(p_purchase_code, '')));
    v_device_id text := trim(coalesce(p_device_id, ''));
    v_device_label text := left(trim(coalesce(p_device_label, 'Dispositivo')), 120);
    v_ip text := left(trim(coalesce(p_ip_address, '')), 64);
    v_country text := upper(left(trim(coalesce(p_country_code, '')), 8));
    v_city text := left(trim(coalesce(p_city, '')), 100);
    v_student public.enrolled_students%rowtype;
    v_device public.student_devices%rowtype;
    v_auth_count integer := 0;
    v_total_devices integer := 0;
    v_countries text[] := '{}';
begin
    if v_email = '' or v_code = '' or v_device_id = '' then
        return jsonb_build_object(
            'ok', false,
            'status', 'INVALID_CREDENTIALS',
            'message', 'Ingresa tu correo de inscripción y tu código único de compra.'
        );
    end if;

    select *
    into v_student
    from public.enrolled_students
    where lower(email) = v_email
      and upper(purchase_code) = v_code
    limit 1;

    if not found then
        return jsonb_build_object(
            'ok', false,
            'status', 'INVALID_CREDENTIALS',
            'message', 'El correo electrónico o el código de compra no coinciden con una inscripción registrada.'
        );
    end if;

    if not v_student.is_active then
        return jsonb_build_object(
            'ok', false,
            'status', 'INACTIVE',
            'message', 'Tu pase se encuentra suspendido temporalmente. Contacta al equipo de soporte.'
        );
    end if;

    -- Fija el país principal en el primer ingreso verificado (si la cabecera de red lo provee)
    if (v_student.primary_country is null or trim(v_student.primary_country) = '') and v_country <> '' then
        update public.enrolled_students
        set primary_country = v_country,
            updated_at = now()
        where id = v_student.id;
        v_student.primary_country := v_country;
    end if;

    -- Bloqueo geográfico entre países distintos (ej. EE. UU. vs Venezuela)
    if v_student.primary_country is not null
       and trim(v_student.primary_country) <> ''
       and v_country <> ''
       and upper(v_student.primary_country) <> v_country then

        insert into public.student_devices (
            student_id, device_id, device_label, ip_address, country_code, city, is_authorized
        )
        values (
            v_student.id, v_device_id, v_device_label, v_ip, v_country, v_city, false
        )
        on conflict (student_id, device_id) do update
        set device_label = excluded.device_label,
            ip_address = excluded.ip_address,
            country_code = excluded.country_code,
            city = excluded.city,
            is_authorized = false,
            last_seen_at = now();

        select count(*)::integer into v_total_devices
        from public.student_devices
        where student_id = v_student.id;

        select array_agg(distinct c)
        into v_countries
        from (
            select upper(country_code) as c from public.student_devices
            where student_id = v_student.id and trim(country_code) <> ''
            union
            select upper(v_student.primary_country) as c where trim(v_student.primary_country) <> ''
        ) sub;

        insert into public.device_access_alerts (
            student_id, email, full_name, detected_devices_count, countries_seen,
            attempted_device_id, attempted_device_label, attempted_ip, attempted_country, reason
        ) values (
            v_student.id, v_student.email, v_student.full_name, v_total_devices, coalesce(v_countries, '{}'),
            v_device_id, v_device_label, v_ip, v_country, 'COUNTRY_MISMATCH'
        );

        return jsonb_build_object(
            'ok', false,
            'status', 'BLOCKED_GEO',
            'detectedDevicesCount', v_total_devices,
            'maxDevices', v_student.max_devices,
            'primaryCountry', v_student.primary_country,
            'attemptedCountry', v_country,
            'countriesSeen', coalesce(v_countries, '{}'::text[]),
            'attemptedIp', v_ip,
            'message', format(
                'Alerta de seguridad: esta alumna ha ingresado en %s dispositivos y se detectó un intento desde un país distinto (%s vs %s).',
                v_total_devices, v_student.primary_country, v_country
            )
        );
    end if;

    select *
    into v_device
    from public.student_devices
    where student_id = v_student.id
      and device_id = v_device_id
    limit 1;

    select count(*)::integer
    into v_auth_count
    from public.student_devices
    where student_id = v_student.id
      and is_authorized = true;

    if found and v_device.is_authorized then
        update public.student_devices
        set device_label = v_device_label,
            ip_address = case when v_ip <> '' then v_ip else ip_address end,
            country_code = case when v_country <> '' then v_country else country_code end,
            city = case when v_city <> '' then v_city else city end,
            last_seen_at = now()
        where id = v_device.id;

        return jsonb_build_object(
            'ok', true,
            'status', 'VERIFIED',
            'message', 'Acceso verificado correctamente.',
            'student', jsonb_build_object(
                'studentId', v_student.id,
                'email', v_student.email,
                'fullName', v_student.full_name,
                'purchaseCode', v_student.purchase_code,
                'classroomPassword', v_student.classroom_password,
                'classroomUrl', v_student.classroom_url,
                'primaryCountry', coalesce(v_student.primary_country, v_country, ''),
                'activeDevicesCount', v_auth_count,
                'maxDevices', v_student.max_devices
            )
        );
    end if;

    if v_auth_count < v_student.max_devices then
        insert into public.student_devices (
            student_id, device_id, device_label, ip_address, country_code, city, is_authorized
        )
        values (
            v_student.id, v_device_id, v_device_label, v_ip, v_country, v_city, true
        )
        on conflict (student_id, device_id) do update
        set device_label = excluded.device_label,
            ip_address = excluded.ip_address,
            country_code = excluded.country_code,
            city = excluded.city,
            is_authorized = true,
            last_seen_at = now();

        return jsonb_build_object(
            'ok', true,
            'status', 'VERIFIED',
            'message', 'Dispositivo autorizado. Tus datos quedan guardados para entrar directo.',
            'student', jsonb_build_object(
                'studentId', v_student.id,
                'email', v_student.email,
                'fullName', v_student.full_name,
                'purchaseCode', v_student.purchase_code,
                'classroomPassword', v_student.classroom_password,
                'classroomUrl', v_student.classroom_url,
                'primaryCountry', coalesce(v_student.primary_country, v_country, ''),
                'activeDevicesCount', v_auth_count + 1,
                'maxDevices', v_student.max_devices
            )
        );
    end if;

    -- Excedió el máximo de 2 dispositivos: bloquear y emitir alerta con conteo X
    insert into public.student_devices (
        student_id, device_id, device_label, ip_address, country_code, city, is_authorized
    )
    values (
        v_student.id, v_device_id, v_device_label, v_ip, v_country, v_city, false
    )
    on conflict (student_id, device_id) do update
    set device_label = excluded.device_label,
        ip_address = excluded.ip_address,
        country_code = excluded.country_code,
        city = excluded.city,
        is_authorized = false,
        last_seen_at = now();

    select count(*)::integer into v_total_devices
    from public.student_devices
    where student_id = v_student.id;

    select array_agg(distinct c)
    into v_countries
    from (
        select upper(country_code) as c from public.student_devices
        where student_id = v_student.id and trim(country_code) <> ''
        union
        select upper(v_student.primary_country) as c where v_student.primary_country is not null and trim(v_student.primary_country) <> ''
    ) sub;

    insert into public.device_access_alerts (
        student_id, email, full_name, detected_devices_count, countries_seen,
        attempted_device_id, attempted_device_label, attempted_ip, attempted_country, reason
    ) values (
        v_student.id, v_student.email, v_student.full_name, v_total_devices, coalesce(v_countries, '{}'),
        v_device_id, v_device_label, v_ip, v_country, 'MAX_DEVICES'
    );

    return jsonb_build_object(
        'ok', false,
        'status', 'BLOCKED_MAX_DEVICES',
        'detectedDevicesCount', v_total_devices,
        'maxDevices', v_student.max_devices,
        'primaryCountry', coalesce(v_student.primary_country, ''),
        'attemptedCountry', v_country,
        'countriesSeen', coalesce(v_countries, '{}'::text[]),
        'attemptedIp', v_ip,
        'message', format(
            'Alerta de seguridad: esta alumna ha ingresado en %s dispositivos distintos. El máximo permitido es %s dispositivos por cuenta.',
            v_total_devices, v_student.max_devices
        )
    );
end;
$$;

create or replace function public.save_student_classroom_credentials(
    p_email text,
    p_purchase_code text,
    p_device_id text,
    p_classroom_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_email text := lower(trim(coalesce(p_email, '')));
    v_code text := upper(trim(coalesce(p_purchase_code, '')));
    v_device_id text := trim(coalesce(p_device_id, ''));
    v_student_id uuid;
begin
    select s.id
    into v_student_id
    from public.enrolled_students s
    join public.student_devices d on d.student_id = s.id
    where lower(s.email) = v_email
      and upper(s.purchase_code) = v_code
      and s.is_active = true
      and d.device_id = v_device_id
      and d.is_authorized = true
    limit 1;

    if not found then
        return jsonb_build_object('ok', false, 'message', 'Dispositivo no autorizado.');
    end if;

    update public.enrolled_students
    set classroom_password = coalesce(p_classroom_password, ''),
        updated_at = now()
    where id = v_student_id;

    return jsonb_build_object('ok', true);
end;
$$;

-- =====================================================================
-- 4. FUNCIONES RPC PARA EL PANEL DE ADMINISTRADOR
-- =====================================================================
create or replace function public.is_valid_admin(
    p_admin_email text,
    p_access_key text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_email text := lower(trim(coalesce(p_admin_email, '')));
    v_key text := trim(coalesce(p_access_key, ''));
    v_user public.admin_users%rowtype;
begin
    if v_email = '' or v_key = '' then
        return false;
    end if;

    select *
    into v_user
    from public.admin_users
    where lower(admin_email) = v_email
      and is_active = true
    limit 1;

    if not found then
        return false;
    end if;

    return v_user.access_key_hash = extensions.crypt(v_key, v_user.access_key_hash);
end;
$$;

create or replace function public.verify_admin_access(
    p_admin_email text,
    p_access_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_email text := lower(trim(coalesce(p_admin_email, '')));
    v_display text;
begin
    if not public.is_valid_admin(v_email, p_access_key) then
        return jsonb_build_object(
            'ok', false,
            'message', 'Correo o clave de administrador incorrectos.'
        );
    end if;

    select display_name into v_display
    from public.admin_users
    where lower(admin_email) = v_email
    limit 1;

    return jsonb_build_object(
        'ok', true,
        'displayName', coalesce(v_display, 'Administrador'),
        'email', v_email
    );
end;
$$;

create or replace function public.admin_list_dashboard(
    p_admin_email text,
    p_access_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_students jsonb;
    v_alerts jsonb;
begin
    if not public.is_valid_admin(p_admin_email, p_access_key) then
        return jsonb_build_object('ok', false, 'message', 'Acceso no autorizado.');
    end if;

    select coalesce(jsonb_agg(row_to_json(s_data) order by s_data."createdAt" desc), '[]'::jsonb)
    into v_students
    from (
        select
            s.id,
            s.email,
            s.full_name as "fullName",
            s.purchase_code as "purchaseCode",
            s.classroom_password as "classroomPassword",
            s.classroom_url as "classroomUrl",
            s.primary_country as "primaryCountry",
            s.max_devices as "maxDevices",
            s.is_active as "isActive",
            s.created_at as "createdAt",
            (select count(*)::integer from public.student_devices d where d.student_id = s.id and d.is_authorized = true) as "authorizedDevicesCount",
            (select count(*)::integer from public.student_devices d where d.student_id = s.id) as "totalDevicesCount"
        from public.enrolled_students s
    ) s_data;

    select coalesce(jsonb_agg(row_to_json(a_data) order by a_data."createdAt" desc), '[]'::jsonb)
    into v_alerts
    from (
        select
            a.id,
            a.student_id as "studentId",
            a.email,
            a.full_name as "fullName",
            a.detected_devices_count as "detectedDevicesCount",
            a.countries_seen as "countriesSeen",
            a.attempted_device_label as "attemptedDeviceLabel",
            a.attempted_ip as "attemptedIp",
            a.attempted_country as "attemptedCountry",
            a.reason,
            a.resolved,
            a.created_at as "createdAt"
        from public.device_access_alerts a
        limit 100
    ) a_data;

    return jsonb_build_object(
        'ok', true,
        'students', v_students,
        'alerts', v_alerts
    );
end;
$$;

create or replace function public.admin_upsert_student(
    p_admin_email text,
    p_access_key text,
    p_email text,
    p_purchase_code text,
    p_full_name text default '',
    p_classroom_password text default '',
    p_classroom_url text default '',
    p_max_devices integer default 2,
    p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_email text := lower(trim(coalesce(p_email, '')));
    v_code text := upper(trim(coalesce(p_purchase_code, '')));
begin
    if not public.is_valid_admin(p_admin_email, p_access_key) then
        return jsonb_build_object('ok', false, 'message', 'Acceso no autorizado.');
    end if;

    if v_email = '' or v_code = '' then
        return jsonb_build_object('ok', false, 'message', 'El correo y el código único de compra son obligatorios.');
    end if;

    insert into public.enrolled_students (
        email, full_name, purchase_code, classroom_password, classroom_url, max_devices, is_active
    ) values (
        v_email,
        trim(coalesce(p_full_name, '')),
        v_code,
        coalesce(p_classroom_password, ''),
        trim(coalesce(p_classroom_url, '')),
        greatest(1, least(5, coalesce(p_max_devices, 2))),
        coalesce(p_is_active, true)
    )
    on conflict (email) do update
    set full_name = case when trim(excluded.full_name) <> '' then excluded.full_name else public.enrolled_students.full_name end,
        purchase_code = excluded.purchase_code,
        classroom_password = case when excluded.classroom_password <> '' then excluded.classroom_password else public.enrolled_students.classroom_password end,
        classroom_url = case when excluded.classroom_url <> '' then excluded.classroom_url else public.enrolled_students.classroom_url end,
        max_devices = excluded.max_devices,
        is_active = excluded.is_active,
        updated_at = now();

    return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_reset_student_devices(
    p_admin_email text,
    p_access_key text,
    p_student_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
    if not public.is_valid_admin(p_admin_email, p_access_key) then
        return jsonb_build_object('ok', false, 'message', 'Acceso no autorizado.');
    end if;

    delete from public.student_devices where student_id = p_student_id;

    update public.enrolled_students
    set primary_country = null,
        updated_at = now()
    where id = p_student_id;

    update public.device_access_alerts
    set resolved = true
    where student_id = p_student_id;

    return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_delete_student(
    p_admin_email text,
    p_access_key text,
    p_student_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
    if not public.is_valid_admin(p_admin_email, p_access_key) then
        return jsonb_build_object('ok', false, 'message', 'Acceso no autorizado.');
    end if;

    delete from public.enrolled_students where id = p_student_id;
    return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_upsert_students_bulk(
    p_admin_email text,
    p_access_key text,
    p_students jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_item jsonb;
    v_email text;
    v_code text;
    v_imported integer := 0;
begin
    if not public.is_valid_admin(p_admin_email, p_access_key) then
        return jsonb_build_object('ok', false, 'message', 'Acceso no autorizado.');
    end if;

    if p_students is null or jsonb_typeof(p_students) <> 'array' then
        return jsonb_build_object('ok', false, 'message', 'Formato de lista inválido.');
    end if;

    for v_item in select * from jsonb_array_elements(p_students)
    loop
        v_email := lower(trim(coalesce(v_item->>'email', '')));
        v_code := upper(trim(coalesce(v_item->>'purchaseCode', '')));
        if v_email = '' or v_code = '' then
            continue;
        end if;

        insert into public.enrolled_students (
            email, full_name, purchase_code, classroom_password, classroom_url, max_devices, is_active
        ) values (
            v_email,
            trim(coalesce(v_item->>'fullName', '')),
            v_code,
            coalesce(v_item->>'classroomPassword', ''),
            trim(coalesce(v_item->>'classroomUrl', '')),
            greatest(1, least(5, coalesce((v_item->>'maxDevices')::integer, 2))),
            coalesce((v_item->>'isActive')::boolean, true)
        )
        on conflict (email) do update
        set full_name = case when trim(excluded.full_name) <> '' then excluded.full_name else public.enrolled_students.full_name end,
            purchase_code = excluded.purchase_code,
            classroom_password = case when excluded.classroom_password <> '' then excluded.classroom_password else public.enrolled_students.classroom_password end,
            classroom_url = case when excluded.classroom_url <> '' then excluded.classroom_url else public.enrolled_students.classroom_url end,
            max_devices = excluded.max_devices,
            is_active = excluded.is_active,
            updated_at = now();

        v_imported := v_imported + 1;
    end loop;

    return jsonb_build_object('ok', true, 'importedCount', v_imported);
end;
$$;

grant execute on function public.verify_student_access(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.save_student_classroom_credentials(text, text, text, text) to anon, authenticated;
grant execute on function public.verify_admin_access(text, text) to anon, authenticated;
grant execute on function public.admin_list_dashboard(text, text) to anon, authenticated;
grant execute on function public.admin_upsert_student(text, text, text, text, text, text, text, integer, boolean) to anon, authenticated;
grant execute on function public.admin_upsert_students_bulk(text, text, jsonb) to anon, authenticated;
grant execute on function public.admin_reset_student_devices(text, text, uuid) to anon, authenticated;
grant execute on function public.admin_delete_student(text, text, uuid) to anon, authenticated;

-- =====================================================================
-- 5. FORO DE DUDAS CON HILOS DE CONVERSACIÓN Y RESPUESTA OFICIAL
-- =====================================================================
create table if not exists public.forum_questions (
    id uuid primary key default gen_random_uuid(),
    workshop_id text not null default 'general',
    workshop_title text not null default 'Consulta general',
    author_name text not null check (char_length(trim(author_name)) between 1 and 120),
    author_email text not null default '',
    title text not null check (char_length(trim(title)) between 1 and 200),
    body text not null default '' check (char_length(body) <= 2000),
    status text not null default 'pending' check (status in ('pending', 'answered')),
    created_at timestamptz not null default now()
);

create index if not exists idx_forum_questions_created
    on public.forum_questions (created_at desc);

create table if not exists public.forum_replies (
    id uuid primary key default gen_random_uuid(),
    question_id uuid not null references public.forum_questions(id) on delete cascade,
    author_name text not null check (char_length(trim(author_name)) between 1 and 120),
    author_role text not null default 'student' check (author_role in ('student', 'teacher')),
    body text not null check (char_length(trim(body)) between 1 and 2000),
    is_official boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists idx_forum_replies_question
    on public.forum_replies (question_id, created_at asc);

alter table public.forum_questions enable row level security;
alter table public.forum_replies enable row level security;

drop policy if exists "Public can read forum questions" on public.forum_questions;
create policy "Public can read forum questions"
    on public.forum_questions
    for select
    to anon, authenticated
    using (true);

drop policy if exists "Public can insert pending forum questions" on public.forum_questions;
create policy "Public can insert pending forum questions"
    on public.forum_questions
    for insert
    to anon, authenticated
    with check (
        status = 'pending'
        and char_length(trim(author_name)) between 1 and 120
        and char_length(trim(title)) between 1 and 200
        and char_length(body) <= 2000
    );

drop policy if exists "Public can read forum replies" on public.forum_replies;
create policy "Public can read forum replies"
    on public.forum_replies
    for select
    to anon, authenticated
    using (true);

drop policy if exists "Public can insert student forum replies" on public.forum_replies;
create policy "Public can insert student forum replies"
    on public.forum_replies
    for insert
    to anon, authenticated
    with check (
        author_role = 'student'
        and is_official = false
        and char_length(trim(author_name)) between 1 and 120
        and char_length(trim(body)) between 1 and 2000
    );

create or replace function public.admin_reply_forum_question(
    p_admin_email text,
    p_access_key text,
    p_question_id uuid,
    p_teacher_name text,
    p_reply_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_reply public.forum_replies%rowtype;
begin
    if not public.is_valid_admin(p_admin_email, p_access_key) then
        return jsonb_build_object('ok', false, 'message', 'Acceso no autorizado.');
    end if;

    if trim(coalesce(p_reply_body, '')) = '' then
        return jsonb_build_object('ok', false, 'message', 'La respuesta no puede estar vacía.');
    end if;

    insert into public.forum_replies (
        question_id, author_name, author_role, body, is_official
    ) values (
        p_question_id,
        left(coalesce(nullif(trim(p_teacher_name), ''), 'Profesor / Colaborador'), 120),
        'teacher',
        left(trim(p_reply_body), 2000),
        true
    )
    returning * into v_reply;

    update public.forum_questions
    set status = 'answered'
    where id = p_question_id;

    return jsonb_build_object(
        'ok', true,
        'reply', jsonb_build_object(
            'id', v_reply.id,
            'questionId', v_reply.question_id,
            'authorName', v_reply.author_name,
            'authorRole', v_reply.author_role,
            'body', v_reply.body,
            'isOfficial', v_reply.is_official,
            'createdAt', v_reply.created_at
        )
    );
end;
$$;

create or replace function public.admin_delete_forum_question(
    p_admin_email text,
    p_access_key text,
    p_question_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
    if not public.is_valid_admin(p_admin_email, p_access_key) then
        return jsonb_build_object('ok', false, 'message', 'Acceso no autorizado.');
    end if;

    delete from public.forum_questions where id = p_question_id;
    return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_reply_forum_question(text, text, uuid, text, text) to anon, authenticated;
grant execute on function public.admin_delete_forum_question(text, text, uuid) to anon, authenticated;

-- =====================================================================
-- 6. CONFIGURACIÓN INICIAL DEL ADMINISTRADOR (EDITA ANTES DE EJECUTAR)
-- =====================================================================
-- Reemplaza el correo y 'CAMBIA-ESTA-CLAVE-SEGURA' por tu clave real de administrador:
insert into public.admin_users (admin_email, display_name, access_key_hash)
values (
    'admin@territoriocanva.com',
    'Coordinación Feria Canva',
    extensions.crypt('CAMBIA-ESTA-CLAVE-SEGURA', extensions.gen_salt('bf'))
)
on conflict (admin_email) do nothing;
