package parser

import (
	"encoding/json"
	"os"
	"testing"
)

func TestParseDependencies(t *testing.T) {
	// Test that ParseDependencies returns a valid graph
	graph, err := ParseDependencies()
	if err != nil {
		t.Fatalf("ParseDependencies() error = %v", err)
	}

	// Check that the graph is not nil
	if graph == nil {
		t.Fatal("ParseDependencies() returned nil graph")
	}

	// Check that Nodes map is initialized
	if graph.Nodes == nil {
		t.Error("graph.Nodes is nil")
	}

	// Check that Edges slice is initialized
	if graph.Edges == nil {
		t.Error("graph.Edges is nil")
	}

	// Verify at least one node exists (the main module)
	foundMain := false
	for _, node := range graph.Nodes {
		if node.Main {
			foundMain = true
			break
		}
	}
	if !foundMain {
		t.Error("No main module found in graph")
	}
}

func TestDependencyGraphToGraphJson(t *testing.T) {
	// Create a test graph
	graph := &DependencyGraph{
		Nodes: map[string]*Node{
			"test@v1.0.0": {
				Path:    "test",
				Version: "v1.0.0",
				Direct:  true,
				Main:    true,
			},
			"dep@v0.1.0": {
				Path:    "dep",
				Version: "v0.1.0",
				Direct:  false,
			},
		},
		Edges: [][2]string{
			{"test@v1.0.0", "dep@v0.1.0"},
		},
	}

	// Test ToGraphJson
	data, err := graph.ToGraphJson()
	if err != nil {
		t.Fatalf("ToGraphJson() error = %v", err)
	}

	// Verify JSON is valid
	var decoded DependencyGraph
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal JSON: %v", err)
	}

	// Verify content
	if len(decoded.Nodes) != 2 {
		t.Errorf("Expected 2 nodes, got %d", len(decoded.Nodes))
	}
	if len(decoded.Edges) != 1 {
		t.Errorf("Expected 1 edge, got %d", len(decoded.Edges))
	}
}

func TestParserInInvalidDirectory(t *testing.T) {
	// Create temporary directory
	tmpDir, err := os.MkdirTemp("", "parser_test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	// Change to temp directory
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(originalDir)

	// Try to parse dependencies in directory without Go module
	_, err = ParseDependencies()
	if err == nil {
		t.Error("Expected error when parsing dependencies in invalid directory")
	}
}

func TestNodeStructure(t *testing.T) {
	node := Node{
		Path:    "example.com/pkg",
		Version: "v1.0.0",
		Direct:  true,
		Main:    false,
		Dir:     "/path/to/pkg",
		GoMod:   "/path/to/pkg/go.mod",
		Replace: &Node{
			Path:    "example.com/pkg-fork",
			Version: "v1.0.1",
		},
	}

	// Test node fields
	if node.Path != "example.com/pkg" {
		t.Errorf("Expected Path to be 'example.com/pkg', got '%s'", node.Path)
	}
	if node.Version != "v1.0.0" {
		t.Errorf("Expected Version to be 'v1.0.0', got '%s'", node.Version)
	}
	if !node.Direct {
		t.Error("Expected Direct to be true")
	}
	if node.Main {
		t.Error("Expected Main to be false")
	}
	if node.Replace == nil {
		t.Error("Expected Replace to not be nil")
	}
	if node.Replace.Path != "example.com/pkg-fork" {
		t.Errorf("Expected Replace.Path to be 'example.com/pkg-fork', got '%s'", node.Replace.Path)
	}
}
