console.log("Start");

setTimeout(() => {
    console.log("This runs after 2 seconds");
}, 2000);

const myPromise = new Promise((resolve, reject) => {
    let isSuccessful = true;
    
    setTimeout(() => {
        if (isSuccessful) {
            resolve("Promise resolved successfully!");
        } else {
            reject("Promise rejected.");
        }
    }, 3000);
});

myPromise
    .then(result => {
        console.log("Result:", result);
    })
    .catch(error => {
        console.log("Error:", error);
    });

console.log("End");