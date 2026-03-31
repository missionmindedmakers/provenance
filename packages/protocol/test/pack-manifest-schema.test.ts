import { readFileSync } from 'node:fs'

import { Ajv2020 } from 'ajv/dist/2020.js'
import * as addFormatsPlugin from 'ajv-formats'

const schemaUrl = new URL('../../../schema/cliproot-pack-v1.manifest.schema.json', import.meta.url)
const exampleUrl = new URL(
  '../../../schema/examples/cliproot-pack-v1.manifest.example.json',
  import.meta.url
)

const schema = JSON.parse(readFileSync(schemaUrl, 'utf8')) as object
const example = JSON.parse(readFileSync(exampleUrl, 'utf8')) as object

const ajv = new Ajv2020({
  strict: true,
  allErrors: true,
  validateFormats: true
})

const addFormats = addFormatsPlugin as unknown as { default: (instance: Ajv2020) => void }
addFormats.default(ajv)

describe('cliproot pack manifest schema', () => {
  it('validates the canonical manifest example', () => {
    const validate = ajv.compile(schema)
    const ok = validate(example)

    expect(ok).toBe(true)
    expect(validate.errors).toBeNull()
  })
})
