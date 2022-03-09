import { introspectionFromSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import mysql from '../mysql';

async function queryMulti(parent, args, context, info) {
  return await mysql.queryAsync(`SELECT * FROM ${info.fieldName}`);
}

async function querySingle(parent, args, context, info) {
  const query = `SELECT * FROM ${info.fieldName}s LIMIT 1`;
  const [item] = await mysql.queryAsync(query, [args.id]);
  return item;
}

export function toSql(typeDefs) {
  const schema = makeExecutableSchema({
    typeDefs: `scalar Text\ntype Query { x: String }\n${typeDefs}`
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

export function toGql(typeDefs) {
  let gql = 'scalar Text';
  gql += '\n\ninput Where { created: Int }';
  gql += '\n\ntype Query {';
  const schema = makeExecutableSchema({
    typeDefs: `scalar Text\ntype Query { x: String }\n${typeDefs}`
  });
  introspectionFromSchema(schema).__schema.types.forEach(type => {
    const clone = JSON.parse(JSON.stringify(type));
    if (
      clone.kind === 'OBJECT' &&
      clone.fields &&
      !clone.name.startsWith('__') &&
      clone.name !== 'Query'
    ) {
      gql += `\n  ${clone.name.toLowerCase()}s(where: Where): [${clone.name}]`;
      gql += `\n  ${clone.name.toLowerCase()}(where: Where): ${clone.name}`;
      clone.fields.forEach(() => {
        // const fieldType = field.type.name;
      });
    }
  });
  gql += `\n}\n${typeDefs}`;
  return gql;
}

export function toQuery(typeDefs) {
  const query = {};
  const schema = makeExecutableSchema({
    typeDefs: `scalar Text\ntype Query { x: String }\n${typeDefs}`
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
