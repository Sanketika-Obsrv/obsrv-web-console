import { Pool, QueryResult } from 'pg';
import * as _ from 'lodash';
import { IPostgres } from './../types';

const postGresConnectionString = process.env.POSTGRES_CONNECTION_STRING

export const pool = new Pool({ connectionString: postGresConnectionString });

const create = async (table: string, data: IPostgres): Promise<IPostgres> => {
    const fields = Object.keys(data);
    const values = Object.values(data);

    const query = {
        text: `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
        values: values,
    };

    const result = await pool.query<IPostgres>(query);

    return result.rows[0];
};

const find = async (table: string, conditions: IPostgres, jsonbType: Array<string> = [], arrayType: Array<string> = []): Promise<IPostgres[]> => {
    const columns = Object.keys(conditions);

    const values = Object.values(conditions);
  
    const whereClause = columns
      .map((column, i) => {
          return `${column}=$${i + 1}`;
      })
      .join(' AND ');
  
    const query = {
      text: `SELECT * FROM ${table} WHERE ${whereClause}`,
      values: [...values],
    };
  
    const result = await pool.query<IPostgres>(query);
  
    return result.rows;
};


const destroy = async (table: string, data: IPostgres): Promise<QueryResult<IPostgres>> => {
    const fields = Object.keys(data);
    const values = Object.values(data);

    const query = {
        text: `DELETE FROM ${table} WHERE ${fields.map((field, index) => `${field} = $${index + 2}`).join(', ')} RETURNING *`,
        values: [...values],
    };

    const result = await pool.query<IPostgres>(query);

    return result;
};

export { create, find, destroy };