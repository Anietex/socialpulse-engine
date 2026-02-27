import { getLlama, LlamaChatSession } from "node-llama-cpp";
import fs from "fs/promises";
import PROMPT_TEMPLATE from "./prompt.js";



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

const TOPICS = [
    "Technology","Programming","AI","Gadgets","Cybersecurity","Data Science","Cloud",
    "Business","Startups","Entrepreneurship","Marketing","Finance","Investing","Crypto",
    "Economy","Ecommerce","Productivity",

    "Politics","Elections","Government","Policy","International Relations","Activism",

    "News","World News","Local News","Weather","Crime","Breaking News",

    "Sports","Football","Basketball","Soccer","Tennis","Combat Sports","Athletics",
    "Esports",

    "Entertainment","Movies","TV","Music","Gaming","Celebrities","Anime","Comics",

    "Science","Space","Biology","Physics","Environment","Energy",

    "Health","Fitness","Nutrition","Mental Health","Medicine",

    "Education","Careers","Self-Improvement","Books",

    "Travel","Tourism","Nature","Photography",

    "Food","Cooking","Restaurants",

    "Fashion","Beauty","Lifestyle",

    "Relationships","Parenting","Culture","Religion",

    "Memes","Humor","NSFW","Random","Other"
]



// Topic inference function
async function inferTopic(model, tweet) {
    // Create a fresh context and session for each tweet to avoid context accumulation
    const context = await model.createContext({
        contextSize: 500,
    });
    const session = new LlamaChatSession({
        contextSequence: context.getSequence(),
    });

//     const prompt = `You are a precise tweet classifier. Classify this tweet into EXACTLY ONE category from the list below.
//
// ALLOWED CATEGORIES:
// ${CATEGORIES.join(', ')}
//
// INSTRUCTIONS:
// - Choose the SINGLE BEST category that matches the tweet's main topic
// - If unclear or doesn't fit any category, use "none"
// - Return ONLY the category name, nothing else
// - Do NOT explain your choice
//
// Tweet: "${tweet}"
//
// Category:`;


    const prompt = PROMPT_TEMPLATE.replace('{TWEET_TEXT}', tweet);

    const response = await session.prompt(prompt, {
        maxTokens: 50,
        temperature: 0,
    });



    // Dispose context to free memory
    await context.dispose();


    return response

    // Clean up the response - remove "Category:" prefix and extra text
    let cleaned = response.trim();
    if (cleaned.toLowerCase().startsWith('category:')) {
        cleaned = cleaned.substring(9).trim();
    }
    // Take only the first line if there are multiple
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
    //
    // // If not in allowed list, default to "none"
    // if (!allowedCategories.includes(cleaned)) {
    //     console.log(`  ⚠️  Invalid category "${cleaned}" - defaulting to "none"`);
    //     cleaned = 'none';
    // }

    return {};
}

// Main classification function
async function classifyTweets() {
    console.log("Starting tweet classification...\n");
    const startTime = Date.now();

    // Load tweets
    const tweetsData = JSON.parse(
        await fs.readFile("./tweets.json", "utf-8")
    );
    const tweets = tweetsData.tweets.splice(100, 100);
    console.log(`Loaded ${tweets.length} tweets\n`);

    // Initialize LLM (once for all tweets)
    const llama = await getLlama();
    const model = await llama.loadModel({
        modelPath: "./models/qwen3-4b/Qwen3-4B-Instruct-2507-Q4_K_M.gguf",
    });

    // Classify tweets
    const categories = {};
    let processed = 0;

    for (const tweet of tweets) {
        const res = await inferTopic(model, tweet.text);

        console.log(JSON.stringify({
            res,
            tweet: tweet.text,
        }, null, 2));

        // Track category counts
        if (!categories[res.topic]) {
            categories[res.topic] = [];
        }
        categories[res.topic].push({
            text: tweet.text,
            user: tweet.user.handle,
            url: tweet.url,
        });
        //
        processed++;
        //
        // // Log progress every 50 tweets
        // if (processed % 50 === 0) {
        //     console.log(`Processed ${processed}/${tweets.length} tweets...`);
        // }
        //
        // // Log category after each classification
        // console.log(`[${processed}] Category: ${category} | Tweet: ${tweet.text.substring(0, 60)}...`);
    }

    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    //
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

    // // Sort categories by count
    // const sortedCategories = Object.entries(categories).sort(
    //     (a, b) => b[1].length - a[1].length
    // );
    //
    // for (const [category, items] of sortedCategories) {
    //     console.log(`\n${category}: ${items.length} tweets`);
    //     console.log("-".repeat(40));
    //     // Show first 3 examples
    //     items.slice(0, 3).forEach((item, idx) => {
    //         console.log(`  ${idx + 1}. ${item.text.substring(0, 80)}...`);
    //         console.log(`     @${item.user}`);
    //     });
    //     if (items.length > 3) {
    //         console.log(`  ... and ${items.length - 3} more`);
    //     }
    // }
    //
    // console.log("\n" + "=".repeat(60));
}

// Run classification
classifyTweets().catch(console.error);
/***
 Working Models

 modelPath: "/Users/aniefon/.cache/lm-studio/models/TheBloke/Mistral-7B-Instruct-v0.1-GGUF/mistral-7b-instruct-v0.1.Q4_K_S.gguf",
Warning error




 */