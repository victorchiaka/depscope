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

## Contributing

1. Clone and create a feature branch:
```bash
git clone https://github.com/victorchiaka/depscope.git
git checkout -b feature/your-feature
```

2. Create a PR with:
   - Brief feature description
   - Short demo video/gif showing the feature in action
   - Ensure tests pass

## Development

```bash
go run ./cmd/depscope
go run ./cmd/depscope -port 8080
```

## License
MIT