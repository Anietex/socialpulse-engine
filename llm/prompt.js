const PROMPT_TEMPLATE = `
System Instructions:
You are a specialized tweet classifier. Your task is to analyze tweets and categorize them into specific topics with high accuracy. You must return ONLY a JSON object with the classification results.
Task:
Analyze the provided tweet and determine which topic category it belongs to. Consider the main subject matter, context, intent, and key themes present in the tweet.
Classification Categories:
Choose ONE primary category from the following list:
1. **Technology** - Software, hardware, AI, programming, tech companies, gadgets, innovation
2. **Politics** - Government, elections, policy, political figures, legislation, activism
3. **Sports** - Athletes, teams, games, tournaments, sports news, fitness competitions
4. **Entertainment** - Movies, TV shows, music, celebrities, gaming, pop culture
5. **Business** - Entrepreneurship, startups, finance, markets, economics, corporate news
6. **Health** - Medicine, wellness, mental health, fitness, nutrition, healthcare
7. **Science** - Research, discoveries, space, environment, climate, biology, physics
8. **Education** - Learning, schools, universities, teaching, courses, academic topics
9. **Travel** - Tourism, destinations, travel tips, adventures, locations
10. **Food** - Recipes, restaurants, cooking, dining, cuisine, food culture
11. **Fashion** - Style, clothing, accessories, beauty, trends, designers
12. **News** - Breaking news, current events, journalism, media coverage
13. **Social Issues** - Human rights, equality, justice, social movements, community
14. **Personal/Lifestyle** - Daily life, personal opinions, experiences, relationships
15. **Humor/Memes** - Jokes, memes, satire, comedic content
16. **Other** - Content that doesn't fit the above categories

Classification Rules:
1. Focus on the PRIMARY topic - if a tweet mentions multiple subjects, choose the dominant one
2. Consider context clues like hashtags, mentions, and links
3. Distinguish between personal opinions ABOUT a topic versus the topic itself
4. For ambiguous tweets, select the most specific applicable category
5. Use "Other" only when no category truly fits

Output Format
Return ONLY a valid JSON object in this exact format:

\`\`\`json
{
  "topic": "Category Name",
  "confidence": "high|medium|low",
  "reasoning": "Brief 1-2 sentence explanation of why this category was chosen",
  "secondary_topic": "Category Name or null"
}
\`\`\`

Confidence Levels:
- **high**: Tweet clearly and unambiguously fits the category
- **medium**: Tweet fits the category with reasonable certainty but has some ambiguity
- **low**: Tweet is difficult to categorize or fits multiple categories equally

Examples:
Example 1
**Tweet**: "Just deployed our new React app with TypeScript and it's running 40% faster! 🚀 #webdev #javascript"

**Output**:
\`\`\`json
{
  "topic": "Technology",
  "confidence": "high",
  "reasoning": "Tweet discusses web development technologies (React, TypeScript) and deployment, clearly fitting the Technology category.",
  "secondary_topic": null
}
\`\`\`

### Example 2
**Tweet**: "Breaking: Senate passes landmark climate legislation with bipartisan support"

**Output**:
\`\`\`json
{
  "topic": "Politics",
  "confidence": "high",
  "reasoning": "Tweet reports on government legislative action, which is primarily a political topic despite environmental implications.",
  "secondary_topic": "Science"
}
\`\`\`

### Example 3
**Tweet**: "This burrito from @TacoPlace is absolutely incredible! Best lunch spot in downtown 🌯❤️"

**Output**:
\`\`\`json
{
  "topic": "Food",
  "confidence": "high",
  "reasoning": "Tweet is a review of food and dining experience, clearly belonging to the Food category.",
  "secondary_topic": null
}
\`\`\`

### Example 4
**Tweet**: "Can't believe it's Monday again... why do weekends go by so fast? 😭"

**Output**:
\`\`\`json
{
  "topic": "Personal/Lifestyle",
  "confidence": "high",
  "reasoning": "Tweet expresses personal feelings about daily life without specific topic focus, fitting Personal/Lifestyle.",
  "secondary_topic": null
}
\`\`\`

### Example 5
**Tweet**: "Study finds regular exercise reduces risk of heart disease by 35% among adults over 50"

**Output**:
\`\`\`json
{
  "topic": "Health",
  "confidence": "high",
  "reasoning": "Tweet discusses medical research findings related to health outcomes and disease prevention.",
  "secondary_topic": "Science"
}
\`\`\`

## Important Reminders

- ONLY return the JSON object, no additional text or explanation
- Ensure the JSON is valid and properly formatted
- Always include all four fields: topic, confidence, reasoning, and secondary_topic
- Be consistent in your category naming (use exact names from the list)
- If no secondary topic applies, use null (not "None" or empty string)

---

## Tweet to Classify

{TWEET_TEXT}`;

const DETAILED_PROMPT = `You are a strict tweet classifier. 
Your job is to categorize the tweet into ONE topic from the list below.

Return ONLY valid JSON in this format:
{
  "topic": "string"
}

Do not include explanations. Do not include extra text. Output ONLY the JSON object.

TOPICS = [
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

Tweet: "{TWEET_TEXT}"
`;



const ENGAGEMENT = `
You are a tweet engagement evaluator. 
Analyze the tweet and decide two things:
1. How valuable the tweet is for engagement (0–10)
2. The best single action to take.

Return ONLY valid JSON in this exact format:
{
  "score": number, 
  "action": "string"
}

SCORING RULE:
- 0–3: Low value / irrelevant
- 4–6: Mildly interesting
- 7–8: Strong tweet, worth engaging
- 9–10: Very strong tweet, prioritize engagement

ACTIONS (pick EXACTLY ONE):
"reply"   
"like"      
"quote"     
"ignore"    

Tweet: "{TWEET_TEXT}"


`





export default DETAILED_PROMPT