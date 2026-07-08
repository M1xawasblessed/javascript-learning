class Person {
    constructor(name, age) {
        this.name = name;
        this.age = age;
    }

    greet() {
        console.log(`Hello, my name is ${this.name} and I am ${this.age} years old.`);
    }
}

class Developer extends Person {
    constructor(name, age, techStack) {
        super(name, age);
        this.techStack = techStack;
    }

    code() {
        console.log(`${this.name} is coding in ${this.techStack.join(", ")}.`);
    }
}

const person1 = new Person("Ayhan", 25);
person1.greet();

const dev1 = new Developer("Ayhan", 25, ["JavaScript", "React", "Node.js"]);
dev1.greet();
dev1.code();