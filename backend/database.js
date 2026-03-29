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

  async paginateTable(tableName, query = {}) {
    const { page, pageSize, offset } = this.parsePagination(query);
    const countSql = `SELECT COUNT(*) AS total FROM ${tableName}`;
    const dataSql = `SELECT * FROM ${tableName} LIMIT ? OFFSET ?`;

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