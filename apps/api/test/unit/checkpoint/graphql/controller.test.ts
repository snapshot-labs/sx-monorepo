import { GraphQLSchema, printSchema } from 'graphql';
import { mock } from 'jest-mock-extended';
import { GqlEntityController } from '../../../../src/checkpoint/graphql/controller';
import { AsyncMySqlPool } from '../../../../src/checkpoint/mysql';

describe('GqlEntityController', () => {
  describe('createEntityQuerySchema', () => {
    it('should work', () => {
      const controller = new GqlEntityController(`
type Vote {
  id: Int!
  name: String
}
  `);
      const querySchema = controller.createEntityQuerySchema();

      const schema = printSchema(new GraphQLSchema({ query: querySchema }));
      expect(schema).toMatchSnapshot();
    });

    // list of error table tests
    describe.each([
      {
        reason: 'non null object id',
        schema: `type Vote { id: String }`
      },
      {
        reason: 'object id is not scalar type',
        schema: `type Vote { id: Participant! }\n\n type Participant { id: Int! }`
      },
      {
        reason: 'object id is not scalar type 2',
        schema: `type Participant { id: [Int]! }`
      }
    ])('should fail for $reason', ({ schema }) => {
      const controller = new GqlEntityController(schema);
      expect(() => controller.createEntityQuerySchema()).toThrowErrorMatchingSnapshot();
    });
  });

  describe('createEntityStores', () => {
    it('should work', async () => {
      const mockMysql = mock<AsyncMySqlPool>();
      const controller = new GqlEntityController(`
type Vote {
  id: Int!
  name: String
}
  `);
      await controller.createEntityStores(mockMysql);

      expect(mockMysql.queryAsync).toMatchSnapshot();
    });
  });
});
