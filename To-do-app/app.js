var tasklist = document.getElementById("tasklist");
var tasks = []

console.log(tasks[2]);

function addTask() {
    var usertask = prompt('Enter your value');
    if (usertask === "") {
        alert("please ! fill the value") 
    }else{
        tasks.push(usertask)
        displayTask();
        
    }
}

function displayTask(params) {
    tasklist.innerHTML = "";
   for (var i = 0; i < tasks.length; i++) {
    var items = tasks[i];
    tasklist.innerHTML += `<li>
        <span class="task">${items}</span>
        <div>
<button class="delete" onclick="Deletetask(${i})">🗑️</button>
<button class="edit" onclick="editTask(${i})">🖊️</button>
        </div>
    </li>`
    
   }
}

function Deletetask(index){
    tasks.splice(index,1)
    displayTask();

}

function editTask(index) {
    var uservalue = prompt("please update your value",tasks[index])
    tasks.splice(index, 1, uservalue)
    displayTask()
}

displayTask();