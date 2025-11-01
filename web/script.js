let graphData = null;
let isHierarchical = false;
let currentNodes = null;
let currentLabels = null;
let currentLinks = null;
let currentFilter = "all";

(async () => {
  try {
    const response = await fetch("/api/graph");
    const data = await response.json();
    console.log("Fetched data:", data);

    graphData = data;
    renderGraph(data, isHierarchical);
    
    // Setup layout toggle button
    document.getElementById("layoutToggle").addEventListener("click", () => {
      isHierarchical = !isHierarchical;
      document.getElementById("layoutToggle").textContent = 
        isHierarchical ? "Force Layout" : "Organize Look";
      renderGraph(graphData, isHierarchical);
    });
    
    // Setup search functionality
    document.getElementById("search").addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      handleSearch(searchTerm);
    });
    
    // Setup filter functionality
    document.getElementById("filter").addEventListener("change", (e) => {
      currentFilter = e.target.value;
      renderGraph(graphData, isHierarchical);
      // Re-apply search if there's an active search term
      const searchTerm = document.getElementById("search").value.toLowerCase().trim();
      if (searchTerm) {
        handleSearch(searchTerm);
      }
    });

    // Responsive: re-render on resize (debounced)
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        renderGraph(graphData, isHierarchical);
        const searchTerm = document.getElementById("search").value.toLowerCase().trim();
        if (searchTerm) {
          handleSearch(searchTerm);
        }
      }, 150);
    });
  } catch (error) {
    console.error("Error:", error);
    document.getElementById("graph").innerHTML = `<p>Error loading graph</p>`;
  }
})();

function renderGraph(data, hierarchical = false) {
  try {
    console.log("Starting renderGraph with data:", data);
    
    // Get container dimensions instead of window
    const container = document.getElementById('graph');
    const width = Math.max(container.clientWidth, 300); // Ensure minimum width
    const height = Math.max(container.clientHeight, 400); // Ensure minimum height

    // Clear previous graph
    d3.select("#graph").html("");

    // Create SVG and a root group to translate content
    const svg = d3
      .select("#graph")
      .append("svg")
      .attr("width", width)
      .attr("height", height);
    const rootG = svg.append("g");

    // Prepare nodes and apply filter
    let nodes = Object.keys(data.nodes).map((id) => ({
      id: id,
      ...data.nodes[id],
    }));
    
    // Apply filter
    if (currentFilter === "direct") {
      nodes = nodes.filter(node => node.direct === true || node.main === true);
    } else if (currentFilter === "indirect") {
      nodes = nodes.filter(node => node.direct === false && node.main !== true);
    }
    
    console.log("Nodes prepared:", nodes.length, "with filter:", currentFilter);
    console.log("Sample node IDs:", nodes.slice(0, 3).map(n => n.id));

    // Create a set of valid node IDs for quick lookup
    const nodeIds = new Set(nodes.map(n => n.id));
    
    // Filter links to only include those where both nodes exist
    const links = data.edges
      .filter((edge) => {
        const sourceExists = nodeIds.has(edge[0]);
        const targetExists = nodeIds.has(edge[1]);
        
        if (!sourceExists || !targetExists) {
          console.warn("Skipping edge - missing node:", edge);
        }
        
        return sourceExists && targetExists;
      })
      .map((edge) => ({
        source: edge[0],
        target: edge[1],
      }));
    
    console.log("Links prepared:", links.length, "out of", data.edges.length);
    console.log("Sample links:", links.slice(0, 3));

  // Drag functionality
  function drag(simulation) {
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3
      .drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  // Create force simulation with different settings based on layout
  let simulation;
  
  if (hierarchical) {
    // Calculate hierarchical positions
    const layers = assignNodesToLayers(nodes, links);
    const maxLayer = Math.max(...Object.values(layers));
    
    // Assign fixed positions for hierarchical layout
    const layerNodes = {};
    nodes.forEach(node => {
      const layer = layers[node.id] || 0;
      if (!layerNodes[layer]) layerNodes[layer] = [];
      layerNodes[layer].push(node);
    });
    
    // Position nodes in layers
    Object.keys(layerNodes).forEach(layer => {
      const nodesInLayer = layerNodes[layer];
      const layerHeight = height / (nodesInLayer.length + 1);
      const layerX = (parseInt(layer) * width / (maxLayer + 1)) + 100;
      
      nodesInLayer.forEach((node, i) => {
        node.fx = layerX;
        node.fy = (i + 1) * layerHeight;
      });
    });
    
    // Minimal simulation to settle the layout
    simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(200)
          .strength(0.1),
      )
      .force("charge", d3.forceManyBody().strength(-50))
      .force("collision", d3.forceCollide().radius(30))
      .alphaDecay(0.05);
  } else {
    // Standard force-directed layout
    simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(100),
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));
  }

  // Draw links - use path for curved lines in hierarchical mode
  const link = rootG
    .append("g")
    .selectAll(hierarchical ? "path" : "line")
    .data(links)
    .join(hierarchical ? "path" : "line")
    .attr("stroke", "#999")
    .attr("stroke-width", 1)
    .attr("fill", "none");

  // Draw nodes
  const node = rootG
    .append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", 6)
    .attr("fill", () => `hsl(${Math.random() * 360}, 70%, 60%)`)
    .call(drag(simulation));

  // Create tooltip div
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid #ddd")
    .style("border-radius", "4px")
    .style("padding", "8px 12px")
    .style("box-shadow", "0 2px 6px rgba(0,0,0,0.1)")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("max-width", "300px");

  // Add hover effects to nodes
  node
    .on("mouseover", function(event, d) {
      // Highlight connected nodes
      const connectedNodes = new Set();
      links.forEach(link => {
        if (link.source.id === d.id) connectedNodes.add(link.target.id);
        if (link.target.id === d.id) connectedNodes.add(link.source.id);
      });
      
      node.style("opacity", n => 
        n.id === d.id || connectedNodes.has(n.id) ? 1 : 0.2
      );
      link.style("opacity", l => 
        l.source.id === d.id || l.target.id === d.id ? 1 : 0.1
      );
      label.style("opacity", n => 
        n.id === d.id || connectedNodes.has(n.id) ? 1 : 0.2
      );
      
      // Show tooltip with node details
      const tooltipHtml = `
        <div><strong>${d.path}</strong></div>
        <div>Version: ${d.version || 'N/A'}</div>
        <div>Type: ${d.main ? 'Main Module' : d.direct ? 'Direct' : 'Indirect'}</div>
        <div>Directory: ${d.dir || 'N/A'}</div>
        <div>go.mod: ${d.GoMod || 'N/A'}</div>
        ${d.Replace ? `<div>Replaces: ${d.Replace.path}${d.Replace.version ? ' ' + d.Replace.version : ''}</div>` : ''}
      `;
      
      tooltip
        .html(tooltipHtml)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .transition()
        .duration(200)
        .style("opacity", 1);
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", function() {
      // Reset opacity for all elements
      node.style("opacity", 1);
      link.style("opacity", 1);
      label.style("opacity", 1);
      
      // Hide tooltip
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });

  // Add labels
  const label = rootG
    .append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .text((d) => d.path)
    .attr("font-size", 10)
    .attr("dx", 10)
    .attr("dy", 4);
  
  // Store references for search functionality
  currentNodes = node;
  currentLabels = label;
  currentLinks = link;

  // Update positions on tick
  simulation.on("tick", () => {
    // Resize SVG to fit content and translate group so origin is padded
    const PADDING = 40;
    const minX = d3.min(nodes, d => d.x) ?? 0;
    const maxX = d3.max(nodes, d => d.x) ?? width;
    const minY = d3.min(nodes, d => d.y) ?? 0;
    const maxY = d3.max(nodes, d => d.y) ?? height;
    const contentW = Math.max(0, maxX - minX) + PADDING;
    const contentH = Math.max(0, maxY - minY) + PADDING;
    svg
      .attr("width", Math.max(width, contentW))
      .attr("height", Math.max(height, contentH));
    rootG.attr("transform", `translate(${Math.max(0, -minX + PADDING / 2)}, ${Math.max(0, -minY + PADDING / 2)})`);
    if (hierarchical) {
      // Curved paths for hierarchical layout
      link.attr("d", (d) => {
        const sourceX = d.source.x;
        const sourceY = d.source.y;
        const targetX = d.target.x;
        const targetY = d.target.y;
        
        // Calculate control points for bezier curve
        const midX = (sourceX + targetX) / 2;
        
        // Create smooth bezier curve
        return `M ${sourceX},${sourceY} C ${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`;
      });
    } else {
      // Straight lines for force layout
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
    }

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

    label.attr("x", (d) => d.x).attr("y", (d) => d.y);
  });
  
  console.log("Graph rendered successfully!");
  
  } catch (error) {
    console.error("Error in renderGraph:", error);
    document.getElementById("graph").innerHTML = 
      `<p>Rendering error: ${error.message}</p>`;
    throw error;
  }
}

// Assign nodes to layers based on dependency hierarchy
function assignNodesToLayers(nodes, links) {
  const layers = {};
  const inDegree = {};
  const outEdges = {};
  
  // Initialize
  nodes.forEach(node => {
    inDegree[node.id] = 0;
    outEdges[node.id] = [];
  });
  
  // Build graph
  links.forEach(link => {
    const source = typeof link.source === 'object' ? link.source.id : link.source;
    const target = typeof link.target === 'object' ? link.target.id : link.target;
    
    if (inDegree[target] !== undefined) {
      inDegree[target]++;
    }
    if (outEdges[source]) {
      outEdges[source].push(target);
    }
  });
  
  // Find root nodes (no incoming edges)
  const queue = [];
  nodes.forEach(node => {
    if (inDegree[node.id] === 0) {
      queue.push(node.id);
      layers[node.id] = 0;
    }
  });
  
  // BFS to assign layers
  while (queue.length > 0) {
    const nodeId = queue.shift();
    const currentLayer = layers[nodeId];
    
    outEdges[nodeId].forEach(targetId => {
      if (inDegree[targetId] !== undefined) {
        inDegree[targetId]--;
        
        // Update layer to be max of all incoming edges + 1
        if (layers[targetId] === undefined) {
          layers[targetId] = currentLayer + 1;
        } else {
          layers[targetId] = Math.max(layers[targetId], currentLayer + 1);
        }
        
        if (inDegree[targetId] === 0) {
          queue.push(targetId);
        }
      }
    });
  }
  
  // Assign remaining nodes (cycles or disconnected) to layer 0
  nodes.forEach(node => {
    if (layers[node.id] === undefined) {
      layers[node.id] = 0;
    }
  });
  
  return layers;
}

// Handle search functionality
function handleSearch(searchTerm) {
  if (!currentNodes || !currentLabels || !currentLinks) {
    return;
  }
  
  if (!searchTerm) {
    // Reset all to normal state
    currentNodes
      .attr("opacity", 1)
      .attr("r", 6)
      .attr("stroke", "none")
      .attr("stroke-width", 0);
    
    currentLabels
      .attr("opacity", 1)
      .attr("font-weight", "normal");
    
    currentLinks
      .attr("opacity", 0.6)
      .attr("stroke", "#999");
    
    return;
  }
  
  // Find matching nodes
  const matchingNodeIds = new Set();
  currentNodes.each(function(d) {
    if (d.path.toLowerCase().includes(searchTerm) || 
        d.id.toLowerCase().includes(searchTerm)) {
      matchingNodeIds.add(d.id);
    }
  });
  
  // Find connected nodes
  const connectedNodeIds = new Set(matchingNodeIds);
  currentLinks.each(function(d) {
    const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
    const targetId = typeof d.target === 'object' ? d.target.id : d.target;
    
    if (matchingNodeIds.has(sourceId)) {
      connectedNodeIds.add(targetId);
    }
    if (matchingNodeIds.has(targetId)) {
      connectedNodeIds.add(sourceId);
    }
  });
  
  // Update node appearance
  currentNodes
    .attr("opacity", d => matchingNodeIds.has(d.id) ? 1 : (connectedNodeIds.has(d.id) ? 0.5 : 0.1))
    .attr("r", d => matchingNodeIds.has(d.id) ? 10 : 6)
    .attr("stroke", d => matchingNodeIds.has(d.id) ? "#ff6b6b" : "none")
    .attr("stroke-width", d => matchingNodeIds.has(d.id) ? 3 : 0);
  
  // Update label appearance
  currentLabels
    .attr("opacity", d => matchingNodeIds.has(d.id) ? 1 : (connectedNodeIds.has(d.id) ? 0.5 : 0.1))
    .attr("font-weight", d => matchingNodeIds.has(d.id) ? "bold" : "normal");
  
  // Update link appearance
  currentLinks
    .attr("opacity", function(d) {
      const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
      const targetId = typeof d.target === 'object' ? d.target.id : d.target;
      
      if (matchingNodeIds.has(sourceId) || matchingNodeIds.has(targetId)) {
        return 1;
      }
      if (connectedNodeIds.has(sourceId) && connectedNodeIds.has(targetId)) {
        return 0.3;
      }
      return 0.05;
    })
    .attr("stroke", function(d) {
      const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
      const targetId = typeof d.target === 'object' ? d.target.id : d.target;
      
      if (matchingNodeIds.has(sourceId) || matchingNodeIds.has(targetId)) {
        return "#ff6b6b";
      }
      return "#999";
    });
}
