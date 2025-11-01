package parser

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
)

type Node struct {
	Path    string `json:"path"` // module path
	Version string `json:"version"`
	Direct  bool   `json:"direct"` // true if it's a direct dependency
	Main    bool   `json:"main"`   // true if this is the main module
	Dir     string `json:"dir"`
	GoMod   string `json:"gomod"`      // path to go.mod
	Replace *Node  `json:",omitempty"` // replacement module
}

type DependencyGraph struct {
	Nodes map[string]*Node `json:"nodes"`
	Edges [][2]string      `json:"edges"` // [parent, child] {"depA (parent)", "depB (child)"}
}

func ParseDependencies() (*DependencyGraph, error) {
	graph := &DependencyGraph{
		Nodes: make(map[string]*Node),
		Edges: [][2]string{},
	}

	// Get all modules
	cmd := exec.Command("go", "list", "-json", "-m", "all")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("go list error: %w", err)
	}

	// Parse modules
	decoder := json.NewDecoder(strings.NewReader(string(output)))
	for decoder.More() {
		var node Node
		if err := decoder.Decode(&node); err != nil {
			return nil, fmt.Errorf("json decode error: %w", err)
		}

		nodeID := node.Path
		if node.Version != "" {
			nodeID = node.Path + "@" + node.Version
		}

		graph.Nodes[nodeID] = &node
	}

	// Get dependency edges
	cmd = exec.Command("go", "mod", "graph")
	output, err = cmd.Output()
	if err != nil {
		return graph, nil
	}

	scanner := bufio.NewScanner(strings.NewReader(string(output)))
	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.Fields(line)
		if len(parts) == 2 {
			graph.Edges = append(graph.Edges, [2]string{parts[0], parts[1]})
		}
	}

	return graph, nil
}

func (g *DependencyGraph) ToGraphJson() ([]byte, error) {
	if data, err := json.MarshalIndent(g, "", ""); err != nil {
		return []byte("{}"), err
	} else {
		return data, nil
	}
}
