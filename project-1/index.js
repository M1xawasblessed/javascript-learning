const inventory = [
    { id: 1, name: "Chicken Breast", price: 6.50, category: "Meat" },
    { id: 2, name: "Wheat Flour", price: 1.20, category: "Grocery" },
    { id: 3, name: "Olive Oil", price: 8.90, category: "Grocery" },
    { id: 4, name: "Banana", price: 2.10, category: "Fruit" }
];

const cart = new Map();
const uniqueCategories = new Set();

function addToCart(productId, quantity) {
    const product = inventory.find(item => item.id === productId);
    
    if (product) {
        if (cart.has(product.name)) {
            cart.set(product.name, cart.get(product.name) + quantity);
        } else {
            cart.set(product.name, quantity);
        }
        
        uniqueCategories.add(product.category);
        console.log(`${quantity}x ${product.name} added to cart.`);
    } else {
        console.log("Product not found!");
    }
}

function calculateTotal() {
    let total = 0;
    cart.forEach((quantity, productName) => {
        const product = inventory.find(item => item.name === productName);
        total += product.price * quantity;
    });
    return total.toFixed(2);
}

console.log("--- Adding items to cart ---");
addToCart(1, 2);
addToCart(2, 3);
addToCart(1, 1);

console.log("\n--- Cart Status ---");
console.log(cart);

console.log("\n--- Categories ---");
console.log([...uniqueCategories]);

console.log(`\nTotal Price: €${calculateTotal()}`);