import mysql from 'mysql2/promise';
const connectionProperties = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'lego'
};
class Database {
  constructor() {
    this.connection = mysql.createConnection(connectionProperties);
  }

  query(sql, params){
    return new Promise((resolve, reject) => {
      this.connection.query(sql, params, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }      
      });
    });
  }
}