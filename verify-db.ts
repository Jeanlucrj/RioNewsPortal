import postgres from "postgres";
import { config } from "dotenv";

// Força o carregamento do .env localmente
config();

const url = process.env.DATABASE_URL;

async function main() {
  if (!url) {
    console.error("❌ DATABASE_URL não foi encontrado no arquivo .env");
    process.exit(1);
  }

  console.log("🔍 Tentando conectar em:", url.replace(/:([^:@]{3})[^:@]*@/, ':$1***@')); // mask password

  try {
    const sql = postgres(url, {
      max: 1,
      ssl: 'require',
      connect_timeout: 10
    });
    
    const result = await sql`SELECT 1 as connected`;
    console.log("✅ Conectado ao Supabase com sucesso!");
    console.log("Resultado do teste:", result);
    process.exit(0);
  } catch (err) {
    console.error("❌ Falha ao conectar ao Supabase:");
    console.error(err);
    process.exit(1);
  }
}

main();
