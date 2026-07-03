const user = {
    firstName: "Ayhan",
    lastName: "Mammadov",
    age: 25,
    isStudent: true,
    
    introduce: function() {
        console.log(`Hello, my name is ${this.firstName} ${this.lastName}.`);
    },
    
    checkStatus: function() {
        if (this.isStudent) {
            console.log("I am currently studying.");
        } else {
            console.log("I am not a student.");
        }
    }
};

console.log("User's First Name:", user.firstName);
console.log("User's Age:", user["age"]);

user.city = "Baku";
user.age = 26;
delete user.isStudent;

console.log("Updated User Object:", user);

user.introduce();
user.checkStatus();