import { introspectionFromSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import mysql from '../mysql';

async function queryMulti(parent, args, context, info) {
  const params: any = [];
  let whereSql = '';
  if (args.where) {
    Object.entries(args.where).map((w) => {
      whereSql += !whereSql ? `WHERE ${w[0]} = ? ` : ` AND ${w[0]} = ?`;
      params.push(w[1]);
    });
  }
  const first = args?.first || 1000;
  const skip = args?.skip || 0;
  const orderBy = 'created';
  const orderDirection = 'DESC';
  params.push(orderBy, orderDirection, skip, first);
  return await mysql.queryAsync(
    `SELECT * FROM ${info.fieldName} ${whereSql} ORDER BY ? ? LIMIT ?, ?`,
    params
  );
}

async function querySingle(parent, args, context, info) {
  const query = `SELECT * FROM ${info.fieldName}s WHERE id = ? LIMIT 1`;
  const [item] = await mysql.queryAsync(query, [args.id]);
  return item;
}

export function toSql(typeDefs) {
  const schema = makeExecutableSchema({
    typeDefs: `type Query { x: String }\n${typeDefs}`
  });
  let sql = 'DROP TABLE IF EXISTS checkpoint;';
  sql += '\nCREATE TABLE checkpoint (number BIGINT NOT NULL, PRIMARY KEY (number));';
  sql += '\nINSERT checkpoint SET number = 0;';
  introspectionFromSchema(schema).__schema.types.forEach((type) => {
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
      clone.fields.forEach((field) => {
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

export function toGql(typeDefs) {
  let where = '';
  let gql = 'type Query {';
  const schema = makeExecutableSchema({
    typeDefs: `type Query { x: String }\n${typeDefs}`
  });
  introspectionFromSchema(schema).__schema.types.forEach((type) => {
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
      clone.fields.forEach((field) => {
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

export function toQuery(typeDefs) {
  const query = {};
  const schema = makeExecutableSchema({
    typeDefs: `type Query { x: String }\n${typeDefs}`
  });
  introspectionFromSchema(schema).__schema.types.forEach((type) => {
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
