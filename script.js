async function loadTree() {
  const data = await fetch("data.json").then(r => r.json());
  const treeContainer = document.querySelector(".tree");
  const canvas = document.getElementById("lines");
  const ctx = canvas.getContext("2d");
  const crafted = JSON.parse(localStorage.getItem("craftedItems") || "[]");

  // --- Infer "pre" relationships from "post" ---
  const nameToItem = Object.fromEntries(data.map(x => [x.name, x]));
  data.forEach(item => {
    if (!item.post) item.post = [];
  });
  data.forEach(item => {
    item.post.forEach(childName => {
      const child = nameToItem[childName];
      if (child) {
        child.pre = child.pre || [];
        if (!child.pre.includes(item.name)) {
          child.pre.push(item.name);
        }
      }
    });
  });
  data.forEach(item => {
    if (!item.pre) item.pre = [];
  });

  // --- find roots ---
  const roots = data.filter(n => n.pre.length === 0);

  const positions = new Map();
  const branches = [];
  let currentRow = 0;

  function placeBranch(node, col = 0, row = currentRow) {
    if (!positions.has(node.name)) {
      positions.set(node.name, { row, col });
      currentRow = Math.max(currentRow, row + 1);
    }

    node.post.forEach((childName, i) => {
      const child = nameToItem[childName];
      if (!child) return;
      const parentPos = positions.get(node.name);
      const nextRow = i === 0 ? parentPos.row : currentRow++;
      const nextCol = parentPos.col + 1;
      branches.push([node.name, child.name]);
      placeBranch(child, nextCol, nextRow);
    });
  }

  roots.forEach(root => placeBranch(root));

  const numRows = Math.max(...Array.from(positions.values()).map(p => p.row)) + 1;
  const numCols = Math.max(...Array.from(positions.values()).map(p => p.col)) + 1;

  treeContainer.style.display = "grid";
  treeContainer.style.gridTemplateColumns = `repeat(${numCols}, 160px)`;
  treeContainer.style.gridTemplateRows = `repeat(${numRows}, 40px)`;
  treeContainer.style.gap = "4px 40px";
  treeContainer.style.position = "relative";

  const nodeElements = {};
  data.forEach(node => {
    const pos = positions.get(node.name);
    if (!pos) return;

    const el = document.createElement("div");
    el.className = "item";
    if (crafted.includes(node.name)) el.classList.add("crafted");
    el.style.gridColumn = pos.col + 1;
    el.style.gridRow = pos.row + 1;

    el.innerHTML = `
      <input type="checkbox" class="checkbox" ${crafted.includes(node.name) ? "checked" : ""}>
      <span>${node.name}</span>
    `;

    const checkbox = el.querySelector(".checkbox");
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        el.classList.add("crafted");
        if (!crafted.includes(node.name)) crafted.push(node.name);
      } else {
        el.classList.remove("crafted");
        const i = crafted.indexOf(node.name);
        if (i >= 0) crafted.splice(i, 1);
      }
      localStorage.setItem("craftedItems", JSON.stringify(crafted));
    });

    el.addEventListener("click", e => {
      if (e.target.tagName !== "INPUT") {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event("change"));
      }
    });

    treeContainer.appendChild(el);
    nodeElements[node.name] = el;
  });

  // --- Resize canvas to match container and layer behind ---
  const rect = treeContainer.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.zIndex = "0";
  treeContainer.appendChild(canvas);

  // --- draw connections ---
  requestAnimationFrame(() => drawConnections(branches, nodeElements, ctx, treeContainer));
}

function drawConnections(branches, nodeElements, ctx, container) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.strokeStyle = "#777";
  ctx.lineWidth = 2;

  const containerRect = container.getBoundingClientRect();

  branches.forEach(([from, to]) => {
    const a = nodeElements[from];
    const b = nodeElements[to];
    if (!a || !b) return;

    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();

    // positions relative to container
    const x1 = ra.right - containerRect.left;
    const y1 = ra.top + ra.height / 2 - containerRect.top;
    const x2 = rb.left - containerRect.left;
    const y2 = rb.top + rb.height / 2 - containerRect.top;

    const midX = (x1 + x2) / 2;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(midX, y1);
    ctx.lineTo(midX, y2);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
}

loadTree();

// --- Clear progress button ---
document.getElementById("clearStorage").addEventListener("click", () => {
  if (confirm("Clear all crafted progress?")) {
    localStorage.removeItem("craftedItems");
    document.querySelectorAll(".item").forEach(el => {
      el.classList.remove("crafted");
      el.querySelector(".checkbox").checked = false;
    });
  }
});
