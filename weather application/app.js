// ========================= WEATHER APPLICATION =========================
// Yahan hum ne jo cheezein seekhi thin sab ek jagah use ki hain:
// const (scoping), arrow function, template literal, fetch aur promise (.then / .catch)

const searchbox = document.getElementById('searchbox');
const cityName = document.getElementById('cityname');
const Humidity = document.getElementById('Humidity');
const clouds = document.getAnimations('clouds')
const API_KEY = 'c27af44c8277f0b14d1000299eff81b2'


const search = () => {
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${searchbox.value}&appid=${API_KEY}&units=metric`)
        .then(data => data.json())
        .then((convertedData) => {
            console.log(convertedData)
            // console.log(convertedData.weather)

            cityName.innerHTML = convertedData.name
            console.log("convertedData", convertedData.cityName);

           Humidity.innerHTML = convertedData.Humidity.
    
            clouds.innerHTML = convertedData.clouds;
console.log(convertedData.clouds);



        })
        .catch((error) => {
            console.log(error);
        })
}







