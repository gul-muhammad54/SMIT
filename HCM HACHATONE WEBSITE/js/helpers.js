// ===== Audit + Notification =====
async function addAudit(action, entity, before, after) {
    await db.from("audit_log").insert({
        actor: me.name,
        action: action,
        entity: entity,
        before_data: before || null,
        after_data: after || null
    })
}

async function notify(userId, text) {
    if (userId) {
        await db.from("notifications").insert({ user_id: userId, message: text })
    }
}

// ===== Login banana (HR / Employee) =====
// alag client use hota hai taake HR ka apna session logout na ho
async function createLogin(email, password) {
    var temp = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })
    var res = await temp.auth.signUp({ email: email, password: password })
    if (res.error) {
        errorMsg(res.error.message)
        return null
    }
    return res.data.user.id
}

async function registerPerson(p) {
    var uid = await createLogin(p.email, p.password)
    if (!uid) {
        return false
    }

    var r1 = await db.from("profiles").insert({
        id: uid, name: p.name, email: p.email, role: p.role, must_change: true, active: true
    })
    if (r1.error) {
        errorMsg(r1.error.message)
        return false
    }

    var r2 = await db.from("employees").insert({
        user_id: uid, code: p.code, name: p.name, email: p.email,
        phone: p.phone || "", address: p.address || "",
        department_id: p.department_id || null, designation_id: p.designation_id || null,
        join_date: p.join_date, basic: p.basic, status: "active"
    })
    if (r2.error) {
        errorMsg(r2.error.message)
        return false
    }

    await addAudit("create", "employee " + p.code, null, { name: p.name, email: p.email, role: p.role })
    return true
}

async function resetLogin(email) {
    var r = await db.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset.html" })
    if (r.error) {
        errorMsg(r.error.message)
        return
    }
    await addAudit("reset", "login " + email, null, null)
    okMsg("Reset link sent to " + email)
}

// ===== Leave balance =====
async function getBalance(empId) {
    var year = today().substring(0, 4)
    var t = await db.from("leave_types").select("*").order("id")
    var l = await db.from("leaves").select("leave_type_id,days")
        .eq("employee_id", empId).eq("status", "approved").gte("start_date", year + "-01-01")
    var list = []
    for (var i = 0; i < (t.data || []).length; i++) {
        var type = t.data[i]
        var used = 0
        for (var j = 0; j < (l.data || []).length; j++) {
            if (l.data[j].leave_type_id === type.id) {
                used += Number(l.data[j].days)
            }
        }
        var left = type.quota === null ? null : type.quota - used
        list.push({ id: type.id, name: type.name, quota: type.quota, used: used, left: left })
    }
    return list
}

// ===== Tax slab (gross x 12) =====
function taxYear(a) {
    if (a <= 600000) return 0
    if (a <= 1200000) return (a - 600000) * 0.05
    if (a <= 2400000) return 30000 + (a - 1200000) * 0.15
    if (a <= 3600000) return 210000 + (a - 2400000) * 0.25
    return 510000 + (a - 3600000) * 0.35
}
