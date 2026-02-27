import { getLlama, LlamaChatSession } from "node-llama-cpp";
import fs from "fs/promises";

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

async function classifyTweet(model, tweet, index, total) {
    const context = await model.createContext({
        contextSize: 500,
    });

    const session = new LlamaChatSession({
        contextSequence: context.getSequence(),
    });

    const prompt = `You are a precise tweet classifier. Classify this tweet into EXACTLY ONE category.

ALLOWED CATEGORIES:
${CATEGORIES.join(', ')}

INSTRUCTIONS:
- Choose the SINGLE BEST category that matches the tweet's main topic
- If the tweet is unclear, random, or doesn't fit any category, use "none"
- Return ONLY the category name, nothing else
- Do NOT explain your choice
- Do NOT use punctuation

EXAMPLES:
Tweet: "Just deployed my React app to production!"
Category: Web Development

Tweet: "Bitcoin just hit $50k!"
Category: Cryptocurrency

Tweet: "Messi scores amazing goal!"
Category: Football

Tweet: "Good morning everyone"
Category: none

NOW CLASSIFY THIS TWEET:
Tweet: "${tweet}"
Category:`;

    try {
        const response = await session.prompt(prompt, {
            maxTokens: 20,
            temperature: 0,
        });

        let category = response.trim();

        // Clean up response
        category = category.split('\n')[0].trim();
        category = category.replace(/[.:;,!?]/g, '');

        // Check if valid category
        const isValid = CATEGORIES.some(cat =>
            cat.toLowerCase() === category.toLowerCase()
        );

        if (!isValid) {
            // Try to find closest match
            const match = CATEGORIES.find(cat =>
                category.toLowerCase().includes(cat.toLowerCase()) ||
                cat.toLowerCase().includes(category.toLowerCase())
            );
            category = match || 'none';
        }

        // Normalize to exact category name
        const normalizedCategory = CATEGORIES.find(cat =>
            cat.toLowerCase() === category.toLowerCase()
        ) || 'none';

        console.log(`[${index}/${total}] ${normalizedCategory}`);

        await context.dispose();
        return normalizedCategory;

    } catch (error) {
        console.error(`Error classifying tweet ${index}: ${error.message}`);
        await context.dispose();
        return 'none';
    }
}

async function createTrainingData() {
    console.log("Loading local Qwen 2.5 3B model...");

    const llama = await getLlama();
    const model = await llama.loadModel({
        modelPath: "./models/qwen2.5-3b-instruct-q5_k_m.gguf",
    });

    console.log("Model loaded!");
    console.log("\nLoading tweets...");

    const tweetsData = JSON.parse(await fs.readFile("./tweets.json", "utf-8"));
    const tweets = tweetsData.tweets;

    console.log(`Processing ${tweets.length} tweets...\n`);

    const trainingData = [];
    const startTime = Date.now();

    for (let i = 0; i < tweets.length; i++) {
        const tweet = tweets[i];
        const category = await classifyTweet(model, tweet.text, i + 1, tweets.length);

        trainingData.push({
            text: tweet.text,
            label: category
        });

        // Save progress every 50 tweets
        if ((i + 1) % 50 === 0) {
            await fs.writeFile(
                "./training_data.json",
                JSON.stringify(trainingData, null, 2)
            );
            console.log(`\nProgress saved (${i + 1}/${tweets.length})\n`);
        }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const avgTime = (totalTime / tweets.length).toFixed(2);

    console.log(`\n✅ Completed! Total: ${tweets.length} tweets`);
    console.log(`Time: ${totalTime}s (avg ${avgTime}s per tweet)`);

    // Save final data
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
            const percentage = ((count / tweets.length) * 100).toFixed(1);
            console.log(`  ${label}: ${count} (${percentage}%)`);
        });

    console.log("\nTraining data saved to training_data.json");
}

createTrainingData().catch(console.error);
