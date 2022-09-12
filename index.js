require('newrelic')

const getConfig = require('probot-config')
const createScheduler = require('probot-scheduler')
const Stale = require('./lib/stale')

module.exports = async app => {
  // Visit all repositories to mark and sweep stale issues
  const scheduler = createScheduler(app)

  app.on('schedule.repository', markAndSweep)

  async function markAndSweep (context) {
    const stale = await forRepository(context)
    await stale.markAndSweep('pulls')
  }

  async function forRepository (context) {
    let config = await getConfig(context, 'team-ping-stale-bot.yml')

    if (!config) {
      scheduler.stop(context.payload.repository)
      // Don't actually perform for repository without a config
      config = { perform: false }
    }

    config = Object.assign(config, context.repo({ logger: app.log }))

    return new Stale(context.github, config)
  }
}
