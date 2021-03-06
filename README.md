
<p align="center">
  <a href="https://github.com/zxaos/patchup/actions"><img alt="patchup status" src="https://github.com/zxaos/patchup/workflows/unit-tests/badge.svg"></a>
</p>

# Patchup

This action provides a way to keep a floating set of patches on top of an upstream fork.

Each time it runs, it'll try to rebase your changes onto the upstream branch. If it can't do this without conflit, it'll open a PR so that you can perform the changes manually.

## Using this action

Add a github workflow job with
`uses: zxaos/patchup@v1` to your github workflow file, with configuration as detailed below.

Once installed, _you must ensure there is a local git repository checkout out before running this action_. See the configuration section below for an example.

Finally, you must create a tag that identifies the start of your commits (and the end of the upstream commits). This can be an empty commit.

## Configuring patchup
The configuration of this action is via the workflow yaml file. A simple example workflow follow. Several other configuration options are available, see actions.yml for additional information.

```
---
name: Rebase Onto Upstream

on:
  schedule:
    - cron: '0 0,12 * * *'
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
        uses: zxaos/patchup@v1
        with:
          local_branch: trunk
          github_token: ${{ secrets.GITHUB_TOKEN }}
          upstream_repo: "my-upstream-repo/trunk"
          target_tag: my-patches-start-here
```
