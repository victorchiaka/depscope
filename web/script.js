(async () => {
  try {
    const response = await fetch("/api/graph");
    const data = await response.json();
    console.log("Fetched data:", data);

    document.getElementById("graph").innerHTML =
      `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  } catch (error) {
    console.error("Error fetching dependencies:", error);
    document.getElementById("graph").innerHTML =
      `<p>Error: ${error.message}</p>`;
  }
})();
