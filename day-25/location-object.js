console.log("Current URL:", window.location.href);
console.log("Hostname:", window.location.hostname);
console.log("Pathname:", window.location.pathname);

function refreshPage() {
    window.location.reload();
}

function redirectToGoogle() {
    window.location.href = "https://www.google.com";
}