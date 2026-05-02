import "dotenv/config";
import { db } from "./db/index";
import { newsArticles } from "./shared/schema";

async function diagnosticSources() {
    try {
        const results = await db.select().from(newsArticles);
        const sourceMap = new Map();
        results.forEach(r => {
            sourceMap.set(r.source, (sourceMap.get(r.source) || 0) + 1);
        });

        console.log("DUMP_START");
        for (const [source, count] of sourceMap.entries()) {
            console.log(`SOURCE: ${source} | COUNT: ${count}`);
        }
        console.log("DUMP_END");
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

diagnosticSources();
