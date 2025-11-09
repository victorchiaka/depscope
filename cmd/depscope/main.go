// package main
//
// import (
// 	"flag"
// 	"fmt"
// 	"log"
// 	"net/http"
//
// 	"github.com/victorchiaka/depscope/internal/server"
// )
//
// func main() {
// 	port := flag.String("port", "4000", "Port to run server on")
// 	flag.Parse()
//
// 	// Serve static files
// 	fs := http.FileServer(http.Dir("web"))
// 	http.Handle("/script.js", fs)
// 	http.Handle("/style.css", fs)
//
// 	// API endpoint
// 	http.HandleFunc("/api/graph", server.Root)
//
// 	// Web page
// 	http.HandleFunc("/", server.Web)
//
// 	addr := ":" + *port
// 	fmt.Printf("🔍 Depscope running at http://localhost%s\n", addr)
// 	log.Fatal(http.ListenAndServe(addr, nil))
// }

package main

import (
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"

	"github.com/victorchiaka/depscope"
	"github.com/victorchiaka/depscope/internal/server"
)

func main() {
	port := flag.String("port", "4000", "Port to run server on")
	flag.Parse()

	webFiles, err := fs.Sub(depscope.WebFS, "web")
	if err != nil {
		log.Fatal("Failed to load web files:", err)
	}

	http.Handle("/script.js", http.FileServer(http.FS(webFiles)))
	http.Handle("/style.css", http.FileServer(http.FS(webFiles)))
	http.HandleFunc("/api/graph", server.Root)
	http.Handle("/", http.FileServer(http.FS(webFiles)))

	addr := ":" + *port
	fmt.Printf("🔍 DepScope running at http://localhost%s\n", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}
