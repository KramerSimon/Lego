import mysql from 'mysql';
const connectionProperties = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'lego',
  connectionLimit: 10
};
class Database {
  constructor() {
    this.pool = mysql.createPool(connectionProperties);
    this.tableColumnsCache = new Map();
  }

  query(sql, params) {
    return new Promise((resolve, reject) => {
      this.pool.query(sql, params, (error, result) => {
        if (error) {
          console.error('Database query failed:', { sql, error: error.message });
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  queryClose(sql, params) {
    return this.query(sql, params);
  }

  withTransaction(work) {
    return new Promise((resolve, reject) => {
      this.pool.getConnection((connectionError, connection) => {
        if (connectionError) {
          reject(connectionError);
          return;
        }

        const txQuery = (sql, params = []) => new Promise((queryResolve, queryReject) => {
          connection.query(sql, params, (error, result) => {
            if (error) {
              queryReject(error);
            } else {
              queryResolve(result);
            }
          });
        });

        connection.beginTransaction(async (beginError) => {
          if (beginError) {
            connection.release();
            reject(beginError);
            return;
          }

          try {
            const result = await work({ query: txQuery });
            connection.commit((commitError) => {
              if (commitError) {
                connection.rollback(() => {
                  connection.release();
                  reject(commitError);
                });
                return;
              }
              connection.release();
              resolve(result);
            });
          } catch (error) {
            connection.rollback(() => {
              connection.release();
              reject(error);
            });
          }
        });
      });
    });
  }

  parsePagination(query = {}) {
    const pageNum = Number.parseInt(query.page, 10);
    const pageSizeNum = Number.parseInt(query.pageSize, 10);
    const page = Number.isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
    const pageSize = Number.isNaN(pageSizeNum) || pageSizeNum < 1 ? 25 : Math.min(pageSizeNum, 200);
    const offset = (page - 1) * pageSize;
    return { page, pageSize, offset };
  }

  normalizeSortDirection(value) {
    const raw = String(value ?? '').trim().toLowerCase();
    return raw === 'asc' ? 'ASC' : 'DESC';
  }

  sanitizeSortColumn(value) {
    const column = String(value ?? '').trim();
    if (!column) {
      return null;
    }
    return /^[a-zA-Z0-9_]+$/.test(column) ? column : null;
  }

  async getTableColumns(tableName) {
    if (this.tableColumnsCache.has(tableName)) {
      return this.tableColumnsCache.get(tableName);
    }

    const rows = await this.query(`SHOW COLUMNS FROM ${tableName}`);
    const columns = new Set(
      (rows ?? [])
        .map((row) => String(row?.Field ?? '').trim())
        .filter((name) => name.length > 0)
    );

    this.tableColumnsCache.set(tableName, columns);
    return columns;
  }

  async paginateTable(tableName, query = {}) {
    const { page, pageSize, offset } = this.parsePagination(query);
    const sortBy = this.sanitizeSortColumn(query.sortBy);
    const sortDir = this.normalizeSortDirection(query.sortDir);
    let orderBySql = '';

    if (sortBy) {
      const columns = await this.getTableColumns(tableName);
      if (columns.has(sortBy)) {
        orderBySql = ` ORDER BY ${sortBy} ${sortDir}`;
      }
    }

    const countSql = `SELECT COUNT(*) AS total FROM ${tableName}`;
    const dataSql = `SELECT * FROM ${tableName}${orderBySql} LIMIT ? OFFSET ?`;

    const [countRows, dataRows] = await Promise.all([
      this.query(countSql),
      this.query(dataSql, [pageSize, offset])
    ]);

    const total = Number(countRows?.[0]?.total ?? 0);
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    return {
      data: dataRows,
      page,
      pageSize,
      total,
      totalPages
    };
  }

  close() {
    return new Promise((resolve, reject) => {
      this.pool.end((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}
export default new Database();