-- ============================================================================
-- HCM LITE - COMPLETE DATABASE TABLES AND FUNCTIONS
-- Run this script in Supabase SQL Editor
-- ============================================================================

-- 1. Enable pgcrypto extension for UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. COMPANY SETTINGS TABLE
CREATE TABLE IF NOT EXISTS company (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    name TEXT NOT NULL,
    office_start TIME DEFAULT '09:00',
    grace_min INT DEFAULT 15,
    halfday_hours NUMERIC DEFAULT 5,
    weekend_days TEXT[] DEFAULT ARRAY['Saturday', 'Sunday'],
    office_lat NUMERIC,
    office_lng NUMERIC,
    radius INT DEFAULT 150,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DESIGNATIONS TABLE
CREATE TABLE IF NOT EXISTS designations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. LEAVE TYPES TABLE (Annual 14, Sick 8, Casual 10, Unpaid unlimited)
CREATE TABLE IF NOT EXISTS leave_types (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    quota NUMERIC, -- NULL means unlimited (e.g. Unpaid)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PUBLIC HOLIDAYS TABLE
CREATE TABLE IF NOT EXISTS holidays (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    date DATE UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PROFILES TABLE (Linked with auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'hr', 'employee')),
    must_change BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    designation_id BIGINT REFERENCES designations(id) ON DELETE SET NULL,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    basic NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ATTENDANCE TABLE (One record per employee per day)
CREATE TABLE IF NOT EXISTS attendance (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('present', 'late', 'half_day', 'absent', 'on_leave', 'missing_checkout')),
    lat NUMERIC,
    lng NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_employee_daily_attendance UNIQUE(employee_id, date)
);

-- 10. CORRECTIONS TABLE
CREATE TABLE IF NOT EXISTS corrections (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. LEAVES TABLE
CREATE TABLE IF NOT EXISTS leaves (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id BIGINT NOT NULL REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days NUMERIC NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    comment TEXT,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. PAYROLL RUNS TABLE
CREATE TABLE IF NOT EXISTS payroll_runs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    month TEXT UNIQUE NOT NULL, -- e.g. '2026-10'
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
    working_days INT DEFAULT 22,
    total_gross NUMERIC DEFAULT 0,
    total_deductions NUMERIC DEFAULT 0,
    total_tax NUMERIC DEFAULT 0,
    total_net NUMERIC DEFAULT 0,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    finalized_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. PAYSLIPS TABLE
CREATE TABLE IF NOT EXISTS payslips (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_id BIGINT NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    basic NUMERIC NOT NULL DEFAULT 0,
    gross NUMERIC NOT NULL DEFAULT 0,
    deductions NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    net NUMERIC NOT NULL DEFAULT 0,
    absent_days NUMERIC DEFAULT 0,
    unpaid_days NUMERIC DEFAULT 0,
    half_days NUMERIC DEFAULT 0,
    per_day_salary NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_run_employee_payslip UNIQUE(run_id, employee_id)
);

-- 14. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS announcements (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get the role of current logged in user (Security Definer avoids recursive RLS)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Function to check if current user is active
CREATE OR REPLACE FUNCTION is_user_active()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE((SELECT active FROM profiles WHERE id = auth.uid() LIMIT 1), false);
$$;

-- Function to check if system has been setup (company exists)
CREATE OR REPLACE FUNCTION is_system_setup()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM company LIMIT 1);
$$;

-- Function to record check-in with server timestamp & late check
CREATE OR REPLACE FUNCTION record_check_in(
    p_employee_id BIGINT,
    p_lat NUMERIC DEFAULT NULL,
    p_lng NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_now TIMESTAMPTZ := NOW();
    v_office_start TIME;
    v_grace_min INT;
    v_late_cutoff TIME;
    v_status TEXT := 'present';
    v_existing_id BIGINT;
    v_result JSONB;
BEGIN
    -- Check if record already exists for today
    SELECT id INTO v_existing_id FROM attendance WHERE employee_id = p_employee_id AND date = v_today;
    IF v_existing_id IS NOT NULL THEN
        RAISE EXCEPTION 'Check-in already recorded for today' USING ERRCODE = '23505';
    END IF;

    -- Fetch office timing from company settings
    SELECT office_start, grace_min INTO v_office_start, v_grace_min FROM company WHERE id = 1;
    IF v_office_start IS NULL THEN
        v_office_start := '09:00'::TIME;
        v_grace_min := 15;
    END IF;

    -- Calculate late cutoff (e.g. 09:00 + 15 min = 09:15)
    v_late_cutoff := (v_office_start + (v_grace_min || ' minutes')::INTERVAL)::TIME;

    -- Compare current time with late cutoff (Asia/Karachi UTC+5)
    IF (v_now AT TIME ZONE 'Asia/Karachi')::TIME > v_late_cutoff THEN
        v_status := 'late';
    END IF;

    -- Insert attendance record
    INSERT INTO attendance (employee_id, date, check_in, status, lat, lng)
    VALUES (p_employee_id, v_today, v_now, v_status, p_lat, p_lng)
    RETURNING jsonb_build_object(
        'id', id,
        'date', date,
        'check_in', check_in,
        'status', status
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Function to record check-out with half-day calculation
CREATE OR REPLACE FUNCTION record_check_out(
    p_employee_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_now TIMESTAMPTZ := NOW();
    v_halfday_hours NUMERIC;
    v_rec RECORD;
    v_hours_worked NUMERIC;
    v_new_status TEXT;
    v_result JSONB;
BEGIN
    SELECT * INTO v_rec FROM attendance WHERE employee_id = p_employee_id AND date = v_today;
    IF v_rec IS NULL THEN
        RAISE EXCEPTION 'No check-in record found for today to check out' USING ERRCODE = '02000';
    END IF;

    IF v_rec.check_out IS NOT NULL THEN
        RAISE EXCEPTION 'Check-out already recorded for today' USING ERRCODE = '23505';
    END IF;

    SELECT halfday_hours INTO v_halfday_hours FROM company WHERE id = 1;
    IF v_halfday_hours IS NULL THEN
        v_halfday_hours := 5;
    END IF;

    -- Calculate hours worked between check-in and now
    v_hours_worked := EXTRACT(EPOCH FROM (v_now - v_rec.check_in)) / 3600.0;

    v_new_status := v_rec.status;
    IF v_hours_worked < v_halfday_hours THEN
        v_new_status := 'half_day';
    END IF;

    UPDATE attendance
    SET check_out = v_now,
        status = v_new_status
    WHERE id = v_rec.id
    RETURNING jsonb_build_object(
        'id', id,
        'date', date,
        'check_in', check_in,
        'check_out', check_out,
        'hours_worked', v_hours_worked,
        'status', status
    ) INTO v_result;

    RETURN v_result;
END;
$$;
