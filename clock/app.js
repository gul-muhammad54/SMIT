var hours = document.getElementById('hours')
var minutes = document.getElementById('minutes')
var seconds = document.getElementById('seconds')

function clock() {
    var currentDate = new Date();
    var currentHours = currentDate.getHours();
    if (currentHours > 12) {
        // 21 - 12
        currentHours = currentHours - 12
    }
    hours.innerHTML = currentHours;
    minutes.innerHTML = currentDate.getMinutes();
    seconds.innerHTML = currentDate.getSeconds();
    if (currentHours >= 12) {
        // PM
    } else {
        // AM
    }
}

clock()

// setInterval(clock, 1000)