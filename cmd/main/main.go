package main

import (
	"github.com/victorchiaka/depscope/internal/server"
	"net/http"
)

func main() {
	// API endpoint - returns JSON
	http.HandleFunc("/api/graph", server.Root)

	// Serve the web page
	http.HandleFunc("/", server.Web)

	// Serve static files (CSS and JS)
	fs := http.FileServer(http.Dir("web"))
	http.Handle("/script.js", fs)
	http.Handle("/style.css", fs)

	http.ListenAndServe(":4000", nil)
}
