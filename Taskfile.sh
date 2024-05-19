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
  echo "Running prettier..."

  prettier \
    --write \
    "src/**/*.{js,jsx,ts,tsx,json,css,scss,md,mdx,yml,yaml,html}" \
    "tests/**/*.{js,jsx,ts,tsx,json,css,scss,md,mdx,yml,yaml,html}"
}

typecheck() {
  echo "Running tsc..."
  tsc --noEmit
}

lint() {
  echo "Running eslint..."
  eslint .
}

test() {
  echo "Running vitest..."
  vitest run
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
