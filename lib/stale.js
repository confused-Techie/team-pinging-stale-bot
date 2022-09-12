const schema = require('./schema')
const maxActionsPerRun = 30

module.exports = class Stale {
  constructor (github, { owner, repo, logger = console, ...config }) {
    this.github = github;
    this.logger = logger;
    this.remainingActions = 0;
    this.org = owner;
    this.teams;

    const { error, value } = schema.validate(config);

    this.config = value;
    if (error) {
      // Report errors to sentry
      logger.warn({ err: new Error(error), owner, repo }, 'Invalid config');
    }

    Object.assign(this.config, { owner, repo });
  }
  
  async teamSetup() {
    let org = this.org;
    this.teams = await this.github.rest.teams.list({ org });
    return;
  }

  async markAndSweep (type) {
    const { only } = this.config;
    if (only && only !== type) {
      return;
    }
    if (!this.getConfigValue(type, 'perform')) {
      return;
    }

    this.logger.info(this.config, `starting mark and sweep of ${type}`);

    const limitPerRun = this.getConfigValue(type, 'limitPerRun') || maxActionsPerRun;
    this.remainingActions = Math.min(limitPerRun, maxActionsPerRun);

    await this.mark(type);
  }

  async mark (type) {
    const staleItems = (await this.getStale(type)).data.items

    await Promise.all(
      staleItems
        .filter(issue => !issue.locked && issue.state !== 'closed')
        .map(issue => this.markIssue(type, issue))
    )
  }

  getStale (type) {
    const onlyLabels = this.getConfigValue(type, 'onlyLabels')
    const labels = this.getConfigValue(type, 'exemptLabels')
    const exemptProjects = this.getConfigValue(type, 'exemptProjects')
    const exemptMilestones = this.getConfigValue(type, 'exemptMilestones')
    const exemptAssignees = this.getConfigValue(type, 'exemptAssignees')
    const queryParts = labels.map(label => `-label:"${label}"`)
    queryParts.push(...onlyLabels.map(label => `label:"${label}"`))
    queryParts.push(Stale.getQueryTypeRestriction(type))

    queryParts.push(exemptProjects ? 'no:project' : '')
    queryParts.push(exemptMilestones ? 'no:milestone' : '')
    queryParts.push(exemptAssignees ? 'no:assignee' : '')

    const query = queryParts.join(' ')
    const days = this.getConfigValue(type, 'days') || this.getConfigValue(type, 'daysUntilStale')
    return this.search(type, days, query)
  }

  static getQueryTypeRestriction (type) {
    if (type === 'pulls') {
      return 'is:pr'
    }
    throw new Error(`Unknown type: ${type}. Valid types are 'pulls'`)
  }

  search (type, days, query) {
    const { owner, repo } = this.config
    const timestamp = this.since(days).toISOString().replace(/\.\d{3}\w$/, '')

    query = `repo:${owner}/${repo} is:open updated:<${timestamp} ${query}`

    const params = { q: query, sort: 'updated', order: 'desc', per_page: maxActionsPerRun }

    this.logger.info(params, 'searching %s/%s for stale issues', owner, repo)
    return this.github.search.issues(params)
  }

  async markIssue (type, issue) {
    if (this.remainingActions === 0) {
      return;
    }
    this.remainingActions--;

    const { owner, repo } = this.config;
    const perform = this.getConfigValue(type, 'perform');
    const markComment = this.getConfigValue(type, 'markComment');
    const number = issue.number;

    if (perform) {
      this.logger.info('%s/%s#%d is being marked', owner, repo, number);
      if (markComment) {
        let teamToPing = await this.findTeamForRepo(repo);
        
        if (teamToPing) {
          // We will have to find a way to include the team into the markComment.
          let properComment = markComment.replace("%TEAM%", `@${teamToPing}`);
          await this.github.issues.createComment({ owner, repo, number, body: properComment });
        }
        this.logger.info('%s/%s#%d would have been marked. But no valid team could be found', owner, repo, number);
      }
    } else {
      this.logger.info('%s/%s#%d would have been marked (dry-run)', owner, repo, number);
    }
  }
  
  async findTeamForRepo(repo) {
    let org = this.org;
    for (let i = 0; i < this.teams.length; i++) {
      let teamSlug = this.teams[i].slug;
      let teamsRepos = this.github.rest.teams.listReposInOrg({ org, teamSlug });
      
      for (let y = 0; y < teamsRepos.length; y++) {
        if (repo == teamsRepos[i].name) {
          return this.teams[i];
        }
      }
    }
    return false;
  }

  // returns a type-specific config value if it exists, otherwise returns the top-level value.
  getConfigValue (type, key) {
    if (this.config[type] && typeof this.config[type][key] !== 'undefined') {
      return this.config[type][key]
    }
    return this.config[key]
  }

  since (days) {
    const ttl = days * 24 * 60 * 60 * 1000
    let date = new Date(new Date() - ttl)

    // GitHub won't allow it
    if (date < new Date(0)) {
      date = new Date(0)
    }
    return date
  }
}
