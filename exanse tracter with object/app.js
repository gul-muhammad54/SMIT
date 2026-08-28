var expenseName = document.getElementById('expenseName')
var amount = document.getElementById('amount')
var list = document.getElementById('list')
var totalAmount = document.getElementById('totalAmount')

var allExpenses = []

function addExpense(params) {
    if (amount.value === "" || expenseName.value === "") {
        alert("please fill the form")
    }else{
        var obj = {
            name: expenseName.value,
            amount:amount.value
        }
        allExpenses.push(obj)
        expenseName.value =""
        amount.value = ""
        listExpense()
        totalAmountshow()
    }
}
function listExpense(params) {
    list.innerHTML = ""
    for (var i = 0; i < allExpenses.length; i++) {
        var item = allExpenses[i]
        list.innerHTML += `
        <div class="list">
  <div class="left">
    <h3>${item.name}</h3>
  </div>
  <div class="right">
  <span class="price">${item.amount} </span>
    <div class="action">
     <button class="edit"  onclick="editExpense(${i})"> ✏️ </button>
<button class="delete" onclick="deleteExpense(${i})"> 🗑️</button>
      </div>
    </div>
  </div>
</div>`
    }
}

function deleteExpense(index){
    allExpenses.splice(index,1)
listExpense()
totalAmountshow()
}
function editExpense(index){
    if (amount.value === "" || expenseName.value === "") {
    var newName = prompt("please! Fill the form")
}else{
    // var item =i allExpenses[i]
      allExpenses[index].name
    allExpenses.splice(index,1,newvalue)

}
}

function totalAmountshow(params) {
    var total  = 0;
    for (var i = 0; i< allExpenses.length; index++) {
       var item = allExpenses[i]
       total += Number(item.amount)
    }
    totalAmount.innerHTML = total;
}

function c() {

    const options = {
        margin: 10,
        filename: 'Expense.pdf',
        image: {
            type: 'jpeg',
            quality: 0.98
        },
        html2canvas: {
            scale: 2
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        }
    }

    html2pdf()
        .set(options)
        .from(list)
        .save()
}


listExpense()
showTotalAmount()
