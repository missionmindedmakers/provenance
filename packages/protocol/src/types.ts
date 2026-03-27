import { CRP_V0_0_2_SCHEMA } from './schema.js'
import type { FromJsonSchema } from './schema-to-types.js'

export type CrpBundle = FromJsonSchema<typeof CRP_V0_0_2_SCHEMA>
