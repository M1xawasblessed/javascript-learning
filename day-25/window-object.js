console.log("Window inner width:", window.innerWidth);
console.log("Window inner height:", window.innerHeight);

const userResponse = window.confirm("Do you want to proceed?");
if (userResponse) {
    console.log("User accepted.");
} else {
    console.log("User canceled.");
}

window.setTimeout(() => {
    console.log("This message appears after 2 seconds.");
}, 2000);