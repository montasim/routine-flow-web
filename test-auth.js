const http = require('http');

async function test() {
  console.log("Testing auth login...");
  const res = await fetch("http://localhost:3000/api/auth/sign-in/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ayaan@routineflow.app", code: "123456" }) // invalid code, but we just want to see if it responds or fails
  });
  console.log("Status:", res.status);
  console.log("Headers:", Array.from(res.headers.entries()));
}
test();
