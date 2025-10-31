package server

import (
	"net/http"

	"github.com/victorchiaka/depscope/internal/parser"
)

func Root(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	dependencyGraph, err := parser.ParseDependencies()
	if err != nil {
		http.Error(w, "Failed to parse dependencies: "+err.Error(), http.StatusInternalServerError)
		return
	}

	graphJson, err := dependencyGraph.ToGraphJson()
	if err != nil {
		http.Error(w, "Failed to marshal JSON: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(graphJson)
}
