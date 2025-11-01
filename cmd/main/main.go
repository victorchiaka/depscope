package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"

	"github.com/victorchiaka/depscope/internal/server"
)

func main() {
	port := flag.String("port", "4000", "Port to run server on")
	flag.Parse()

	// Serve static files
	fs := http.FileServer(http.Dir("web"))
	http.Handle("/script.js", fs)
	http.Handle("/style.css", fs)

	// API endpoint
	http.HandleFunc("/api/graph", server.Root)

	// Web page
	http.HandleFunc("/", server.Web)

	addr := ":" + *port
	fmt.Printf("🔍 Depscope running at http://localhost%s\n", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}
