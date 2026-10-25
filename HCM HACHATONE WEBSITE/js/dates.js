// ===== Date helpers =====
function today() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" })
}

function timeOnly(value) {
    if (!value) {
        return "-"
    }
    return new Date(value).toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" })
}

function dateString(d) {
    return d.toLocaleDateString("en-CA")
}

// working days ki list (Sat-Sun aur holidays skip)
function workDates(start, end, holidays) {
    var list = []
    var d = new Date(start + "T00:00:00")
    var e = new Date(end + "T00:00:00")
    while (d <= e) {
        var s = dateString(d)
        var day = d.getDay()
        if (day !== 0 && day !== 6 && holidays.indexOf(s) === -1) {
            list.push(s)
        }
        d.setDate(d.getDate() + 1)
    }
    return list
}

function workingDays(start, end, holidays) {
    return workDates(start, end, holidays).length
}

async function getHolidays() {
    var r = await db.from("holidays").select("date")
    var list = []
    for (var i = 0; i < (r.data || []).length; i++) {
        list.push(r.data[i].date)
    }
    return list
}

// attendance ka status dikhane ke liye
function showStatus(a) {
    if (a.check_in && !a.check_out && a.date < today()) {
        return "missing_checkout"
    }
    return a.status
}

function badge(text) {
    return `<span class="badge ${text}">${text}</span>`
}

