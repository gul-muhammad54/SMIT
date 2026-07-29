// var box1 = document.getElementById("box1")
// var box2 = document.getElementById("box2")
// var box3 = document.getElementById("box3")
// var box4 = document.getElementById("box4")
// var box5 = document.getElementById("box5")
// var box6 = document.getElementById("box6")
// var box7 = document.getElementById("box7")
// var box8 = document.getElementById("box8")
// var box9 = document.getElementById("box9")

// var text = o;
// var count = 0;

// function game(input){


// textcondition();

// textrendering(input);

// winningchecker();

// if(count === 9){
//     alert("reset");
// reset();

// }

// }

// function textcondition(){
    
//     if(text % 2 === 0){
//         text = "x";
//     }
//     else{
//         text = "o";
//     }
// }

// function textrendering(input){
// if(box1.innerHTML === "" && input === "box1"  ){
// box1.innerHTML = "text";
// count++;
// }
// else if(box2.innerHTML ==="" && input ==="box2"){
//     box2.innerHTML = "text"
//     count++;
// }
// else if(box3.innerHTML === "" && input ==="box3"){
//     box3.innerHTML = "text"
//     count++;
// }
// else if(box4.innerHTML === "" && input === "box4"){
//     box4.innerHTML = "text"
//     count++;
// }
// else if(box5.innerHTML === "" && input === "box5"){
//     box5.innerHTML = "text";
//     count++;
// }
// else if(box6.innerHTML === "" && input === "box6"){
//     box6.innerHTML = "text";
//     count++;
// }

// else if(box7.innerHTML === "" && input === "box7"){
//     box7.innerHTML = "text";
//     count++;
// }
// else if(box8.innerHTML === "" && input === "box8"){
//     box8.innerHTML = "text";
//     count++;
// }
// else if(box9.innerHTML === "" && input === "box9"){
//     box9.innerHTML = "text";
//     count++;
// }


// }

// function winnerchecker(){
// // set 1
// if(box1.innerHTML === "o" && box2.innerHTML === "o" && box3.innerHTML ==="o"){
// alert("o user win");
// reset();
// }
// // set 2
// else if(box4.innerHTML === "o" && box5.innerHTML === "o" && box6.innerHTML === "o"){
// alert("o user win")
// reset();
// }

// // set3
// else if(box7.innerHTML === "0" && box8.innerHTML === "o" && box9.innerHTML === "o") {
//     alert("o user win")
//     reset();
// }

// // 1.4,7

// else if(box1.innerHTML === "o"&& box4.innerHTML === "o" && box7.innerHTML === "o"){
//     alert("o user win")
//     reset()
// }
// // 2,5,8
// else if(box2.innerHTML === "o"&& box5.innerHTML === "o" && box8.innerHTML === "o"){
//     alert("o user win")
//     reset()
// }
// // 3,6,9
// else if(box3.innerHTML === "o"&& box6.innerHTML === "o" && box9.innerHTML === "o"){
//     alert("o user win")
//     reset()
// }
// // 1,5,9
// else if(box1.innerHTML === "o"&& box5.innerHTML === "o" && box9.innerHTML === "o"){
//     alert("o user win")
//     reset()
// }
// // 3,5,7
//  else if(box3.innerHTML === "o"&& box5.innerHTML === "o" && box7.innerHTML === "o"){
//     alert("o user win")
//     reset()
// }



// // xxxxxxxx

// if(box1.innerHTML === "x" && box2.innerHTML === "x" && box3.innerHTML ==="x"){
// alert("x user win");
// reset();
// }
// // set 2
// else if(box4.innerHTML === "x" && box5.innerHTML === "x" && box6.innerHTML === "x"){
// alert("x user win")
// reset();
// }

// // set3
// else if(box7.innerHTML === "x" && box8.innerHTML === "x" && box9.innerHTML === "x") {
//     alert("x user win")
//     reset();
// }

// // 1.4,7

// else if(box1.innerHTML === "x"&& box4.innerHTML === "x" && box7.innerHTML === "x"){
//     alert("x user win")
//     reset()
// }
// // 2,5,8
// else if(box2.innerHTML === "x"&& box5.innerHTML === "x" && box8.innerHTML === "x"){
//     alert(" x user win")
//     reset()
// }
// // 3,6,9
// else if(box3.innerHTML === "x"&& box6.innerHTML === "x" && box9.innerHTML === "x"){
//     alert("x user win")
//     reset()
// }
// // 1,5,9
// else if(box1.innerHTML === "x"&& box5.innerHTML === "x" && box9.innerHTML === "x"){
//     alert("x user win")
//     reset()
// }
// // 3,5,7
//  else if(box3.innerHTML === "x"&& box5.innerHTML === "x" && box7.innerHTML === "x"){
//     alert("x user win")
//     reset()
// }


// }
// function reset(){
//     box1.innerHTML = "";
//     box2.innerHTML ="";
//     box3.innerHTML = ""
//     box4.innerHTML = ""
//     box5.innerHTML = ""
//     box6.innerHTML =""
//     box7.innerHTML = ""
//     box8.innerHTML = ""
//     box9.innerHTML = ""
//     count = 0;
   
// }



let turn = "X";
let count = 0;

function game(id){

    let box = document.getElementById(id);

    if(box.innerHTML !== ""){
        return;
    }

    box.innerHTML = turn;
    count++;

    checkWinner();

    turn = (turn === "X") ? "O" : "X";

    if(count === 9){
        alert("Match Draw");
        reset();
    }
}

function checkWinner(){

    const b1 = document.getElementById("box1").innerHTML;
    const b2 = document.getElementById("box2").innerHTML;
    const b3 = document.getElementById("box3").innerHTML;
    const b4 = document.getElementById("box4").innerHTML;
    const b5 = document.getElementById("box5").innerHTML;
    const b6 = document.getElementById("box6").innerHTML;
    const b7 = document.getElementById("box7").innerHTML;
    const b8 = document.getElementById("box8").innerHTML;
    const b9 = document.getElementById("box9").innerHTML;

    const wins = [
        [b1,b2,b3],
        [b4,b5,b6],
        [b7,b8,b9],
        [b1,b4,b7],
        [b2,b5,b8],
        [b3,b6,b9],
        [b1,b5,b9],
        [b3,b5,b7]
    ];

    for(let win of wins){

        if(win[0] !== "" &&
           win[0] === win[1] &&
           win[1] === win[2]){

            alert(win[0] + " Wins!");
            reset();
            return;
        }
    }
}

function reset(){

    for(let i = 1; i <= 9; i++){
        document.getElementById("box" + i).innerHTML = "";
    }

    turn = "X";
    count = 0;
}