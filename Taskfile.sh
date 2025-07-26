#!/bin/bash

set -e
PATH=./node_modules/.bin:$PATH

# //////////////////////////////////////////////////////////////////////////////
# START tasks

start_dev() {
  echo "Not implemented. Test package via vitest (unit tests)"
}

build() {
  echo "Building..."
  rm -rf dist
  vite build
}

format() {
  echo "Running biome..."

  biome check \
    --formatter-enabled=true \
		--assist-enabled=true \
    --linter-enabled=false \
    --write \
    ./src ./tests $*
}

lint() {
  echo "Running biome..."
  # NOTE: Use --fix to auto-fix linting errors
	biome lint \
		./src ./tests $*
}

typecheck() {
  echo "Running tsc..."
  tsc --noEmit
}

test() {
  if [ "$1" = "-w" ] || [ "$1" = "--watch" ]; then
    echo "Running vitest in watch mode..."
    vitest
    return
  else
    echo "Running vitest..."
    vitest run
  fi
}

validate() {
  typecheck
  lint
  test
}

clean() {
  rm -rf node_modules dist
}

help() {
  echo "Usage: $0 <command>"
  echo
  echo "Commands:"
  echo "  start_dev   Start development server"
  echo "  build       Build for production"
  echo "  format      Format code"
  echo "  typecheck   Typecheck code"
  echo "  lint        Lint code"
  echo "  test        Run tests"
  echo "  validate    Validate code"
  echo "  clean       Clean temporary files/directories"
  echo "  help        Show help"
  echo
}

# END tasks
# //////////////////////////////////////////////////////////////////////////////

${@:-help}
