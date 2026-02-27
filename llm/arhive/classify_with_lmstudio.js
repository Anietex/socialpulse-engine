import fs from "fs/promises";

const API_URL = "http://localhost:1234/v1/chat/completions";

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

async function classifyTweet(tweet, index, total) {
    const prompt = `You are a precise tweet classifier. Classify this tweet into EXACTLY ONE category from the list below.

ALLOWED CATEGORIES:
${CATEGORIES.join(', ')}

INSTRUCTIONS:
- Choose the SINGLE BEST category that matches the tweet's main topic
- If unclear or doesn't fit any category, use "none"
- Return ONLY the category name, nothing else
- Do NOT explain your choice

Tweet: "${tweet}"

Category:`;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [
                    { role: "user", content: prompt }
                ],
                temperature: 0,
                max_tokens: 20,
                stream: false
            })
        });

        const data = await response.json();
        let category = data.choices[0]?.message?.content?.trim() || "none";

        // Clean up response
        category = category.split('\n')[0].trim();
        category = category.replace(/[.:;,!?]/g, '');
        category = category.replace(/^Category:\s*/i, '');

        // Validate category
        const validCategory = CATEGORIES.find(cat =>
            cat.toLowerCase() === category.toLowerCase()
        ) || 'none';

        console.log(`[${index}/${total}] ${validCategory} - ${tweet.substring(0, 50)}...`);

        return validCategory;

    } catch (error) {
        console.error(`Error classifying tweet ${index}: ${error.message}`);
        return 'none';
    }
}

async function classifyTweets() {
    console.log("Loading tweets...");
    const tweetsData = JSON.parse(await fs.readFile("./tweets.json", "utf-8"));
    const tweets = tweetsData.tweets.slice(0, 100); // Test first 100 tweets

    console.log(`Classifying ${tweets.length} tweets using LM Studio API...\n`);

    const startTime = Date.now();
    const results = [];

    for (let i = 0; i < tweets.length; i++) {
        const category = await classifyTweet(tweets[i].text, i + 1, tweets.length);
        results.push({
            id: String(i + 1),
            text: tweets[i].text,
            category: category
        });
    }

    const totalTime = (Date.now() - startTime) / 1000;

    // Analyze results
    const categoryCount = {};
    let validClassifications = 0;

    results.forEach(result => {
        const category = result.category;
        categoryCount[category] = (categoryCount[category] || 0) + 1;
        if (category !== "none") {
            validClassifications++;
        }
    });

    // Print results
    console.log("\n" + "=".repeat(60));
    console.log("CLASSIFICATION RESULTS (LM Studio)");
    console.log("=".repeat(60));
    console.log(`Total tweets: ${results.length}`);
    console.log(`Time taken: ${totalTime.toFixed(2)}s`);
    console.log(`Speed: ${(totalTime / results.length).toFixed(2)}s per tweet`);
    console.log(`Valid classifications: ${validClassifications} (${(validClassifications / results.length * 100).toFixed(1)}%)`);
    console.log(`"None" classifications: ${categoryCount.none || 0} (${((categoryCount.none || 0) / results.length * 100).toFixed(1)}%)`);

    console.log("\nTop 10 Categories:");
    console.log("-".repeat(60));
    Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([category, count]) => {
            const percentage = (count / results.length * 100).toFixed(1);
            console.log(`  ${category.padEnd(30)} ${count.toString().padStart(4)} (${percentage}%)`);
        });

    console.log("\nSample Classifications:");
    console.log("-".repeat(60));
    results.slice(0, 15).forEach((result, i) => {
        console.log(`${(i + 1).toString().padStart(2)}. [${result.category}] ${result.text.substring(0, 70)}...`);
    });

    // Save results
    await fs.writeFile(
        "./lmstudio_classification_results.json",
        JSON.stringify(results, null, 2)
    );
    console.log("\n✅ Results saved to lmstudio_classification_results.json");
}

classifyTweets().catch(console.error);
