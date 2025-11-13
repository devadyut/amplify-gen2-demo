import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * Define your data schema
 * @see https://docs.amplify.aws/gen2/build-a-backend/data
 */
const schema = a.schema({
  // Placeholder schema - will be expanded in future tasks
  Todo: a
    .model({
      content: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
