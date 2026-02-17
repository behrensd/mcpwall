---
name: Rule Request
about: Suggest a new default rule or rule pack
labels: rules
---

**What threat does this rule address?**
<!-- e.g., "Block access to Kubernetes secrets" -->

**Proposed YAML rule**
```yaml
- name:
  match:
    method: tools/call
    tool: "*"
    arguments:
      _any_value:
        regex: ""
  action: deny
  message: ""
```

**Why should this be a default rule?**
<!-- Is this a common threat? Does it affect many users? -->
