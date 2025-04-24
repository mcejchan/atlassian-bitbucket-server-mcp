.PHONY: app-build app-clean app-rebuild docker-build docker-run docker-all rebuild help

# Hardcoded Docker image name
IMAGE_NAME = bitbucket-mcp-server

# Install dependencies including TypeScript and type definitions
install-deps:
	npm install
	npm install --save-dev typescript @types/node

# Build the application locally
app-build: install-deps
	npx tsc

# Clean the application build
app-clean:
	npm run clean

# Rebuild the application from scratch
app-rebuild: app-clean install-deps
	npm run filter-spec
	npm run generate
	npx tsc

# NEW: Rebuild everything from scratch (Clean, Deps, Generate, Build App, Build Docker)
rebuild:
	@echo "🧹 Cleaning artifacts (dist, src/generated, node_modules)..."
	-rm -rf dist src/generated node_modules
	@echo "📦 Installing dependencies..."
	npm install
	@echo "📄 Filtering OpenAPI spec..."
	npm run filter-spec
	@echo "⚙️ Generating code from OpenAPI spec..."
	npm run generate
	@echo "🏗️ Building application (TypeScript)..."
	npx tsc
	@echo "🐳 Building Docker image..."
	@if [ ! -d "dist" ]; then \
		echo "ERROR: 'dist' directory not found after build! Cannot build Docker image."; \
		exit 1; \
	fi
	docker build -t $(IMAGE_NAME) .
	@echo "✅ Rebuild complete."

# Build the Docker image
docker-build:
	@if [ ! -d "dist" ]; then \
		echo "ERROR: 'dist' directory not found!"; \
		echo "You must build the application before building the Docker image."; \
		echo "Run 'make app-build' or 'make app-rebuild' first."; \
		exit 1; \
	fi
	docker build -t $(IMAGE_NAME) .

# Build the application first, then build Docker image
docker-build-with-prebuild: app-rebuild docker-build

# Run the Docker container
docker-run:
	@if [ -f .env ]; then \
		echo "Loading environment variables from .env file"; \
		docker run --rm -i \
			--env-file .env \
			$(IMAGE_NAME); \
	else \
		echo "No .env file found. Using environment variables from command line."; \
		docker run --rm -i \
			-e ATLASSIAN_BITBUCKET_SERVER_URL \
			-e ATLASSIAN_BITBUCKET_ACCESS_TOKEN \
			$(IMAGE_NAME); \
	fi

# Build and run in one command
docker-all:
	@echo "Building Docker image..."
	@$(MAKE) docker-build
	@echo "Running Docker container..."
	@$(MAKE) docker-run

# Help command
help:
	@echo "Available targets:"
	@echo ""
	@echo "Application build targets:"
	@echo "  app-build       - Build the application locally"
	@echo "  app-clean       - Clean the application build"
	@echo "  app-rebuild     - Rebuild the application from scratch (including OpenAPI generation)"
	@echo ""
	@echo "Docker targets:"
	@echo "  docker-build    - Build the Docker image (requires dist/ folder to exist)"
	@echo "  docker-build-with-prebuild - Build app locally first, then Docker image"
	@echo "  docker-run      - Run the Docker container"
	@echo "  docker-all      - Build and run in one command"
	@echo ""
	@echo "Development targets:"
	@echo "  rebuild         - Clean all, install deps, generate, build app, build docker"
	@echo ""
	@echo "Environment variables:"
	@echo "  ATLASSIAN_BITBUCKET_SERVER_URL - Bitbucket server URL"
	@echo "  ATLASSIAN_BITBUCKET_ACCESS_TOKEN - Bitbucket access token"
	@echo ""
	@echo "Environment files:"
	@echo "  .env            - Will be loaded automatically if present"
	@echo ""
	@echo "Workflow:"
	@echo "  1. Run 'make app-build' to build the application"
	@echo "  2. Run 'make docker-build' to build the Docker image"
	@echo "  3. Run 'make docker-run' to run the container"
	@echo "  Or simply 'make docker-build-with-prebuild' to build everything in one step"
	@echo "  Or simply 'make rebuild' to rebuild everything from scratch"
	@echo ""
	@echo "Examples:"
	@echo "  make app-build"
	@echo "  make docker-build"
	@echo "  ATLASSIAN_BITBUCKET_SERVER_URL=https://git.example.com/ ATLASSIAN_BITBUCKET_ACCESS_TOKEN=abc123 make docker-run"
	@echo "  make docker-build-with-prebuild"
	@echo "  make rebuild" 