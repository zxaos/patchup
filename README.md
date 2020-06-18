
<p align="center">
  ![unit-tests](https://github.com/zxaos/patchup/workflows/unit-tests/badge.svg)
</p>

# Patchup

This action provides a way to keep a floating set of patches on top of an upstream fork.

Each time it runs, it'll try to rebase your changes onto the upstream branch. If it can't do this without conflit, it'll open a PR so that you can perform the changes manually.

## Using this action

Click the button in the `Use this GitHub Action with your project` banner at the top of the page.

Once installed, _you must ensure there is a local git repository checkout out before running this action_. See the configuration section below for an example.

Finally, you must create a tag that identifies the start of your commits (and the end of the upstream commits). It's easiest if this is the commit that adds the action workflow file!

## Configuring patchup
The configuration of this action is via the workflow yaml file. A simple example workflow follow. Several other configuration options are available, see actions.yml for additional information.

```
---
name: Rebase Onto Upstream

on:
  repository_dispatch:
    types:
      - "on-demand-check"

jobs:
  follow-upstream:
    name: Follow upstream repo
    runs-on: ubuntu-latest
    steps:
      - name: clone repo
        uses: actions/checkout@v2
        with:
          persist-credentials: true
          fetch-depth: 0
      - name: rebase upstream
        uses: zxaos/patchup@1.0.0
        with:
          local_branch: trunk
          github_token: ${{ secrets.GITHUB_TOKEN }}
          upstream_repo: "my-upstream-repo/trunk"
          target_tag: my-patches-start-here
```
