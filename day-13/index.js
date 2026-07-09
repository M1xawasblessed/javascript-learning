let globalVariable = "I am global";

function outerFunction() {
    let outerVariable = "I am outside!";

    function innerFunction() {
        let innerVariable = "I am inside!";
        console.log(globalVariable);
        console.log(outerVariable);
        console.log(innerVariable);
    }

    return innerFunction;
}

const myClosure = outerFunction();
myClosure();


function createCounter() {
    let count = 0;
    
    return function() {
        count++;
        console.log(`Current Count: ${count}`);
    }
}

const counter1 = createCounter();
counter1();
counter1();
counter1();

const counter2 = createCounter();
counter2();