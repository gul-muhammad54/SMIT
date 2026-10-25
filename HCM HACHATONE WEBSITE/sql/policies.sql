-- ============================================================================
-- HCM LITE - ROW LEVEL SECURITY (RLS) POLICIES
-- Run this script in Supabase SQL Editor
-- ============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE company ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 1. COMPANY POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view company" ON company;
CREATE POLICY "Anyone can view company"
ON company FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow company insert on setup or by admin" ON company;
CREATE POLICY "Allow company insert on setup or by admin"
ON company FOR INSERT
WITH CHECK (
    (NOT EXISTS (SELECT 1 FROM company))
    OR (get_user_role() = 'admin')
);

DROP POLICY IF EXISTS "Admin can update company" ON company;
CREATE POLICY "Admin can update company"
ON company FOR UPDATE
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

-- ============================================================================
-- 2. PROFILES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "View profiles" ON profiles;
CREATE POLICY "View profiles"
ON profiles FOR SELECT
USING (
    auth.uid() = id
    OR get_user_role() IN ('admin', 'hr')
);

DROP POLICY IF EXISTS "Insert profile" ON profiles;
CREATE POLICY "Insert profile"
ON profiles FOR INSERT
WITH CHECK (
    auth.uid() = id
    OR get_user_role() IN ('admin', 'hr')
);

DROP POLICY IF EXISTS "Update profile" ON profiles;
CREATE POLICY "Update profile"
ON profiles FOR UPDATE
USING (
    auth.uid() = id
    OR get_user_role() = 'admin'
)
WITH CHECK (
    auth.uid() = id
    OR get_user_role() = 'admin'
);

-- ============================================================================
-- 3. LEAVE TYPES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can read leave types" ON leave_types;
CREATE POLICY "Anyone can read leave types"
ON leave_types FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admin or setup can insert leave types" ON leave_types;
CREATE POLICY "Admin or setup can insert leave types"
ON leave_types FOR INSERT
WITH CHECK (
    (NOT EXISTS (SELECT 1 FROM leave_types))
    OR get_user_role() = 'admin'
);

DROP POLICY IF EXISTS "Admin can update leave types" ON leave_types;
CREATE POLICY "Admin can update leave types"
ON leave_types FOR UPDATE
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admin can delete leave types" ON leave_types;
CREATE POLICY "Admin can delete leave types"
ON leave_types FOR DELETE
USING (get_user_role() = 'admin');

-- ============================================================================
-- 4. DEPARTMENTS, DESIGNATIONS, HOLIDAYS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users view departments" ON departments;
CREATE POLICY "Authenticated users view departments"
ON departments FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin can manage departments" ON departments;
CREATE POLICY "Admin can manage departments"
ON departments FOR ALL
TO authenticated
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Authenticated users view designations" ON designations;
CREATE POLICY "Authenticated users view designations"
ON designations FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin can manage designations" ON designations;
CREATE POLICY "Admin can manage designations"
ON designations FOR ALL
TO authenticated
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Authenticated users view holidays" ON holidays;
CREATE POLICY "Authenticated users view holidays"
ON holidays FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin can manage holidays" ON holidays;
CREATE POLICY "Admin can manage holidays"
ON holidays FOR ALL
TO authenticated
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

-- ============================================================================
-- 5. EMPLOYEES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "View employees" ON employees;
CREATE POLICY "View employees"
ON employees FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR get_user_role() IN ('admin', 'hr')
);

DROP POLICY IF EXISTS "HR/Admin insert employees" ON employees;
CREATE POLICY "HR/Admin insert employees"
ON employees FOR INSERT
TO authenticated
WITH CHECK (get_user_role() IN ('admin', 'hr'));

DROP POLICY IF EXISTS "Update employees" ON employees;
CREATE POLICY "Update employees"
ON employees FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR get_user_role() IN ('admin', 'hr')
)
WITH CHECK (
    user_id = auth.uid()
    OR get_user_role() IN ('admin', 'hr')
);

-- ============================================================================
-- 6. ATTENDANCE POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "View attendance" ON attendance;
CREATE POLICY "View attendance"
ON attendance FOR SELECT
TO authenticated
USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR get_user_role() IN ('admin', 'hr')
);

DROP POLICY IF EXISTS "Insert attendance" ON attendance;
CREATE POLICY "Insert attendance"
ON attendance FOR INSERT
TO authenticated
WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR get_user_role() IN ('admin', 'hr')
);

DROP POLICY IF EXISTS "Update attendance" ON attendance;
CREATE POLICY "Update attendance"
ON attendance FOR UPDATE
TO authenticated
USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR get_user_role() IN ('admin', 'hr')
)
WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR get_user_role() IN ('admin', 'hr')
);

-- ============================================================================
-- 7. CORRECTIONS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "View corrections" ON corrections;
CREATE POLICY "View corrections"
ON corrections FOR SELECT
TO authenticated
USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR get_user_role() IN ('admin', 'hr')
);

DROP POLICY IF EXISTS "Insert corrections" ON corrections;
CREATE POLICY "Insert corrections"
ON corrections FOR INSERT
TO authenticated
WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Update corrections" ON corrections;
CREATE POLICY "Update corrections"
ON corrections FOR UPDATE
TO authenticated
USING (get_user_role() IN ('admin', 'hr'))
WITH CHECK (get_user_role() IN ('admin', 'hr'));

-- ============================================================================
-- 8. LEAVES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "View leaves" ON leaves;
CREATE POLICY "View leaves"
ON leaves FOR SELECT
TO authenticated
USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR get_user_role() IN ('admin', 'hr')
);

DROP POLICY IF EXISTS "Apply leave" ON leaves;
CREATE POLICY "Apply leave"
ON leaves FOR INSERT
TO authenticated
WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Update leave status" ON leaves;
CREATE POLICY "Update leave status"
ON leaves FOR UPDATE
TO authenticated
USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR get_user_role() IN ('admin', 'hr')
)
WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR get_user_role() IN ('admin', 'hr')
);

-- ============================================================================
-- 9. PAYROLL RUNS & PAYSLIPS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "View payroll runs" ON payroll_runs;
CREATE POLICY "View payroll runs"
ON payroll_runs FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Manage payroll runs" ON payroll_runs;
CREATE POLICY "Manage payroll runs"
ON payroll_runs FOR ALL
TO authenticated
USING (get_user_role() IN ('admin', 'hr'))
WITH CHECK (get_user_role() IN ('admin', 'hr'));

DROP POLICY IF EXISTS "View payslips" ON payslips;
CREATE POLICY "View payslips"
ON payslips FOR SELECT
TO authenticated
USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR get_user_role() IN ('admin', 'hr')
);

DROP POLICY IF EXISTS "Manage payslips" ON payslips;
CREATE POLICY "Manage payslips"
ON payslips FOR ALL
TO authenticated
USING (get_user_role() IN ('admin', 'hr'))
WITH CHECK (get_user_role() IN ('admin', 'hr'));

-- ============================================================================
-- 10. ANNOUNCEMENTS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Anyone view announcements" ON announcements;
CREATE POLICY "Anyone view announcements"
ON announcements FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin and HR create announcements" ON announcements;
CREATE POLICY "Admin and HR create announcements"
ON announcements FOR INSERT
TO authenticated
WITH CHECK (get_user_role() IN ('admin', 'hr'));

-- ============================================================================
-- 11. NOTIFICATIONS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "View own notifications" ON notifications;
CREATE POLICY "View own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Update own notifications" ON notifications;
CREATE POLICY "Update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Insert notifications" ON notifications;
CREATE POLICY "Insert notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================================
-- 12. AUDIT LOG POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Admin view audit log" ON audit_log;
CREATE POLICY "Admin view audit log"
ON audit_log FOR SELECT
TO authenticated
USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Insert audit log" ON audit_log;
CREATE POLICY "Insert audit log"
ON audit_log FOR INSERT
TO authenticated
WITH CHECK (true);
