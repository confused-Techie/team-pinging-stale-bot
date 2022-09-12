# Probot: Team-Pinging-Stale-Bot

An in progress bot for `pulsar-edit` that automatically pings the team that has access to a repo, when an pull request has not seen any recent activity. 

> The rest of the readme has not been changed since forking, except the yaml configuration. 

## Usage

1. **[Configure the GitHub App](https://github.com/apps/stale)**
2. Create `.github/stale.yml` based on the following template.
3. It will start scanning for stale issues and/or pull requests within 24 hours.

A `.github/stale.yml` file is required to enable the plugin. The file can be empty, or it can override any of these default settings:

> This configuration is also available [here](/team-ping-stale-bot.yml)

```yml
# Configuration for team-pinging-stale-bot 

# Number of days of inactivity before a Pull Request becomes stale 
daysUntilStale: 10

# Only pull requests with all of these labels are checked if stale. Defaults to `[]` (disabled)
onlyLabels: []

# Pull Requests with these labels will never be considered stale. Set to `[]` to disable.
exemptLabels:
  - pinned

# Set to true to ignore prs in a project (defaults to false)
exemptProjects: false 

# Set to ture to ignore prs in a milestone (defaults to false)
exemptMilestones: false 

# Set to true to ignore prs with an assignee (defaults to false)
exemptAssignees: false 

# Comment to post when commenting on stale issue. Use `%TEAM%` where the team ping should be.
markComment: >
  This issue has been automatically found to be stale because it has not had 
  recent activity. Pinging %TEAM% as the relevant team that should review this.
  Thank you for your contributions.
  
# Limit the number of actions per hour, from 1-30. Default is 30.
limitPerRun: 30

# Optionally, specify configuration settings that are specific to just 'issues' or 'pulls':
# pulls:
#   daysUntilStale: 30
#   markComment: >
#     This pull request has been automatically marked as stale because it has not had
#     recent activity. It will be closed if no further activity occurs. Thank you
#     for your contributions.

# issues:
#   exemptLabels:
#     - confirmed
```

## How are issues and pull requests considered stale?

The app uses GitHub's [updated](https://help.github.com/articles/searching-issues/#search-based-on-when-an-issue-or-pull-request-was-created-or-last-updated) search qualifier to determine staleness. Any change to an issue or pull request is considered an update, including comments, changing labels, applying or removing milestones, or pushing commits.

An easy way to check and see which issues or pull requests will initially be marked as stale is to add the `updated` search qualifier to either the issue or pull request page filter for your repository: `updated:<2017-07-01`. Adjust the date to be 60 days ago (or whatever you set for `daysUntilStale`) to see which issues or pull requests will be marked.

## Why did only some issues and pull requests get marked stale?

To avoid triggering abuse prevention mechanisms on GitHub, only 30 issues and pull requests will be marked or closed per hour. If your repository has more than that, it will just take a few hours or days to mark them all.

## How long will it take?

The app runs on a scheduled basis and in batches in order to avoid hitting rate limit ceilings.

This means that even after you initially install the GitHub configuration and add the `stale.yml` file, you may not see it act immediately.

If the bot doesn't run within 24 hours of initial setup, feel free to [open an issue](https://github.com/probot/stale/issues/new) and we can investigate further.

## Is closing stale issues really a good idea?

In an ideal world with infinite resources, there would be no need for this app.

But in any successful software project, there's always more work to do than people to do it. As more and more work piles up, it becomes paralyzing. Just making decisions about what work should and shouldn't get done can exhaust all available resources. In the experience of the maintainers of this app—and the hundreds of other projects and organizations that use it—focusing on issues that are actively affecting humans is an effective method for prioritizing work.

To some, a robot trying to close stale issues may seem inhospitable or offensive to contributors. But the alternative is to disrespect them by setting false expectations and implicitly ignoring their work. This app makes it explicit: if work is not progressing, then it's stale. A comment is all it takes to keep the conversation alive.

## Deployment

See [docs/deploy.md](docs/deploy.md) if you would like to run your own instance of this plugin.

## Contribute

If you have suggestions for how Stale could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

Note that all interactions fall under the [Probot Code of Conduct](https://github.com/probot/probot/blob/master/CODE_OF_CONDUCT.md).

## License

[ISC](LICENSE) Copyright © 2017-2018 Brandon Keepers
