---
name: suggest-awesome-github-copilot-agents
description: Suggest relevant GitHub Copilot Custom Agents files from the awesome-copilot repository based on current repository context and chat history, avoiding duplicates with existing custom agents in this repository, and identifying outdated agents that need updates.
---

# Suggest Awesome GitHub Copilot Custom Agents
Analyze current repository context and suggest relevant Custom Agents files from the GitHub awesome-copilot repository that are not already available in this repository. Custom Agent files are located in the agents folder of the awesome-copilot repository.

Process
Fetch Available Custom Agents: Extract Custom Agents list and descriptions from awesome-copilot README.agents.md. Must use fetch tool.
Scan Local Custom Agents: Discover existing custom agent files in .github/agents/ folder
Extract Descriptions: Read front matter from local custom agent files to get descriptions
Fetch Remote Versions: For each local agent, fetch the corresponding version from awesome-copilot repository using raw GitHub URLs (e.g., https://raw.githubusercontent.com/github/awesome-copilot/main/agents/<filename>)
Compare Versions: Compare local agent content with remote versions to identify:
Agents that are up-to-date (exact match)
Agents that are outdated (content differs)
Key differences in outdated agents (tools, description, content)
Analyze Context: Review chat history, repository files, and current project needs
Match Relevance: Compare available custom agents against identified patterns and requirements
Present Options: Display relevant custom agents with descriptions, rationale, and availability status including outdated agents
Validate: Ensure suggested agents would add value not already covered by existing agents
Output: Provide structured table with suggestions, descriptions, and links to both awesome-copilot custom agents and similar local custom agents AWAIT user request to proceed with installation or updates of specific custom agents. DO NOT INSTALL OR UPDATE UNLESS DIRECTED TO DO SO.
Download/Update Assets: For requested agents, automatically:
Download new agents to .github/agents/ folder
Update outdated agents by replacing with latest version from awesome-copilot
Do NOT adjust content of the files
Use #fetch tool to download assets, but may use curl using #runInTerminal tool to ensure all content is retrieved
Use #todos tool to track progress
Context Analysis Criteria
🔍 Repository Patterns:

Programming languages used (.cs, .js, .py, etc.)
Framework indicators (ASP.NET, React, Azure, etc.)
Project types (web apps, APIs, libraries, tools)
Documentation needs (README, specs, ADRs)
🗨️ Chat History Context:

Recent discussions and pain points
Feature requests or implementation needs
Code review patterns
Development workflow requirements
Output Format
Display analysis results in structured table comparing awesome-copilot custom agents with existing repository custom agents:

Awesome-Copilot Custom Agent	Description	Already Installed	Similar Local Custom Agent	Suggestion Rationale
amplitude-experiment-implementation.agent.md	This custom agent uses Amplitude's MCP tools to deploy new experiments inside of Amplitude, enabling seamless variant testing capabilities and rollout of product features	❌ No	None	Would enhance experimentation capabilities within the product
launchdarkly-flag-cleanup.agent.md	Feature flag cleanup agent for LaunchDarkly	✅ Yes	launchdarkly-flag-cleanup.agent.md	Already covered by existing LaunchDarkly custom agents
principal-software-engineer.agent.md	Provide principal-level software engineering guidance with focus on engineering excellence, technical leadership, and pragmatic implementation.	⚠️ Outdated	principal-software-engineer.agent.md	Tools configuration differs: remote uses 'web/fetch' vs local 'fetch' - Update recommended
Local Agent Discovery Process
List all *.agent.md files in .github/agents/ directory
For each discovered file, read front matter to extract description
Build comprehensive inventory of existing agents
Use this inventory to avoid suggesting duplicates
Version Comparison Process
For each local agent file, construct the raw GitHub URL to fetch the remote version:
Pattern: https://raw.githubusercontent.com/github/awesome-copilot/main/agents/<filename>
Fetch the remote version using the fetch tool
Compare entire file content (including front matter, tools array, and body)
Identify specific differences:
Front matter changes (description, tools)
Tools array modifications (added, removed, or renamed tools)
Content updates (instructions, examples, guidelines)
Document key differences for outdated agents
Calculate similarity to determine if update is needed
Requirements
Use githubRepo tool to get content from awesome-copilot repository agents folder
Scan local file system for existing agents in .github/agents/ directory
Read YAML front matter from local agent files to extract descriptions
Compare local agents with remote versions to detect outdated agents
Compare against existing agents in this repository to avoid duplicates
Focus on gaps in current agent library coverage
Validate that suggested agents align with repository's purpose and standards
Provide clear rationale for each suggestion
Include links to both awesome-copilot agents and similar local agents
Clearly identify outdated agents with specific differences noted
Don't provide any additional information or context beyond the table and the analysis
Icons Reference
✅ Already installed and up-to-date
⚠️ Installed but outdated (update available)
❌ Not installed in repo
Update Handling
When outdated agents are identified:

Include them in the output table with ⚠️ status
Document specific differences in the "Suggestion Rationale" column
Provide recommendation to update with key changes noted
When user requests update, replace entire local file with remote version
Preserve file location in .github/agents/ directory





---
name: suggest-awesome-github-copilot-instructions
description: 'Suggest relevant GitHub Copilot instruction files from the awesome-copilot repository based on current repository context and chat history, avoiding duplicates with existing instructions in this repository, and identifying outdated instructions that need updates.'
---

# Suggest Awesome GitHub Copilot Instructions

Analyze current repository context and suggest relevant copilot-instruction files from the [GitHub awesome-copilot repository](https://github.com/github/awesome-copilot/blob/main/docs/README.instructions.md) that are not already available in this repository.

## Process

1. **Fetch Available Instructions**: Extract instruction list and descriptions from [awesome-copilot README.instructions.md](https://github.com/github/awesome-copilot/blob/main/docs/README.instructions.md). Must use `#fetch` tool.
2. **Scan Local Instructions**: Discover existing instruction files in `.github/instructions/` folder
3. **Extract Descriptions**: Read front matter from local instruction files to get descriptions and `applyTo` patterns
4. **Fetch Remote Versions**: For each local instruction, fetch the corresponding version from awesome-copilot repository using raw GitHub URLs (e.g., `https://raw.githubusercontent.com/github/awesome-copilot/main/instructions/<filename>`)
5. **Compare Versions**: Compare local instruction content with remote versions to identify:
   - Instructions that are up-to-date (exact match)
   - Instructions that are outdated (content differs)
   - Key differences in outdated instructions (description, applyTo patterns, content)
6. **Analyze Context**: Review chat history, repository files, and current project needs
7. **Compare Existing**: Check against instructions already available in this repository
8. **Match Relevance**: Compare available instructions against identified patterns and requirements
9. **Present Options**: Display relevant instructions with descriptions, rationale, and availability status including outdated instructions
10. **Validate**: Ensure suggested instructions would add value not already covered by existing instructions
11. **Output**: Provide structured table with suggestions, descriptions, and links to both awesome-copilot instructions and similar local instructions
   **AWAIT** user request to proceed with installation or updates of specific instructions. DO NOT INSTALL OR UPDATE UNLESS DIRECTED TO DO SO.
12. **Download/Update Assets**: For requested instructions, automatically:
    - Download new instructions to `.github/instructions/` folder
    - Update outdated instructions by replacing with latest version from awesome-copilot
    - Do NOT adjust content of the files
    - Use `#fetch` tool to download assets, but may use `curl` using `#runInTerminal` tool to ensure all content is retrieved
    - Use `#todos` tool to track progress

## Context Analysis Criteria

🔍 **Repository Patterns**:
- Programming languages used (.cs, .js, .py, .ts, etc.)
- Framework indicators (ASP.NET, React, Azure, Next.js, etc.)
- Project types (web apps, APIs, libraries, tools)
- Development workflow requirements (testing, CI/CD, deployment)

🗨️ **Chat History Context**:
- Recent discussions and pain points
- Technology-specific questions
- Coding standards discussions
- Development workflow requirements

## Output Format

Display analysis results in structured table comparing awesome-copilot instructions with existing repository instructions:

| Awesome-Copilot Instruction | Description | Already Installed | Similar Local Instruction | Suggestion Rationale |
|------------------------------|-------------|-------------------|---------------------------|---------------------|
| [blazor.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/blazor.instructions.md) | Blazor development guidelines | ✅ Yes | blazor.instructions.md | Already covered by existing Blazor instructions |
| [reactjs.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/reactjs.instructions.md) | ReactJS development standards | ❌ No | None | Would enhance React development with established patterns |
| [java.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/java.instructions.md) | Java development best practices | ⚠️ Outdated | java.instructions.md | applyTo pattern differs: remote uses `'**/*.java'` vs local `'*.java'` - Update recommended |

## Local Instructions Discovery Process

1. List all `*.instructions.md` files in the `instructions/` directory
2. For each discovered file, read front matter to extract `description` and `applyTo` patterns
3. Build comprehensive inventory of existing instructions with their applicable file patterns
4. Use this inventory to avoid suggesting duplicates

## Version Comparison Process

1. For each local instruction file, construct the raw GitHub URL to fetch the remote version:
   - Pattern: `https://raw.githubusercontent.com/github/awesome-copilot/main/instructions/<filename>`
2. Fetch the remote version using the `#fetch` tool
3. Compare entire file content (including front matter and body)
4. Identify specific differences:
   - **Front matter changes** (description, applyTo patterns)
   - **Content updates** (guidelines, examples, best practices)
5. Document key differences for outdated instructions
6. Calculate similarity to determine if update is needed

## File Structure Requirements

Based on GitHub documentation, copilot-instructions files should be:
- **Repository-wide instructions**: `.github/copilot-instructions.md` (applies to entire repository)
- **Path-specific instructions**: `.github/instructions/NAME.instructions.md` (applies to specific file patterns via `applyTo` frontmatter)
- **Community instructions**: `instructions/NAME.instructions.md` (for sharing and distribution)

## Front Matter Structure

Instructions files in awesome-copilot use this front matter format:
```markdown
---
description: 'Brief description of what this instruction provides'
applyTo: '**/*.js,**/*.ts' # Optional: glob patterns for file matching
---
```

## Requirements

- Use `githubRepo` tool to get content from awesome-copilot repository instructions folder
- Scan local file system for existing instructions in `.github/instructions/` directory
- Read YAML front matter from local instruction files to extract descriptions and `applyTo` patterns
- Compare local instructions with remote versions to detect outdated instructions
- Compare against existing instructions in this repository to avoid duplicates
- Focus on gaps in current instruction library coverage
- Validate that suggested instructions align with repository's purpose and standards
- Provide clear rationale for each suggestion
- Include links to both awesome-copilot instructions and similar local instructions
- Clearly identify outdated instructions with specific differences noted
- Consider technology stack compatibility and project-specific needs
- Don't provide any additional information or context beyond the table and the analysis

## Icons Reference

- ✅ Already installed and up-to-date
- ⚠️ Installed but outdated (update available)
- ❌ Not installed in repo

## Update Handling

When outdated instructions are identified:
1. Include them in the output table with ⚠️ status
2. Document specific differences in the "Suggestion Rationale" column
3. Provide recommendation to update with key changes noted
4. When user requests update, replace entire local file with remote version
5. Preserve file location in `.github/instructions/` directory


name	suggest-awesome-github-copilot-skills
description	Suggest relevant GitHub Copilot skills from the awesome-copilot repository based on current repository context and chat history, avoiding duplicates with existing skills in this repository, and identifying outdated skills that need updates.
Suggest Awesome GitHub Copilot Skills
Analyze current repository context and suggest relevant Agent Skills from the GitHub awesome-copilot repository that are not already available in this repository. Agent Skills are self-contained folders located in the skills folder of the awesome-copilot repository, each containing a SKILL.md file with instructions and optional bundled assets.

Process
Fetch Available Skills: Extract skills list and descriptions from awesome-copilot README.skills.md. Must use #fetch tool.
Scan Local Skills: Discover existing skill folders in .github/skills/ folder
Extract Descriptions: Read front matter from local SKILL.md files to get name and description
Fetch Remote Versions: For each local skill, fetch the corresponding SKILL.md from awesome-copilot repository using raw GitHub URLs (e.g., https://raw.githubusercontent.com/github/awesome-copilot/main/skills/<skill-name>/SKILL.md)
Compare Versions: Compare local skill content with remote versions to identify:
Skills that are up-to-date (exact match)
Skills that are outdated (content differs)
Key differences in outdated skills (description, instructions, bundled assets)
Analyze Context: Review chat history, repository files, and current project needs
Compare Existing: Check against skills already available in this repository
Match Relevance: Compare available skills against identified patterns and requirements
Present Options: Display relevant skills with descriptions, rationale, and availability status including outdated skills
Validate: Ensure suggested skills would add value not already covered by existing skills
Output: Provide structured table with suggestions, descriptions, and links to both awesome-copilot skills and similar local skills AWAIT user request to proceed with installation or updates of specific skills. DO NOT INSTALL OR UPDATE UNLESS DIRECTED TO DO SO.
Download/Update Assets: For requested skills, automatically:
Download new skills to .github/skills/ folder, preserving the folder structure
Update outdated skills by replacing with latest version from awesome-copilot
Download both SKILL.md and any bundled assets (scripts, templates, data files)
Do NOT adjust content of the files
Use #fetch tool to download assets, but may use curl using #runInTerminal tool to ensure all content is retrieved
Use #todos tool to track progress
Context Analysis Criteria
🔍 Repository Patterns:

Programming languages used (.cs, .js, .py, .ts, etc.)
Framework indicators (ASP.NET, React, Azure, Next.js, etc.)
Project types (web apps, APIs, libraries, tools, infrastructure)
Development workflow requirements (testing, CI/CD, deployment)
Infrastructure and cloud providers (Azure, AWS, GCP)
🗨️ Chat History Context:

Recent discussions and pain points
Feature requests or implementation needs
Code review patterns
Development workflow requirements
Specialized task needs (diagramming, evaluation, deployment)
Output Format
Display analysis results in structured table comparing awesome-copilot skills with existing repository skills:

Awesome-Copilot Skill	Description	Bundled Assets	Already Installed	Similar Local Skill	Suggestion Rationale
gh-cli	GitHub CLI skill for managing repositories and workflows	None	❌ No	None	Would enhance GitHub workflow automation capabilities
aspire	Aspire skill for distributed application development	9 reference files	✅ Yes	aspire	Already covered by existing Aspire skill
terraform-azurerm-set-diff-analyzer	Analyze Terraform AzureRM provider changes	Reference files	⚠️ Outdated	terraform-azurerm-set-diff-analyzer	Instructions updated with new validation patterns - Update recommended
Local Skills Discovery Process
List all folders in .github/skills/ directory
For each folder, read SKILL.md front matter to extract name and description
List any bundled assets within each skill folder
Build comprehensive inventory of existing skills with their capabilities
Use this inventory to avoid suggesting duplicates
Version Comparison Process
For each local skill folder, construct the raw GitHub URL to fetch the remote SKILL.md:
Pattern: https://raw.githubusercontent.com/github/awesome-copilot/main/skills/<skill-name>/SKILL.md
Fetch the remote version using the #fetch tool
Compare entire file content (including front matter and body)
Identify specific differences:
Front matter changes (name, description)
Instruction updates (guidelines, examples, best practices)
Bundled asset changes (new, removed, or modified assets)
Document key differences for outdated skills
Calculate similarity to determine if update is needed
Skill Structure Requirements
Based on the Agent Skills specification, each skill is a folder containing:

SKILL.md: Main instruction file with front matter (name, description) and detailed instructions
Optional bundled assets: Scripts, templates, reference data, and other files referenced from SKILL.md
Folder naming: Lowercase with hyphens (e.g., azure-deployment-preflight)
Name matching: The name field in SKILL.md front matter must match the folder name
Front Matter Structure
Skills in awesome-copilot use this front matter format in SKILL.md:

---
name: 'skill-name'
description: 'Brief description of what this skill provides and when to use it'
---
Requirements
Use fetch tool to get content from awesome-copilot repository skills documentation
Use githubRepo tool to get individual skill content for download
Scan local file system for existing skills in .github/skills/ directory
Read YAML front matter from local SKILL.md files to extract names and descriptions
Compare local skills with remote versions to detect outdated skills
Compare against existing skills in this repository to avoid duplicates
Focus on gaps in current skill library coverage
Validate that suggested skills align with repository's purpose and technology stack
Provide clear rationale for each suggestion
Include links to both awesome-copilot skills and similar local skills
Clearly identify outdated skills with specific differences noted
Consider bundled asset requirements and compatibility
Don't provide any additional information or context beyond the table and the analysis
Icons Reference
✅ Already installed and up-to-date
⚠️ Installed but outdated (update available)
❌ Not installed in repo
Update Handling
When outdated skills are identified:

Include them in the output table with ⚠️ status
Document specific differences in the "Suggestion Rationale" column
Provide recommendation to update with key changes noted
When user requests update, replace entire local skill folder with remote version
Preserve folder location in .github/skills/ directory
Ensure all bundled assets are downloaded alongside the updated SKILL.md