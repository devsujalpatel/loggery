import { defineConfig } from 'drizzle-kit';
import "dotenv/config"
import dotenv from "dotenv"
dotenv.config({path: ".env"})


export default defineConfig({
  out: './drizzle',
  schema: './src/database/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
