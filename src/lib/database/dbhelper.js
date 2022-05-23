import pg from 'pg';
import named from 'node-postgres-named';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : undefined,
});

// Make sure postgres numeric types are returned as floats instead of strings
// https://stackoverflow.com/questions/42901913/decimal-value-in-postgresql-returned-as-string-in-node-js
// https://github.com/brianc/node-postgres/issues/811
// Numeric type is oid 1700
pg.types.setTypeParser(1700, function (val) {
  return parseFloat(val);
});

// the pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export class Command {
  constructor(text = '', params = {}) {
    this.text = text || '';
    this.params = params || {};
  }

  add(t, params = null) {
    this.text += ' ' + t;

    if (params) {
      this.params = {
        ...this.params,
        ...params,
      };
    }
  }

  param(n, v) {
    this.params[n] = v;
  }

  getSql() {
    return this.text;
  }

  getParams() {
    return this.params;
  }
}

const regexValidObjectName = /^[A-Za-z_]+[0-9]*\.?[A-Za-z_]+[A-Za-z_0-9]*$/;

function validateObjectName(objectName) {
  if (objectName !== '*' && !regexValidObjectName.test(objectName)) {
    throw new Error(
      objectName + ' não é um nome de objeto válido para o banco de dados'
    );
  }
}

function validateObjectNames(listOfNames) {
  listOfNames.forEach(validateObjectName);
}

class DBHelper {
  constructor() {
    this.client = null;
    this.transactionCount = 0;

    pool.connect().then((client) => {
      this.client = client;
      named.patch(this.client);
    });
  }

  async getClient() {
    if (this.client === null) {
      this.client = await this.pool.getClient();
    }

    return this.client;
  }

  async releaseClient() {
    await this.pool.releaseClient(this.client);
    this.client = null;
  }

  async execute(stmt, values = null) {
    await this.getClient();

    if (stmt instanceof Command) {
      values = stmt.getParams();
      stmt = stmt.getSql();
    }

    if (process.env.SQL_LOG === 'true') {
      console.log('\n');
      console.log(stmt);
      console.log('-'.repeat(50));
    }

    let res = null;

    try {
      res = await this.client.query(stmt, values);
    } catch (e) {
      throw e;
    }

    return res.rows;
  }

  async beginTransaction() {
    if (this.transactionCount <= 0) {
      this.transactionCount = 1;
      return await this.execute('BEGIN');
    }

    return await this.execute('SAVEPOINT trans' + this.transactionCount++);
  }

  async commitTransaction(forceEndOfSavePoints = false) {
    if (this.transactionCount <= 1 || forceEndOfSavePoints) {
      this.transactionCount = 0;
      return await this.execute('COMMIT');
    }

    return await this.execute(
      'RELEASE SAVEPOINT trans' + --this.transactionCount
    );
  }

  async rollbackTransaction(forceEndOfSavePoints = false) {
    if (this.transactionCount <= 1 || forceEndOfSavePoints) {
      this.transactionCount = 0;
      return await this.execute('ROLLBACK');
    }

    return await this.execute(
      'ROLLBACK TO SAVEPOINT trans' + --this.transactionCount
    );
  }

  async find(stmt, values) {
    return await this.execute(stmt, values);
  }

  async findById(tableName, recordId, fields = ['*']) {
    validateObjectName(tableName);
    validateObjectNames(fields);

    const res = await this.execute(
      'SELECT ' + fields.join(',') + ' FROM ' + tableName + ' WHERE id = $id',
      { id: recordId }
    );

    if (res) {
      return res[0];
    }

    return null;
  }

  async findValue(stmt, values = null) {
    const res = await this.findOne(stmt, values);

    if (res) {
      return res[Object.keys(res)[0]];
    }

    return null;
  }

  async findOne(stmt, values = null) {
    const res = await this.execute(stmt, values);

    if (res) {
      return res[0];
    }

    return null;
  }

  async update(tableName, record, recordKey) {
    validateObjectName(tableName);
    const tableFields = this._extractValuableFields(record);

    validateObjectNames(tableFields);

    const where = this._prepareWhere(recordKey);
    const values = where.whereValues;

    tableFields.forEach((k) => {
      values[k] = record[k];
    });

    const res = this.execute(
      'UPDATE ' +
        tableName +
        ' SET ' +
        tableFields.map((f) => f + ' = $' + f).join(', ') +
        ' WHERE ' +
        where.whereText +
        ' RETURNING *',
      values
    );

    if (res && Array.isArray(res) && res.length === 1) {
      return res[0];
    } else {
      return res;
    }
  }

  async insert(tableName, record) {
    const stmt = this._buildInsertStatement(tableName, record);
    const res = await this.execute(stmt, record);

    // como o insert vai sempre gravar um unico registro
    // retornamos o registro direto
    // para evitar ter que sempre lembrar de acessar o item [0] da lista
    if (res) {
      return res[0];
    }

    return null;
  }

  _buildInsertStatement(tableName, record, options = { returning: false }) {
    validateObjectName(tableName);

    const tableFields = this._extractValuableFields(record);

    validateObjectNames(tableFields);

    return (
      'INSERT INTO ' +
      tableName +
      ' (' +
      tableFields.join(', ') +
      ') VALUES (' +
      tableFields.map((f) => '$' + f).join(', ') +
      ') ' +
      (options.returning === false ? '' : 'RETURNING *')
    );
  }

  async save(
    tableName,
    record,
    options = {
      primaryKeyFieldName: 'id',
    }
  ) {
    const primaryKeyFields = Array.isArray(options.primaryKeyFieldName)
      ? options.primaryKeyFieldName
      : [options.primaryKeyFieldName];

    // uses pg upset sintax
    // INSERT INTO test (id, nome) values (1, 'pedro')
    // ON CONFLICT (id) DO
    // UPDATE SET nome = EXCLUDED.nome returning *

    validateObjectName(tableName);
    validateObjectNames(primaryKeyFields);

    const tableFields = this._extractValuableFields(record);

    validateObjectNames(tableFields);

    const insertStmtSql = this._buildInsertStatement(tableName, record, {
      returning: false,
    });

    const updateStmtSql =
      'UPDATE set ' +
      tableFields.map((f) => f + ' = EXCLUDED.' + f).join(',') +
      ' returning *';

    const upsertStatement =
      insertStmtSql +
      ' ON CONFLICT (' +
      primaryKeyFields.join(',') +
      ') DO ' +
      updateStmtSql;

    const result = await this.execute(upsertStatement, record);

    if (result && Array.isArray(result) && result.length === 1) {
      return result[0];
    } else {
      result;
    }
  }

  async delete(tableName, recordKey) {
    validateObjectName(tableName);

    const where = this._prepareWhere(recordKey);

    const res = await this.execute(
      'DELETE FROM ' + tableName + ' where ' + where.whereText + ' RETURNING *',
      where.whereValues
    );

    return res;
  }

  _prepareWhere(recordKey) {
    if (['string', 'number'].includes(typeof recordKey)) {
      recordKey = { id: recordKey };
    }

    // uses only fields that contains defined values
    // generate where instructions
    const whereKeys = this._extractValuableFields(recordKey);
    validateObjectNames(whereKeys);

    const whereValues = {};
    whereKeys.forEach(
      (k) => (whereValues[`where_param_name_${k}`] = recordKey[k])
    );

    const whereText = Object.keys(recordKey)
      .map((k) => `${k} = $where_param_name_${k}`)
      .join(' and ');

    return {
      whereText,
      whereValues,
    };
  }

  _extractValuableFields(record) {
    // uses only fields that contains defined values
    // generate where instructions
    return Object.keys(record).filter((k) => record[k] !== undefined);
  }

  createCommand(stmt, values = null) {
    return new Command(stmt, values);
  }
}

export const db = new DBHelper();
