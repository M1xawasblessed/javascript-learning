const person = {
    name: "Ayhan",
    age: 25,
    city: "Baku"
};

const { name, city } = person;
console.log("Destructured Object:", name, city);

const colors = ["red", "green", "blue"];
const [firstColor, secondColor] = colors;
console.log("Destructured Array:", firstColor, secondColor);

const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combinedArray = [...arr1, ...arr2];
console.log("Combined Array:", combinedArray);

const newPerson = {
    ...person,
    profession: "Developer"
};
console.log("Updated Object with Spread:", newPerson);