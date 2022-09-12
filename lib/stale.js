const schema = require('./schema')
const maxActionsPerRun = 30

module.exports = class Stale {
  constructor (github, { owner, repo, logger = console, ...config }) {
    this.github = github;
    this.logger = logger;
    this.remainingActions = 0;

    const { error, value } = schema.validate(config);

    this.config = value;
    if (error) {
      // Report errors to sentry
      logger.warn({ err: new Error(error), owner, repo }, 'Invalid config');
    }

    Object.assign(this.config, { owner, repo });
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
    await this.ensureStaleLabelExists(type);

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
    throw new Error(`Unknown type: ${type}. Valid types are 'pulls' and 'issues'`)
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
      return
    }
    this.remainingActions--

    const { owner, repo } = this.config
    const perform = this.getConfigValue(type, 'perform')
    const markComment = this.getConfigValue(type, 'markComment')
    const number = issue.number

    if (perform) {
      this.logger.info('%s/%s#%d is being marked', owner, repo, number)
      if (markComment) {
        await this.github.issues.createComment({ owner, repo, number, body: markComment })
      }
    } else {
      this.logger.info('%s/%s#%d would have been marked (dry-run)', owner, repo, number)
    }
  }

  // returns a type-specific config value if it exists, otherwise returns the top-level value.
  getConfigValue (type, key) {
    if (this.config[type] && typeof this.config[type][key] !== 'undefined') {
      return this.config[type][key]
    }
    return this.config[key]
  }

  async ensureStaleLabelExists (type) {
    const { owner, repo } = this.config
    const staleLabel = this.getConfigValue(type, 'staleLabel')

    return this.github.issues.getLabel({ owner, repo, name: staleLabel }).catch(() => {
      return this.github.issues.createLabel({ owner, repo, name: staleLabel, color: 'ffffff' })
    })
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
