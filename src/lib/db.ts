import { Pool } from "pg";

export const db = {
  pool: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
};
