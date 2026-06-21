async function test() {
  try {
    const res = await fetch('http://localhost:3001/api/orders?driverId=1');
    const json = await res.json();
    console.log(json);
  } catch (err) {
    console.error(err);
  }
}
test();
