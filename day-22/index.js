const user = {
    firstName: "Ayhan",
    role: "Developer",
    getDetails: function() {
        return `${this.firstName} is a ${this.role}.`;
    }
};

console.log("Normal Method Call:", user.getDetails());

const anotherUser = {
    firstName: "Alex",
    role: "Designer"
};

console.log("Using call():", user.getDetails.call(anotherUser));

function introduce(greeting, punctuation) {
    console.log(`${greeting}, ${this.firstName}${punctuation}`);
}

introduce.call(anotherUser, "Hello", "!");

introduce.apply(anotherUser, ["Hi", "."]);

const boundFunction = introduce.bind(user, "Welcome", "!!!");
boundFunction();