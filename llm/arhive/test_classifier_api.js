import fs from "fs/promises";

const API_URL = "http://localhost:8000/classify";

async function testClassifier() {
    console.log("Loading tweets...");
    const tweetsData = JSON.parse(await fs.readFile("./tweets.json", "utf-8"));
    const tweets = tweetsData.tweets.slice(0, 100); // Test first 100 tweets

    console.log(`Testing classifier API with ${tweets.length} tweets...\n`);

    const startTime = Date.now();

    // Send tweets to classifier API
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            tweets: tweets.map((t, i) => ({ id: String(i + 1), text: t.text }))
        })
    });

    const results = await response.json();
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
    console.log("=".repeat(60));
    console.log("CLASSIFICATION RESULTS");
    console.log("=".repeat(60));
    console.log(`Total tweets: ${results.length}`);
    console.log(`Time taken: ${totalTime.toFixed(2)}s`);
    console.log(`Speed: ${(totalTime / results.length * 1000).toFixed(0)}ms per tweet`);
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
    results.slice(0, 10).forEach((result, i) => {
        const confidence = (result.confidence * 100).toFixed(1);
        console.log(`${(i + 1).toString().padStart(2)}. [${result.category}] (${confidence}%) ${result.text.substring(0, 60)}...`);
    });

    // Save full results
    await fs.writeFile(
        "./classifier_test_results.json",
        JSON.stringify(results, null, 2)
    );
    console.log("\n✅ Full results saved to classifier_test_results.json");
}

testClassifier().catch(console.error);
