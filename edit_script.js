let data = [];

window.addEventListener("DOMContentLoaded", loadJson);
document.getElementById("downloadBtn").addEventListener("click", downloadJson);

async function loadJson() {
  try {
    const response = await fetch("data.json");
    if (!response.ok) throw new Error("Failed to load data.json");
    data = await response.json();
    renderGrid();
    document.getElementById("downloadBtn").style.display = "inline-block";
  } catch (err) {
    alert("Error loading data.json: " + err.message);
  }
}

function renderGrid() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  data.forEach((entry, index) => {
    const box = document.createElement("div");
    box.className = "box";

    // Editable entry name
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = entry.name;
    titleInput.className = "title-input";
    titleInput.addEventListener("change", (e) => {
      const oldName = entry.name;
      const newName = e.target.value.trim();
      if (!newName) {
        alert("Name cannot be empty!");
        e.target.value = oldName;
        return;
      }

      entry.name = newName;
      handleRename(oldName, newName);
      cleanupInvalidReferences();
      renderGrid();
    });
    box.appendChild(titleInput);

    const count = document.createElement("p");
    count.textContent = `Posts: ${entry.post.length}`;
    box.appendChild(count);

    // Posts: display only
    const postList = document.createElement("ul");
    entry.post.forEach((p) => {
      const li = document.createElement("li");
      li.textContent = p;
      postList.appendChild(li);
    });
    box.appendChild(postList);

    grid.appendChild(box);
  });
}

// Rename propagation
function handleRename(oldName, newName) {
  data.forEach((entry) => {
    entry.post = entry.post.map((ref) => (ref === oldName ? newName : ref));
  });
}

// Remove references to non-existent names
function cleanupInvalidReferences() {
  const validNames = new Set(data.map((e) => e.name));
  data.forEach((entry) => {
    entry.post = entry.post.filter((ref) => validNames.has(ref));
  });
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.json";
  a.click();
  URL.revokeObjectURL(url);
}
