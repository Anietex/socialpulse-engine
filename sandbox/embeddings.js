// topic-classifier.js
import { pipeline } from '@xenova/transformers';

// Define your topics/categories
const TOPICS = [
    'sports',
    'technology',
    'politics',
    'entertainment',
    'business',
    'health',
    'food',
    'travel',
    'science',
    'fashion',
    'education',
    'gaming',
    'news',
    'music',
    'other'
];

// Sample tweets with expected topics
const sampleTweets = [
    // Sports
    "Lakers win the championship! What an incredible game! 🏀",
    "Messi scores again! Best player in the world ⚽",
    "Training for my first marathon. Any tips?",
    "NFL draft picks announced today. Exciting lineup!",
    "Tennis finals were absolutely epic. 5 sets of pure drama!",

    // Technology
    "New iPhone features are mind-blowing! 📱",
    "ChatGPT just changed how I work. AI is incredible",
    "Bug in the latest Windows update crashing systems",
    "Learning Python for data science. Great resources?",
    "Blockchain technology will revolutionize finance",
    "Just deployed my app to production using Docker",
    "Cybersecurity breach affects millions of users",

    // Politics
    "Election results coming in. Historic turnout!",
    "New policy will impact healthcare for millions",
    "Senate votes on infrastructure bill tomorrow",
    "Presidential debate starts at 9 PM tonight",
    "Supreme Court ruling expected this week",

    // Entertainment
    "Just finished watching Stranger Things. Mind = blown! 🎬",
    "Concert last night was absolutely amazing!",
    "New Marvel movie breaks box office records",
    "Binge-watched the entire season in one day",
    "Oscars ceremony tonight! Who's your pick?",
    "This new album is fire! 🔥",

    // Business
    "Stock market hits all-time high today 📈",
    "Tesla announces new factory in Texas",
    "Startup raises $50M in Series B funding",
    "Remote work is the future of business",
    "Amazon Prime Day deals are live!",
    "Crypto market volatility continues",

    // Health
    "Started my fitness journey today! 💪",
    "New study shows benefits of Mediterranean diet",
    "Mental health awareness is so important",
    "Just ran 5K for the first time ever!",
    "Yoga has changed my life completely",
    "COVID-19 booster shots now available",

    // Food
    "Best pizza I've ever had! 🍕",
    "Trying this new vegan recipe tonight",
    "Coffee shop recommendation: absolutely perfect latte ☕",
    "Meal prep Sunday complete! Ready for the week",
    "This restaurant has the best sushi in town",
    "Air fryer recipes are game changers!",

    // Travel
    "Just landed in Paris! Can't wait to explore 🗼",
    "Beach vacation was exactly what I needed",
    "Backpacking through Europe this summer",
    "Best travel tips for Japan?",
    "Hotel room with an amazing view!",
    "Flight delayed 3 hours. Airport life...",

    // Science
    "NASA discovers new exoplanet in habitable zone",
    "Breakthrough in cancer research announced",
    "Climate change data shows alarming trends",
    "Quantum computing reaches new milestone",
    "New species discovered in Amazon rainforest",

    // Fashion
    "Fashion week highlights are incredible! 👗",
    "Just got these new sneakers. So comfortable!",
    "Sustainable fashion is the future",
    "This outfit is perfect for fall weather",
    "Vintage shopping finds are the best",

    // Education
    "Finally graduated! 4 years of hard work paid off 🎓",
    "Online learning has been a game changer",
    "Student loan debt is crushing our generation",
    "Teaching kids coding is so rewarding",
    "Just got accepted to my dream university!",

    // Gaming
    "New Zelda game is absolutely perfect! 🎮",
    "Streaming on Twitch tonight at 8 PM",
    "Esports tournament finals were insane!",
    "Just hit level 100. Time for a break...",
    "PS5 restock alert! Go go go!",

    // News
    "Breaking: Major earthquake hits coastal region",
    "Weather alert: Hurricane approaching Florida",
    "Traffic jam on I-95. Avoid if possible",
    "Local school wins state championship",
    "Power outage affects 10,000 homes",

    // Music
    "New Drake album drops tonight! 🎵",
    "Concert tickets sold out in 2 minutes",
    "Learning guitar. Fingers hurt but worth it!",
    "This song has been stuck in my head all day",
    "Festival lineup announced. Can't wait!",

    // Other/Mixed
    "Good morning everyone! Have a great day!",
    "Does anyone know what time the store closes?",
    "Thanks for all the birthday wishes! ❤️",
    "Can't believe it's already Friday!",
    "Random thought: why do we park in driveways?"
];

class TopicClassifier {
    constructor(topics = TOPICS) {
        this.topics = topics;
        this.classifier = null;
        this.stats = {
            totalProcessed: 0,
            totalTime: 0
        };
    }

    async initialize() {
        console.log('🚀 Loading topic classification model...');
        const startTime = Date.now();

        // Zero-shot classification - can classify any topics without training!
        this.classifier = await pipeline(
            'zero-shot-classification',
            'Xenova/distilbert-base-uncased-mnli',
            { quantized: true }
        );

        const loadTime = Date.now() - startTime;
        console.log(`✅ Model loaded in ${loadTime}ms`);
        console.log(`📋 Available topics: ${this.topics.join(', ')}\n`);
    }

    async classifyTweet(tweet) {
        const result = await this.classifier(tweet, this.topics, {
            multi_label: false
        });

        return {
            topic: result.labels[0],
            confidence: result.scores[0],
            allScores: result.labels.map((label, i) => ({
                topic: label,
                score: result.scores[i]
            }))
        };
    }

    async classifyBatch(tweets, batchSize = 32) {
        const results = [];
        const batches = Math.ceil(tweets.length / batchSize);

        console.log(`📊 Processing ${tweets.length} tweets in ${batches} batches...\n`);

        for (let i = 0; i < tweets.length; i += batchSize) {
            const batch = tweets.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;

            const startTime = Date.now();

            // Process each tweet in the batch
            const batchPromises = batch.map(tweet => this.classifyTweet(tweet));
            const batchResults = await Promise.all(batchPromises);

            const batchTime = Date.now() - startTime;
            this.stats.totalTime += batchTime;
            this.stats.totalProcessed += batch.length;

            const throughput = (batch.length / batchTime * 1000).toFixed(0);
            console.log(`Batch ${batchNum}/${batches}: ${batch.length} tweets in ${batchTime}ms (${throughput} tweets/sec)`);

            results.push(...batchResults);
        }

        return results;
    }

    displayResults(tweets, results, limit = 15) {
        console.log('\n📋 Topic Classification Results:\n');
        console.log('═'.repeat(100));

        const topicEmojis = {
            sports: '⚽',
            technology: '💻',
            politics: '🏛️',
            entertainment: '🎬',
            business: '💼',
            health: '💪',
            food: '🍕',
            travel: '✈️',
            science: '🔬',
            fashion: '👗',
            education: '🎓',
            gaming: '🎮',
            news: '📰',
            music: '🎵',
            other: '❓'
        };

        for (let i = 0; i < Math.min(limit, tweets.length); i++) {
            const tweet = tweets[i].substring(0, 65) + (tweets[i].length > 65 ? '...' : '');
            const result = results[i];
            const confidence = (result.confidence * 100).toFixed(1);
            const emoji = topicEmojis[result.topic] || '📌';

            console.log(`${i + 1}. ${emoji} ${result.topic.toUpperCase()} (${confidence}% confidence)`);
            console.log(`   "${tweet}"`);

            // Show top 3 predictions
            const top3 = result.allScores.slice(0, 3);
            const alternatives = top3.slice(1).map(s =>
                `${s.topic} (${(s.score * 100).toFixed(1)}%)`
            ).join(', ');
            if (alternatives) {
                console.log(`   Alternatives: ${alternatives}`);
            }
            console.log();
        }
        console.log('═'.repeat(100));
    }

    analyzeResults(results) {
        const topicCounts = {};
        this.topics.forEach(topic => topicCounts[topic] = 0);

        let totalConfidence = 0;

        results.forEach(result => {
            topicCounts[result.topic]++;
            totalConfidence += result.confidence;
        });

        const avgConfidence = (totalConfidence / results.length * 100).toFixed(1);

        console.log('\n📈 Topic Distribution:\n');

        // Sort by count
        const sorted = Object.entries(topicCounts)
            .sort((a, b) => b[1] - a[1])
            .filter(([_, count]) => count > 0);

        sorted.forEach(([topic, count]) => {
            const percentage = (count / results.length * 100).toFixed(1);
            const bar = '█'.repeat(Math.floor(percentage / 2));
            console.log(`${topic.padEnd(15)} ${count.toString().padStart(3)} (${percentage.toString().padStart(5)}%) ${bar}`);
        });

        console.log(`\nTotal Tweets: ${results.length}`);
        console.log(`Average Confidence: ${avgConfidence}%`);
        console.log(`Unique Topics: ${sorted.length}`);

        return topicCounts;
    }

    getStats() {
        const avgThroughput = (this.stats.totalProcessed / this.stats.totalTime * 1000).toFixed(0);

        return {
            totalProcessed: this.stats.totalProcessed,
            totalTime: this.stats.totalTime,
            averageThroughput: avgThroughput
        };
    }
}

// Main execution
async function main() {
    const classifier = new TopicClassifier();

    try {
        // Initialize the model
        await classifier.initialize();

        // Test with sample tweets
        console.log('🔍 Classifying sample tweets...\n');
        const results = await classifier.classifyBatch(sampleTweets, 16);

        // Display results
        classifier.displayResults(sampleTweets, results, 20);

        // Show topic distribution
        classifier.analyzeResults(results);

        // Show performance stats
        const stats = classifier.getStats();
        console.log('\n⚡ Performance Metrics:\n');
        console.log(`Total Processed: ${stats.totalProcessed} tweets`);
        console.log(`Total Time: ${stats.totalTime}ms`);
        console.log(`Average Throughput: ${stats.averageThroughput} tweets/sec`);

        // Single tweet example
        console.log('\n\n💡 Single Tweet Classification Example:\n');
        const testTweet = "Just got the new iPhone 15! The camera quality is insane 📸";
        const singleResult = await classifier.classifyTweet(testTweet);
        console.log(`Tweet: "${testTweet}"`);
        console.log(`Topic: ${singleResult.topic}`);
        console.log(`Confidence: ${(singleResult.confidence * 100).toFixed(1)}%`);
        console.log('\nTop 3 predictions:');
        singleResult.allScores.slice(0, 3).forEach((s, i) => {
            console.log(`  ${i + 1}. ${s.topic}: ${(s.score * 100).toFixed(1)}%`);
        });

        // High-throughput test
        console.log('\n\n🚀 High-Throughput Test (600 tweets)...\n');
        const largeBatch = [];
        for (let i = 0; i < 600; i++) {
            largeBatch.push(sampleTweets[i % sampleTweets.length]);
        }

        const startTime = Date.now();
        await classifier.classifyBatch(largeBatch, 32);
        const totalTime = Date.now() - startTime;
        const throughput = (600 / totalTime * 1000).toFixed(0);

        console.log(`\n✅ Processed 600 tweets in ${totalTime}ms`);
        console.log(`📊 Throughput: ${throughput} tweets/sec`);

        if (parseInt(throughput) >= 600) {
            console.log('🎉 SUCCESS! Target throughput achieved!');
        } else {
            console.log(`⚠️  Achieved ${throughput} tweets/sec (target: 600)`);
            console.log('💡 Tips: Reduce number of topics, increase batch size, or use faster model');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run the classifier
main();