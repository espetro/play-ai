# Contributing to Play AI

Thank you for your interest in contributing!

## Development Guidelines

Before making changes, please read the [Development Guidelines](docs/dev-guidelines.md). It covers:

- **Design System Rules** - Component hierarchy, no-use-effect rule, hooks policy
- **Component Workflow** - How to create and modify components
- **Naming Conventions** - File names, exports, message handlers
- **TypeScript Patterns** - Using WXT browser global, type-only imports
- **Extension Development** - Dev server, testing, state management
- **Release Workflow** - Versioning, changesets, GitHub Actions release process

## Quick Start

```bash
# Install dependencies
bun install

# Start dev server
bun turbo dev

# Run tests
bun turbo test

# Lint and format
bun turbo lint
bun turbo format
```

## Creating Changes

For changes that should appear in release notes, use Changesets:

```bash
# Create a changeset describing your change
bun run changeset

# When ready to release, bump versions
bun run version
```

See the [Release Workflow](docs/dev-guidelines.md#release-workflow) section for full details.

## Commit Messages

This project follows conventional commits. Keep messages clear and descriptive:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `refactor:` - Code refactoring

## Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `bun turbo check` to verify types and lint
5. Submit a pull request

## Questions?

Open an issue for bugs, feature requests, or questions.
