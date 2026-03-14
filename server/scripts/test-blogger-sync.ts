import { BloggerEventsService } from "../services/blogger-events-service";

async function testSync() {
    console.log("🚀 Starting Blogger Sync Test...");
    const bloggerService = new BloggerEventsService();

    try {
        const events = await bloggerService.fetchEvents();

        console.log(`\n📊 Found ${events.length} events:`);

        events.forEach((event, index) => {
            console.log(`\n--- Event #${index + 1} ---`);
            console.log(`Title: ${event.title}`);
            console.log(`Category: ${event.category}`);
            console.log(`Date: ${event.date}`);
            console.log(`Time: ${event.time || "N/A"}`);
            console.log(`Venue: ${event.venue || "N/A"}`);
            console.log(`Price: ${event.price || "N/A"}`);
            console.log(`Image: ${event.imageUrl ? "✅" : "❌"}`);
        });

        if (events.length > 0) {
            console.log("\n✅ Test completed successfully!");
        } else {
            console.log("\n⚠️ No events found. Check the feed URL or parsing logic.");
        }
    } catch (error) {
        console.error("\n❌ Test failed with error:", error);
    }
}

testSync();
