require('dotenv').config();

const { PORT, SECRET } = require('./config');
const { connectDatabase } = require('./database');
const { createApp } = require('./app');

async function start() {
  if (!SECRET) {
    console.warn('JWT_SECRET is not set; authenticated endpoints will be unavailable.');
  }

  const { client, db } = await connectDatabase(process.env.MONGO_URI || '');
  const app = createApp(db);
  const server = app.listen(PORT, () => {
    console.log(`Node API listening on port ${PORT}`);
  });

  const close = async () => {
    server.close(async () => {
      await client.close();
      process.exit(0);
    });
  };

  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

start().catch((error) => {
  console.error('Could not start Node API:', error.message);
  process.exit(1);
});
