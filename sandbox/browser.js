import { chromium } from "playwright";


const cookeString = `[
{
    "domain": ".x.com",
    "expirationDate": 1763606552,
    "hostOnly": false,
    "httpOnly": true,
    "name": "__cf_bm",
    "path": "/",
    "sameSite": "unspecified",
    "secure": true,
    "session": false,
    "storeId": "0",
    "value": "pFnhHmLSfF5lh2wgqIpIxZxydt3ARA8PrwJeyaFBlPI-1763604752.4052088-1.0.1.1-SwawH.uzN7yqq.tCI0k13cTnowse3Vvd_N_B8zamD_HPpIbiDmsTxg7u.3Kw5tWn.fyK__ZCV61zETq4momXZRgwZIagyEnvjaQWWGHb8.F3zJETYVY3ylaR1jscK6wG",
    "id": 1
},
{
    "domain": ".x.com",
    "expirationDate": 1798164743,
    "hostOnly": false,
    "httpOnly": false,
    "name": "__cuid",
    "path": "/",
    "sameSite": "lax",
    "secure": false,
    "session": false,
    "storeId": "0",
    "value": "0d02be0e41a64632823e0b85e3dae640",
    "id": 2
},
{
    "domain": ".x.com",
    "expirationDate": 1798047853,
    "hostOnly": false,
    "httpOnly": true,
    "name": "auth_token",
    "path": "/",
    "sameSite": "no_restriction",
    "secure": true,
    "session": false,
    "storeId": "0",
    "value": "31c5758238ee2d09228b6cfbfab0026df01e7d9d",
    "id": 3
},
{
    "domain": ".x.com",
    "expirationDate": 1798047854,
    "hostOnly": false,
    "httpOnly": false,
    "name": "ct0",
    "path": "/",
    "sameSite": "lax",
    "secure": true,
    "session": false,
    "storeId": "0",
    "value": "affee755b8864e191186bc2675f1e42c50cb7584919b36b84ac795663578dd70316f1c3312e3c509d59b8f189f167f2ac2c2db5a9d394611d16b2d2889b842c042024b075586386ed4952800b5852c8f",
    "id": 4
},
{
    "domain": ".x.com",
    "expirationDate": 1779156749,
    "hostOnly": false,
    "httpOnly": false,
    "name": "d_prefs",
    "path": "/",
    "sameSite": "unspecified",
    "secure": true,
    "session": false,
    "storeId": "0",
    "value": "MToxLGNvbnNlbnRfdmVyc2lvbjoyLHRleHRfdmVyc2lvbjoxMDAw",
    "id": 5
},
{
    "domain": ".x.com",
    "expirationDate": 1798047798,
    "hostOnly": false,
    "httpOnly": false,
    "name": "guest_id",
    "path": "/",
    "sameSite": "no_restriction",
    "secure": true,
    "session": false,
    "storeId": "0",
    "value": "v1%3A176348779882797716",
    "id": 6
},
{
    "domain": ".x.com",
    "expirationDate": 1797819152,
    "hostOnly": false,
    "httpOnly": false,
    "name": "guest_id_ads",
    "path": "/",
    "sameSite": "no_restriction",
    "secure": true,
    "session": false,
    "storeId": "0",
    "value": "v1%3A176348779882797716",
    "id": 7
},
{
    "domain": ".x.com",
    "expirationDate": 1797819152,
    "hostOnly": false,
    "httpOnly": false,
    "name": "guest_id_marketing",
    "path": "/",
    "sameSite": "no_restriction",
    "secure": true,
    "session": false,
    "storeId": "0",
    "value": "v1%3A176348779882797716",
    "id": 8
},
{
    "domain": ".x.com",
    "expirationDate": 1798047853,
    "hostOnly": false,
    "httpOnly": true,
    "name": "kdt",
    "path": "/",
    "sameSite": "unspecified",
    "secure": true,
    "session": false,
    "storeId": "0",
    "value": "l2zJXPdh1qhvmLkEnJlZaKGeJz1O7tIHQNTh60GB",
    "id": 9
},
{
    "domain": ".x.com",
    "expirationDate": 1797819152,
    "hostOnly": false,
    "httpOnly": false,
    "name": "personalization_id",
    "path": "/",
    "sameSite": "no_restriction",
    "secure": true,
    "session": false,
    "storeId": "0",
    "value": "\\"v1_CtWUw67dZgeAboHoT5P46Q==\\"",
    "id": 10
},
{
    "domain": ".x.com",
    "expirationDate": 1795140748,
    "hostOnly": false,
    "httpOnly": false,
    "name": "twid",
    "path": "/",
    "sameSite": "no_restriction",
    "secure": true,
    "session": false,
    "storeId": "0",
    "value": "u%3D1053239728311558144",
    "id": 11
},
{
    "domain": "x.com",
    "expirationDate": 1779039806,
    "hostOnly": true,
    "httpOnly": false,
    "name": "g_state",
    "path": "/",
    "sameSite": "unspecified",
    "secure": false,
    "session": false,
    "storeId": "0",
    "value": "{\\"i_l\\":0,\\"i_ll\\":1763487806871,\\"i_b\\":\\"X5+/GANUD0kglWxtR+nBAbgRwe0TgOSSbku6KG6IbLo\\"}",
    "id": 12
},
{
    "domain": "x.com",
    "hostOnly": true,
    "httpOnly": true,
    "name": "lang",
    "path": "/",
    "sameSite": "unspecified",
    "secure": true,
    "session": true,
    "storeId": "0",
    "value": "en",
    "id": 13
}
]`

function normalizeCookies(cookies) {
    return cookies.map(c => {
        let sameSite = c.sameSite;

        switch (sameSite) {
            case 'no_restriction':
                sameSite = 'None';
                break;
            case 'lax':
                sameSite = 'Lax';
                break;
            case 'strict':
                sameSite = 'Strict';
                break;
            default:
                sameSite = 'Lax';
        }

        return {
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path || '/',
            httpOnly: c.httpOnly,
            secure: c.secure,
            expires: c.expirationDate ? Math.floor(c.expirationDate) : undefined,
            sameSite
        };
    });
}



function handleTweets(apiResponse) {
    try {
        let instructions =
            apiResponse?.data?.home?.home_timeline_urt?.instructions ||
            apiResponse?.data?.threaded_conversation_with_injections_v2?.instructions ||
            [];

        for (const instruction of instructions) {
            if (!instruction.entries) continue;

            for (const entry of instruction.entries) {
                const tweet =
                    entry?.content?.itemContent?.tweet_results?.result ||
                    entry?.content?.itemContent?.tweetResult?.result;

                if (!tweet) continue;

                const id = tweet.rest_id;
                const text =
                    tweet.legacy?.full_text ||
                    tweet.legacy?.text ||
                    tweet.note_tweet?.note_tweet_results?.result?.text ||
                    "";

                // Extract images if any
                const media = tweet.legacy?.entities?.media || [];
                const images = media
                    .filter(m => m.type === 'photo')
                    .map(m => m.media_url_https);

                console.log("\n🐦 TWEET");
                console.log("ID:", id);
                console.log("Text:", text);
                if (images.length > 0) console.log("Images:", images);
            }
        }
    } catch (err) {
        console.error("❌ Failed to parse tweets:", err.message);
    }
}


(async () => {
    const cookies = normalizeCookies(JSON.parse(cookeString));

    const browser = await chromium.launch({ headless: false });

    const context = await browser.newContext({
        // Very important for Twitter/X
        userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    });

    await context.addCookies(cookies);

    const page = await context.newPage();


    // 🔥 Intercept Tweet API Requests (GraphQL)
    await page.route('**/i/api/graphql/**', async (route, request) => {
        console.log("➡️ REQUEST:", request.url());
        route.continue();
    });

    // 🔥 Read Tweet API Responses
    page.on("response", async (res) => {
        const url = res.url();

        if (url.includes('/i/api/graphql/')) {
            try {
                const json = await res.json();

                // Detect Timeline/Detail tweet payloads
                if (
                    json?.data?.home?.home_timeline_urt ||
                    json?.data?.threaded_conversation_with_injections_v2
                ) {
                    console.log("⬅️ RESPONSE:", url);
                    handleTweets(json);
                }
            } catch (e) {
                // Some GraphQL endpoints don't return JSON
            }
        }
    });



    await page.goto('https://x.com/home');

    console.log("🔥 Logged in");

    // --------------------------
    // STEP 1: click first tweet
    // --------------------------
    const firstTweet = page.locator('article[data-testid="tweet"]').first();
    await firstTweet.waitFor({ timeout: 15000 });

    await firstTweet.click();
    console.log("🟦 Opened first tweet");

    // --------------------------
    // STEP 2: click "reply" button
    // --------------------------
    const replyButton = page.locator('article[data-testid="tweet"] button[data-testid="reply"]').first();
    await replyButton.waitFor();
    await replyButton.click();
    console.log("🟨 Reply button clicked");

    // --------------------------
    // STEP 3: wait for modal
    // --------------------------
    await page.waitForSelector('div[role="dialog"]', { timeout: 15000 });
    console.log("🟪 Reply modal opened");

    const replyBox = replyModal.locator(
        'div[contenteditable="true"][data-testid="tweetTextarea_0"]'
    );

    await replyBox.waitFor();
    await replyBox.click();
    await replyBox.type("This is an automated reply (not sending).", { delay: 25 });

    console.log("🟩 Typed reply into modal successfully");
})();