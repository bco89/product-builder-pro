#!/bin/bash
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"
exec /opt/homebrew/bin/npx -y @shopify/dev-mcp@latest "$@" 