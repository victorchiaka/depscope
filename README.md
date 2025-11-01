# DepScope

A Go mod visualizer written in Go

## Install

```bash
go install github.com/victorchiaka/depscope/cmd/depscope@latest
```

## Usage

```bash
cd your-go-project
depscope
```

Open `http://localhost:4000` in your browser.

### Custom port

```bash
depscope -port 8080
```

## Development

```bash
go run ./cmd/depscope
go run ./cmd/depscope -port 8080
```

## License

MIT
