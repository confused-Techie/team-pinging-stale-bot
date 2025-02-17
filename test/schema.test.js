const schema = require('../lib/schema')

const validConfigs = [
  [{ daysUntilClose: false }],
  [{ daysUntilClose: 1 }],
  [{ onlyLabels: ['foo'] }],
  [{ onlyLabels: 'foo' }, { onlyLabels: ['foo'] }],
  [{ onlyLabels: null }],
  [{ onlyLabels: [] }],
  [{ exemptLabels: ['foo'] }],
  [{ exemptLabels: 'foo' }, { exemptLabels: ['foo'] }],
  [{ exemptLabels: null }],
  [{ exemptLabels: [] }],
  [{ exemptProjects: true }],
  [{ exemptProjects: false }],
  [{ exemptMilestones: true }],
  [{ exemptMilestones: false }],
  [{ exemptAssignees: true }],
  [{ exemptAssignees: false }],
  [{ markComment: 'stale yo' }],
  [{ markComment: false }],
  [{ limitPerRun: 1 }],
  [{ limitPerRun: 30 }],
  [{ only: null }],
  [{ only: 'pulls' }],
  [{ pulls: { daysUntilStale: 2 } }],
  [{ _extends: '.github' }],
  [{ _extends: 'foobar' }]
]

const invalidConfigs = [
  [{ daysUntilClose: true }, 'must be a number or false'],
  [{ exemptProjects: 'nope' }, 'must be a boolean'],
  [{ exemptMilestones: 'nope' }, 'must be a boolean'],
  [{ exemptAssignees: 'nope' }, 'must be a boolean'],
  [{ markComment: true }, 'must be a string or false'],
  [{ limitPerRun: 31 }, 'must be an integer between 1 and 30'],
  [{ limitPerRun: 0 }, 'must be an integer between 1 and 30'],
  [{ limitPerRun: 0.5 }, 'must be an integer between 1 and 30'],
  [{ only: 'donuts' }, 'must be one of [pulls, null]'],
  [{ pulls: { daysUntilStale: 'no' } }, 'must be a number'],
  [{ pulls: { lol: 'nope' } }, '"lol" is not allowed'],
  [{ _extends: true }, 'must be a string'],
  [{ _extends: false }, 'must be a string']
]

describe('schema', () => {
  test('defaults', async () => {
    expect(schema.validate({}).value).toEqual({
      daysUntilStale: 60,
      onlyLabels: [],
      exemptLabels: ['pinned', 'security'],
      exemptProjects: false,
      exemptMilestones: false,
      exemptAssignees: false,
      perform: true,
      markComment: 'Is this still relevant? If so, what is blocking it? ' +
        'Is there anything you can do to help move it forward?' +
        '\n\nThis issue has been automatically marked as stale ' +
        'because it has not had recent activity. ' +
        'It will be closed if no further activity occurs.',
      limitPerRun: 30
    })
  })

  test('does not set defaults for pulls and issues', () => {
    expect(schema.validate({ pulls: { daysUntilStale: 90 } }).value.pulls).toEqual({
      daysUntilStale: 90
    })

    expect(schema.validate({ issues: { daysUntilStale: 90 } }).value.issues).toEqual({
      daysUntilStale: 90
    })
  })

  validConfigs.forEach(([example, expected = example]) => {
    test(`${JSON.stringify(example)} is valid`, () => {
      const result = schema.validate(example)
      expect(result.error).toBe(null)
      expect(result.value).toMatchObject(expected)
    })
  })

  invalidConfigs.forEach(([example, message]) => {
    test(`${JSON.stringify(example)} is invalid`, () => {
      const { error } = schema.validate(example)
      expect(error && error.toString()).toMatch(message)
    })
  })
})
