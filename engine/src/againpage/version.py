from importlib.metadata import version

# Own version — single source of truth is pyproject.toml, read at runtime.
ENGINE_VERSION: str = version("againpage")

# Oldest reader build this engine tolerates. Hand-bumped only on a reader-
# breaking API change (like a package.json peerDependency).
MIN_READER_VERSION: str = "0.1.0"
