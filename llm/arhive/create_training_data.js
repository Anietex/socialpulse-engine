import Groq from "groq-sdk";
import fs from "fs/promises";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "your-key-here"
});

// Categories
const CATEGORIES = [
    'Technology', 'Programming', 'Artificial Intelligence', 'Machine Learning',
    'Web Development', 'Mobile Development', 'Data Science', 'Cybersecurity',
    'Blockchain', 'Cryptocurrency', 'Business', 'Entrepreneurship', 'Marketing',
    'Finance', 'Investing', 'Startups', 'Productivity', 'Career Development',
    'Leadership', 'Management', 'Sports', 'Football', 'Basketball', 'Gaming',
    'Entertainment', 'Movies', 'Music', 'Books', 'Art', 'Photography', 'Travel',
    'Food', 'Fitness', 'Health', 'Wellness', 'Mental Health', 'Science', 'Space',
    'Climate Change', 'Politics', 'News', 'Education', 'History', 'Philosophy',
    'Psychology', 'Fashion', 'Design', 'Real Estate', 'Pets', 'Humor', 'none'
];

async function labelBatch(tweets) {
    const tweetList = tweets.map((t, i) => `${i + 1}. ${t.text}`).join('\n');

    const prompt = `Classify these tweets into categories. Return ONLY a JSON array with this format:
[{"index": 1, "category": "Technology"}, {"index": 2, "category": "Sports"}, ...]

CATEGORIES: ${CATEGORIES.join(', ')}

TWEETS:
${tweetList}

Return ONLY the JSON array, no other text:`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            max_tokens: 2000,
        });

        const response = completion.choices[0]?.message?.content || "[]";

        // Extract JSON from response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return [];
    }
}

async function createTrainingDataset() {
    console.log("Loading tweets...");
    const tweetsData = JSON.parse(await fs.readFile("./tweets.json", "utf-8"));
    const tweets = tweetsData.tweets;

    console.log(`Processing ${tweets.length} tweets in batches of 50...\n`);

    const trainingData = [];
    const batchSize = 50;

    for (let i = 0; i < tweets.length; i += batchSize) {
        const batch = tweets.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(tweets.length/batchSize)}...`);

        const labels = await labelBatch(batch);

        // Match labels with tweets
        labels.forEach(label => {
            const tweet = batch[label.index - 1];
            if (tweet) {
                trainingData.push({
                    text: tweet.text,
                    label: label.category
                });
            }
        });

        console.log(`  Labeled ${labels.length} tweets`);

        // Rate limit: wait 2 seconds between batches
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\nTotal labeled: ${trainingData.length} tweets`);

    // Save training data
    await fs.writeFile(
        "./training_data.json",
        JSON.stringify(trainingData, null, 2)
    );

    // Create label distribution
    const labelCounts = {};
    trainingData.forEach(item => {
        labelCounts[item.label] = (labelCounts[item.label] || 0) + 1;
    });

    console.log("\nLabel distribution:");
    Object.entries(labelCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([label, count]) => {
            console.log(`  ${label}: ${count}`);
        });

    console.log("\nTraining data saved to training_data.json");
}

createTrainingDataset().catch(console.error);
