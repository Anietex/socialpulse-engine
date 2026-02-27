import Groq from "groq-sdk";
import fs from "fs/promises";

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "YOUR_GROQ_API_KEY"
});

// Topic inference function
async function inferTopic(tweet) {
    const prompt = `You must classify this tweet into EXACTLY ONE category from this list. Choose the BEST match. Do NOT create new categories.

ALLOWED CATEGORIES ONLY:
Technology, Programming, Artificial Intelligence, Machine Learning, Web Development, Mobile Development, Data Science, Cybersecurity, Blockchain, Cryptocurrency, Business, Entrepreneurship, Marketing, Finance, Investing, Startups, Productivity, Career Development, Leadership, Management, Sports, Football, Basketball, Gaming, Entertainment, Movies, Music, Books, Art, Photography, Travel, Food, Fitness, Health, Wellness, Mental Health, Science, Space, Climate Change, Politics, News, Education, History, Philosophy, Psychology, Fashion, Design, Real Estate, Pets, Humor, none

Examples:
Tweet: "Just deployed my React app!"
Category: Web Development

Tweet: "Bitcoin hits new high"
Category: Cryptocurrency

Tweet: "Ronaldo scores goal!"
Category: Football

Tweet: "Random gibberish text"
Category: none

Now classify:
Tweet: "${tweet}"
Category:`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.3-70b-versatile", // Fast and accurate
            temperature: 0,
            max_tokens: 15,
        });

        const response = completion.choices[0]?.message?.content || "none";

        // Clean up the response
        let cleaned = response.trim();
        if (cleaned.toLowerCase().startsWith('category:')) {
            cleaned = cleaned.substring(9).trim();
        }
        cleaned = cleaned.split('\n')[0].trim();

        // Validate against allowed categories
        const allowedCategories = [
            'Technology', 'Programming', 'Artificial Intelligence', 'Machine Learning',
            'Web Development', 'Mobile Development', 'Data Science', 'Cybersecurity',
            'Blockchain', 'Cryptocurrency', 'Business', 'Entrepreneurship', 'Marketing',
            'Finance', 'Investing', 'Startups', 'Productivity', 'Career Development',
            'Leadership', 'Management', 'Sports', 'Football', 'Basketball', 'Gaming',
            'Entertainment', 'Movies', 'Music', 'Books', 'Art', 'Photography', 'Travel',
            'Food', 'Fitness', 'Health', 'Wellness', 'Mental Health', 'Science', 'Space',
            'Climate Change', 'Politics', 'News', 'Education', 'History', 'Philosophy',
            'Psychology', 'Fashion', 'Design', 'Real Estate', 'Pets', 'Humor', 'none',
            'None'
        ];

        if (!allowedCategories.includes(cleaned)) {
            console.log(`  ⚠️  Invalid category "${cleaned}" - defaulting to "none"`);
            cleaned = 'none';
        }

        return cleaned;
    } catch (error) {
        console.error(`  ❌ Error classifying tweet: ${error.message}`);
        return 'none';
    }
}

// Main classification function
async function classifyTweets() {
    console.log("Starting tweet classification with Groq API...\n");
    const startTime = Date.now();

    // Load tweets
    const tweetsData = JSON.parse(
        await fs.readFile("./tweets.json", "utf-8")
    );
    const tweets = tweetsData.tweets.slice(0, 10); // Test with 10 first
    console.log(`Loaded ${tweets.length} tweets (testing with Groq API)\n`);

    // Classify tweets
    const categories = {};
    let processed = 0;

    for (const tweet of tweets) {
        const category = await inferTopic(tweet.text);

        // Track category counts
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push({
            text: tweet.text,
            user: tweet.user.handle,
            url: tweet.url,
        });

        processed++;

        // Log category after each classification
        console.log(`[${processed}] Category: ${category} | Tweet: ${tweet.text.substring(0, 60)}...`);
    }

    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;

    // Log results
    console.log("\n" + "=".repeat(60));
    console.log("CLASSIFICATION COMPLETE");
    console.log("=".repeat(60));
    console.log(`Total tweets processed: ${processed}`);
    console.log(`Total time: ${totalTime.toFixed(2)} seconds`);
    console.log(`Average time per tweet: ${(totalTime / processed).toFixed(2)} seconds`);
    console.log("\n" + "=".repeat(60));
    console.log("CATEGORIES BREAKDOWN");
    console.log("=".repeat(60));

    // Sort categories by count
    const sortedCategories = Object.entries(categories).sort(
        (a, b) => b[1].length - a[1].length
    );

    for (const [category, items] of sortedCategories) {
        console.log(`\n${category}: ${items.length} tweets`);
    }

    console.log("\n" + "=".repeat(60));
}

// Run classification
classifyTweets().catch(console.error);
