# JavaScript Variables and Data Types

## Learning Objectives
By the end of this lesson, you will be able to:
- Declare variables using `let`, `const`, and `var`
- Understand different data types in JavaScript
- Perform type conversion and checking
- Follow best practices for variable naming

## Variable Declaration

### The Three Ways to Declare Variables

```javascript
// var - old way, function-scoped (avoid in modern code)
var oldWay = "This is the old way";

// let - block-scoped, can be reassigned
let modernWay = "This is modern";
modernWay = "I can change this";

// const - block-scoped, cannot be reassigned
const constant = "This cannot change";
// constant = "Error!"; // This would throw an error
```

### When to Use Each

- **`const`**: Default choice for values that won't be reassigned
- **`let`**: When you need to reassign the variable
- **`var`**: Avoid in modern JavaScript (legacy only)

## Data Types

JavaScript has several built-in data types:

### Primitive Types

```javascript
// String - text data
let greeting = "Hello World";
let name = 'JavaScript';
let template = `Welcome to ${name}`;

// Number - integers and floating-point numbers
let age = 25;
let price = 99.99;
let negative = -10;

// Boolean - true or false
let isLearning = true;
let isCompleted = false;

// Undefined - variable declared but not assigned
let notAssigned;
console.log(notAssigned); // undefined

// Null - intentional absence of value
let emptyValue = null;

// Symbol - unique identifier (advanced topic)
let uniqueId = Symbol('id');

// BigInt - for very large numbers (advanced topic)
let bigNumber = 1234567890123456789012345678901234567890n;
```

### Reference Types

```javascript
// Object - key-value pairs
let person = {
    name: "Alice",
    age: 30,
    isStudent: true
};

// Array - ordered list of values
let colors = ["red", "green", "blue"];
let numbers = [1, 2, 3, 4, 5];
let mixed = ["text", 42, true, null];

// Function - reusable code block
function sayHello() {
    return "Hello!";
}
```

## Type Checking

```javascript
// typeof operator
console.log(typeof "Hello");        // "string"
console.log(typeof 42);             // "number"
console.log(typeof true);           // "boolean"
console.log(typeof undefined);      // "undefined"
console.log(typeof null);           // "object" (this is a bug!)
console.log(typeof {});             // "object"
console.log(typeof []);             // "object"
console.log(typeof function(){});   // "function"

// Better array checking
console.log(Array.isArray([]));     // true
console.log(Array.isArray({}));     // false
```

## Type Conversion

### Implicit Conversion (Coercion)
```javascript
// JavaScript automatically converts types
console.log("5" + 3);      // "53" (string concatenation)
console.log("5" - 3);      // 2 (numeric subtraction)
console.log("5" * "2");    // 10 (both converted to numbers)
console.log(true + 1);     // 2 (true becomes 1)
console.log(false + 1);    // 1 (false becomes 0)
```

### Explicit Conversion
```javascript
// Converting to string
let num = 42;
let str1 = String(num);        // "42"
let str2 = num.toString();     // "42"
let str3 = "" + num;           // "42"

// Converting to number
let text = "123";
let num1 = Number(text);       // 123
let num2 = parseInt(text);     // 123
let num3 = parseFloat("123.45"); // 123.45
let num4 = +text;              // 123

// Converting to boolean
console.log(Boolean(1));       // true
console.log(Boolean(0));       // false
console.log(Boolean(""));      // false
console.log(Boolean("hello")); // true
console.log(!!"hello");        // true (double negation)
```

## Variable Naming Best Practices

```javascript
// Good variable names
let userName = "alice";           // camelCase
let userAge = 25;                 // descriptive
let isLoggedIn = false;           // boolean starts with 'is'
let MAX_RETRY_COUNT = 3;          // constants in UPPER_CASE

// Poor variable names
let x = "alice";                  // not descriptive
let user_age = 25;               // snake_case (not JS convention)
let loggedIn = false;            // ambiguous for boolean
let maxRetryCount = 3;           // should be const and UPPER_CASE
```

### Naming Rules
- Must start with letter, underscore (_), or dollar sign ($)
- Can contain letters, numbers, underscores, dollar signs
- Cannot use reserved keywords (`if`, `for`, `function`, etc.)
- Case sensitive (`name` and `Name` are different)

## Practical Examples

```javascript
// User profile system
const USER_ROLES = {
    ADMIN: 'admin',
    USER: 'user',
    GUEST: 'guest'
};

let currentUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    role: USER_ROLES.USER,
    isActive: true,
    lastLogin: new Date()
};

// Shopping cart calculation
let itemPrice = 29.99;
let quantity = 3;
let taxRate = 0.08;

let subtotal = itemPrice * quantity;
let tax = subtotal * taxRate;
let total = subtotal + tax;

console.log(`Subtotal: $${subtotal.toFixed(2)}`);
console.log(`Tax: $${tax.toFixed(2)}`);
console.log(`Total: $${total.toFixed(2)}`);
```

## Exercise: Personal Information System

Create a program that stores and displays personal information:

```javascript
// TODO: Complete this exercise
// 1. Create variables for personal info
const firstName = ""; // Your first name
const lastName = "";  // Your last name
let age = 0;         // Your age
let isStudent = true; // Are you a student?

// 2. Create a full name
let fullName = ; // Combine first and last name

// 3. Create a bio message
let bio = ; // Use template literals to create a bio

// 4. Display the information
console.log("=== Personal Information ===");
console.log(`Name: ${fullName}`);
console.log(`Age: ${age}`);
console.log(`Student: ${isStudent}`);
console.log(`Bio: ${bio}`);

// 5. Type checking
console.log("\n=== Type Information ===");
console.log(`firstName type: ${typeof firstName}`);
console.log(`age type: ${typeof age}`);
console.log(`isStudent type: ${typeof isStudent}`);
```

## Challenge: Type Conversion Practice

```javascript
// Challenge: Fix these type conversion issues
let userInput1 = "25";
let userInput2 = "30";

// This should add the numbers, not concatenate
let sum = userInput1 + userInput2; // Currently: "2530"
console.log(`Sum should be 55, got: ${sum}`);

// This should check if user is adult (18+)
let userAge = "17";
let isAdult = userAge >= 18; // This comparison might not work as expected
console.log(`Is adult: ${isAdult}`);

// This should calculate percentage
let score = "85";
let total = "100";
let percentage = (score / total) * 100;
console.log(`Percentage: ${percentage}%`);
```

## Key Takeaways

1. **Use `const` by default**, `let` when you need to reassign
2. **JavaScript has 7 primitive types** and reference types
3. **Type coercion happens automatically** but can be unpredictable
4. **Use explicit conversion** when you need specific types
5. **Name variables descriptively** using camelCase
6. **Always check types** when working with user input or APIs

## What's Next?

In the next lesson, we'll explore operators and expressions in JavaScript. You'll learn about:
- Arithmetic operators (+, -, *, /, %)
- Comparison operators (==, ===, !=, !==)
- Logical operators (&&, ||, !)
- Assignment operators (=, +=, -=, etc.)

---

*Practice Tip: Try changing the data types in the examples above and observe how JavaScript handles the conversions!*