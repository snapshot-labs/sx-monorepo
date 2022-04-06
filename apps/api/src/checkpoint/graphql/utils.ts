import { introspectionFromSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import mysql from '../mysql';

async function queryMulti(parent, args, context, info) {
  const params: any = [];
  let whereSql = '';
  if (args.where) {
    Object.entries(args.where).map(w => {
      whereSql += !whereSql ? `WHERE ${w[0]} = ? ` : ` AND ${w[0]} = ?`;
      params.push(w[1]);
    });
  }
  const first = args?.first || 1000;
  const skip = args?.skip || 0;
  const orderBy = 'created';
  const orderDirection = 'DESC';
  params.push(skip, first);
  return await mysql.queryAsync(
    `SELECT * FROM ${info.fieldName} ${whereSql} ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?`,
    params
  );
}

async function querySingle(parent, args, context, info) {
  const query = `SELECT * FROM ${info.fieldName}s WHERE id = ? LIMIT 1`;
  const [item] = await mysql.queryAsync(query, [args.id]);
  return item;
}

/**
 * toSql generates SQL statements to create tables based on the types defined
 * in the GraphQL typeDefs.
 *
 * The generated SQL statment also creates a `checkpoint` table to track block
 * checkpoints.
 *
 * For example, given an input like:
 * ```graphql
 * type Vote {
 *  id: Int!
 *  name: String
 * }
 * ```
 *
 * will return the following SQL:
 * ```sql
 * DROP TABLE IF EXISTS checkpoint;
 * CREATE TABLE checkpoint (number BIGINT NOT NULL, PRIMARY KEY (number));
 * INSERT checkpoint SET number = 0;·
 * DROP TABLE IF EXISTS votes;
 * CREATE TABLE votes (
 *   id VARCHAR(128) NOT NULL,
 *   name VARCHAR(128) NOT NULL,
 *   PRIMARY KEY (id) ,
 *   INDEX id (id),
 *   INDEX name (name)
 * );
 * ```
 *
 */
export function toSql(typeDefs: string): string {
  const schema = makeExecutableSchema({
    typeDefs: `type Query { x: String }\n${typeDefs}`
  });
  let sql = 'DROP TABLE IF EXISTS checkpoint;';
  sql += '\nCREATE TABLE checkpoint (number BIGINT NOT NULL, PRIMARY KEY (number));';
  sql += '\nINSERT checkpoint SET number = 0;';
  introspectionFromSchema(schema).__schema.types.forEach(type => {
    const clone = JSON.parse(JSON.stringify(type));
    if (
      clone.kind === 'OBJECT' &&
      clone.fields &&
      !clone.name.startsWith('__') &&
      clone.name !== 'Query'
    ) {
      sql += `\n\nDROP TABLE IF EXISTS ${clone.name.toLowerCase()}s;`;
      sql += `\nCREATE TABLE ${clone.name.toLowerCase()}s (`;
      let sqlIndexes = ``;
      clone.fields.forEach(field => {
        const fieldType = field.type.name;
        let sqlType = 'VARCHAR(128)';
        if (fieldType === 'Int') sqlType = 'INT(128)';
        if (fieldType === 'String') sqlType = 'VARCHAR(128)';
        if (fieldType === 'Text') sqlType = 'TEXT';
        sql += `\n  ${field.name} ${sqlType} NOT NULL,`;
        if (fieldType !== 'Text') sqlIndexes += `,\n  INDEX ${field.name} (${field.name})`;
      });
      sql += `\n  PRIMARY KEY (id) ${sqlIndexes}\n);`;
    }
  });
  return sql;
}

/**
 * toGql returns a graphql schema string with generated queries for fetching
 * the already defined types in the input schema. For each type, a single and
 * multi (pluralized name) query is generated.
 *
 * For example, given the input schema:
 * ```
 * type Vote {
 *  id: Int!
 *  name: String
 * }
 * ```
 *
 * The generated queries will be like:
 * ```
 * type Query {
 *  votes(
 *     first: Int
 *     skip: Int
 *     orderBy: String
 *     orderDirection: String
 *     where: WhereVote
 *   ): [Vote]
 *   vote(id: String): Vote
 * }
 *
 *  input WhereVote {
 *    id: null
 *    id_in: [null]
 *    name: String
 *    name_in: [String]
 *  }
 *
 * ```
 *
 */
export function toGql(typeDefs: string): string {
  let where = '';
  let gql = 'type Query {';
  const schema = makeExecutableSchema({
    typeDefs: `type Query { x: String }\n${typeDefs}`
  });
  introspectionFromSchema(schema).__schema.types.forEach(type => {
    const clone = JSON.parse(JSON.stringify(type));
    if (
      clone.kind === 'OBJECT' &&
      clone.fields &&
      !clone.name.startsWith('__') &&
      clone.name !== 'Query'
    ) {
      where += `\n\ninput Where${clone.name} {`;
      gql += `\n  ${clone.name.toLowerCase()}s(`;
      gql += `\n    first: Int`;
      gql += `\n    skip: Int`;
      gql += `\n    orderBy: String`;
      gql += `\n    orderDirection: String`;
      gql += `\n    where: Where${clone.name}`;
      gql += `\n  ): [${clone.name}]`;
      gql += `\n  ${clone.name.toLowerCase()}(id: String): ${clone.name}`;
      clone.fields.forEach(field => {
        const fieldType = field.type.name;
        if (fieldType !== 'Text') {
          where += `\n  ${field.name}: ${fieldType}`;
          where += `\n  ${field.name}_in: [${fieldType}]`;
          if (fieldType === 'Int') {
            where += `\n  ${field.name}_gt: ${fieldType}`;
            where += `\n  ${field.name}_gte: ${fieldType}`;
            where += `\n  ${field.name}_lt: ${fieldType}`;
            where += `\n  ${field.name}_lte: ${fieldType}`;
          }
        }
      });
      where += `\n}`;
    }
  });
  gql += `\n}\n${where}\n\n${typeDefs}`;
  return gql;
}

/**
 * toQuery creates an object of resolvers  based on types defined within graphql
 * schema.
 *
 * For example, given the input:
 * ```graphql
 * type Vote {
 *  id: Int!
 *  name: String
 * }
 * ```
 *
 * will return an object of the form:
 * ```
 * Object {
 *  vote: GQLResolver,
 *  votes: GQLResolver,
 * }
 * ```
 *
 * Note that a plural resolver is also created for each field
 */
export function toQuery(typeDefs: string): Record<string, any> {
  const query = {};
  const schema = makeExecutableSchema({
    typeDefs: `type Query { x: String }\n${typeDefs}`
  });
  introspectionFromSchema(schema).__schema.types.forEach(type => {
    const clone = JSON.parse(JSON.stringify(type));
    if (
      clone.kind === 'OBJECT' &&
      clone.fields &&
      !clone.name.startsWith('__') &&
      clone.name !== 'Query'
    ) {
      query[`${clone.name.toLowerCase()}s`] = queryMulti;
      query[clone.name.toLowerCase()] = querySingle;
    }
  });
  return query;
}
