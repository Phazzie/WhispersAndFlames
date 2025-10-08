{
    "mcpServers": {
        "digitalocean": {
            "command": "npx",
            "args": [
                "@digitalocean/mcp",
                "--",
                "-services",
                "apps,droplets"
            ],
            "env": {
                "DIGITALOCEAN_API_TOKEN": "-"
            }
        }
    }
}



DIGITALOCEAN_API_TOKEN=your_token_here npx @digitalocean/mcp -- -services apps,droplets

npx @digitalocean/mcp -- -services apps,droplets --digitalocean-api-token ""

npx @digitalocean/mcp -- -services apps,doks
