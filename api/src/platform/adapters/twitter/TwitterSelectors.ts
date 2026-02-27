/**
 * Twitter DOM selectors
 * Centralized to make updates easier when Twitter changes their UI
 *
 * Note: Twitter frequently updates their data-testid attributes,
 * so these selectors may need periodic maintenance.
 */
export const TwitterSelectors = {
  // Action buttons
  likeButton: 'button[data-testid="like"]',
  unlikeButton: 'button[data-testid="unlike"]',
  replyButton: 'button[data-testid="reply"]',
  retweetButton: 'button[data-testid="retweet"]',
  unretweet: 'button[data-testid="unretweet"]',

  // Reply flow
  replyTextbox: 'div[role="textbox"]',
  replyModal: 'div[data-testid="replyModal"]',

  // Quote flow
  quoteButton: 'a[role="menuitem"][href*="/compose/post"]',
  quoteTextbox: 'div[data-testid="tweetTextarea_0"]',

  // Submit buttons
  submitButton: 'button[data-testid="tweetButton"]:not([disabled])',
  tweetButtonInline: 'button[data-testid="tweetButtonInline"]',

  // Confirm actions
  retweetConfirm: 'div[data-testid="retweetConfirm"]',
  unretweetConfirm: 'div[data-testid="unretweetConfirm"]',

  // Tweet elements
  tweet: 'article[data-testid="tweet"]',
  tweetText: 'div[data-testid="tweetText"]',
  tweetTextarea: 'div[data-testid="tweetTextarea_0"]',
  userName: 'div[data-testid="User-Name"]',
  userHandle: 'div[data-testid="User-Name"] a[role="link"]',

  // Media
  tweetPhoto: 'div[data-testid="tweetPhoto"]',
  tweetVideo: 'div[data-testid="videoPlayer"]',

  // Metrics
  replyCount: '[data-testid="reply"]',
  likeCount: '[data-testid="like"]',
  retweetCount: '[data-testid="retweet"]',
  viewCount: 'a[href*="/analytics"] span',

  // Login/Auth
  usernameInput: 'input[autocomplete="username"]',
  passwordInput: 'input[autocomplete="current-password"]',
  loginButton: 'button[data-testid="LoginForm_Login_Button"]',

  // Feed/Timeline
  timeline: 'div[data-testid="primaryColumn"]',
  homeTimeline: 'div[aria-label="Timeline: Your Home Timeline"]',
} as const;

/**
 * Type for selector keys
 */
export type TwitterSelectorKey = keyof typeof TwitterSelectors;
