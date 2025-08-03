// TRANSPORT/backend/knexfile.js
const path = require('path');

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.resolve(__dirname, 'database.db') // database.db က knexfile.js နဲ့ တူညီတဲ့ folder ထဲမှာရှိပါတယ်
    },
    useNullAsDefault: true, // SQLite အတွက် လိုအပ်ပါတယ်။
    migrations: {
      directory: path.resolve(__dirname, 'migrations') // migrations folder က knexfile.js နဲ့ တူညီတဲ့ folder ထဲမှာရှိမှာပါ
    }
  },

  // production environment အတွက် configuration ကိုလည်း ဒီမှာ ထည့်ထားနိုင်ပါတယ်။
  // production: {
  //   client: 'sqlite3',
  //   connection: {
  //     filename: '/path/to/your/production/database.db' // Production database file path
  //   },
  //   useNullAsDefault: true,
  //   migrations: {
  //     directory: path.resolve(__dirname, 'migrations')
  //   }
  // }
};