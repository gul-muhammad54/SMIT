// ===== Login check + navbar =====
var mainMenu = [
    ["dashboard.html", "Dashboard", ["admin", "hr", "employee"]],
    ["employees.html", "Employees", ["admin", "hr"]],
    ["attendance.html", "Attendance", ["admin", "hr", "employee"]],
    ["leave.html", "Leave", ["admin", "hr", "employee"]],
    ["payroll.html", "Payroll", ["admin", "hr", "employee"]],
    ["announcements.html", "Announcements", ["admin", "hr", "employee"]]
]
var moreMenu = [
    ["settings.html", "Company Setup", ["admin", "hr"]],
    ["users.html", "HR Logins", ["admin"]],
    ["audit.html", "Audit Log", ["admin"]],
    ["profile.html", "My Profile", ["admin", "hr", "employee"]]
]

async function checkLogin(allowed) {
    var s = await db.auth.getSession()
    if (!s.data.session) {
        window.location.href = "login.html"
        return null
    }

    var r = await db.from("profiles").select("*").eq("id", s.data.session.user.id).single()
    me = r.data

    if (!me || me.active === false) {
        await db.auth.signOut()
        window.location.href = "login.html"
        return null
    }

    var page = window.location.pathname.split("/").pop()
    if (me.must_change && page !== "change.html") {
        window.location.href = "change.html"
        return null
    }

    // role guard (server par RLS bhi check karta hai)
    if (allowed && allowed.indexOf(me.role) === -1) {
        window.location.href = "dashboard.html"
        return null
    }

    var r2 = await db.from("employees").select("*").eq("user_id", me.id).maybeSingle()
    myEmp = r2.data

    buildNavbar()
    return me
}

function menuHtml(list, page) {
    var html = ""
    for (var i = 0; i < list.length; i++) {
        if (list[i][2].indexOf(me.role) !== -1) {
            var active = list[i][0] === page ? "active" : ""
            html += `<a href="${list[i][0]}" class="${active}">${list[i][1]}</a>`
        }
    }
    return html
}

function buildNavbar() {
    var nav = document.getElementById("navLinks")
    if (!nav) {
        return
    }
    var page = window.location.pathname.split("/").pop()
    nav.innerHTML = menuHtml(mainMenu, page) +
        `<div class="dropdown"><span>More ▾</span><div class="dropdown-menu">${menuHtml(moreMenu, page)}</div></div>`
    document.getElementById("profileCircle").innerText = me.name.charAt(0).toUpperCase()
}

async function logout() {
    await db.auth.signOut()
    window.location.href = "login.html"
}

