---
name: sample-agent-skillmd
description: Example SKILL.md demonstrating the agent skill format for task-scoped procedural memory.
---

# Sample Agent Skill

Skills are markdown files an AI agent loads when a task matches their trigger.
Structure: YAML frontmatter (name, description trigger) + imperative rules,
one per line, with why. Supporting files live under references/, templates/,
scripts/ named by topic. Keep lessons, not logs.
