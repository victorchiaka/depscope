package main

import (
	"log"
	"net/http"

	"github.com/victorchiaka/depscope/internal/server"
)

func main() {
	http.HandleFunc("/", server.Root)
	log.Println("Server listening on :1010")
	log.Fatal(http.ListenAndServe(":4000", nil))
}
