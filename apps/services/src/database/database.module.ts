import { Global, Module } from "@nestjs/common";
import { Pool } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

export const DRIZZLE_DB = "DRIZZLE_DB";

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DB,
      useFactory: () => {
        const connectionString = process.env.DATABASE_URL as string;
        if (!connectionString) {
          throw new Error("DATABASE_URL is not set");
        }
        const pool = new Pool({ connectionString });
        return drizzle(pool, {schema});
      }
    }
  ],
  exports: [DRIZZLE_DB],
})

export class DatabaseModule {}
