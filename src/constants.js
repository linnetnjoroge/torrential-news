export const NEEDS = 'Needs verification';

// The column order here is the order used for Google Sheet / Excel / CSV.
export const COLUMNS = [
  { key: 'dateAdded', label: 'Date Added' },
  { key: 'publishedDate', label: 'Published Date' },
  { key: 'title', label: 'Title' },
  { key: 'source', label: 'Source / Author' },
  { key: 'organization', label: 'Organization' },
  { key: 'sourceType', label: 'Source Type' },
  { key: 'category', label: 'Category' },
  { key: 'url', label: 'URL' },
  { key: 'summary', label: 'Summary' },
  { key: 'whyItMatters', label: 'Why It Matters' },
  { key: 'keySignal', label: 'Key Signal' },
  { key: 'signalStrength', label: 'Signal Strength' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'priority', label: 'Priority' },
  { key: 'tags', label: 'Tags' },
  { key: 'status', label: 'Status' },
  { key: 'recommendedAction', label: 'Recommended Action' },
  { key: 'notes', label: 'Notes' },
  { key: 'verificationStatus', label: 'Verification Status' },
];

export const CATEGORIES = [
  'AI Economics',
  'AI Models',
  'AI Agents & Tools',
  'AI Infrastructure',
  'Enterprise Software',
  'Vertical B2B Software',
  'Investor / Operator Commentary',
  'Company-Building Lessons',
  'Software Economics',
  'GTM / Distribution',
  'Other',
];

export const SOURCE_TYPES = [
  'X Post',
  'LinkedIn Post',
  'Podcast',
  'Newsletter',
  'Blog',
  'Investor Presentation',
  'Founder/Operator Interview',
  'Press Release',
  'Other',
];

export const PRIORITIES = ['Core', 'Secondary', 'Monitor', 'Needs Review'];
export const LEVELS = ['High', 'Medium', 'Low'];
export const VERIFICATION = ['Verified from source', 'Needs verification', 'Missing source'];
export const STATUSES = ['New', 'Reviewed', 'Saved', 'Use in Weekly Brief', 'Archived'];

// AI Health Snapshot themes. An entry counts toward a theme when its Category
// matches, or when one of its Tags matches a keyword.
export const THEMES = [
  { name: 'AI Revenue', categories: ['AI Economics'], keywords: ['revenue', 'arr', 'monetization', 'ai revenue'] },
  { name: 'AI Infrastructure', categories: ['AI Infrastructure'], keywords: ['infrastructure', 'gpu', 'compute', 'data center', 'inference', 'chips'] },
  { name: 'AI Models', categories: ['AI Models'], keywords: ['llm', 'foundation model', 'frontier model', 'ai models'] },
  { name: 'AI Agents', categories: ['AI Agents & Tools'], keywords: ['agent', 'agents', 'agentic'] },
  { name: 'Enterprise Adoption', categories: ['Enterprise Software'], keywords: ['adoption', 'enterprise', 'deployment'] },
  { name: 'Vertical Software', categories: ['Vertical B2B Software'], keywords: ['vertical', 'vertical saas', 'vertical software'] },
  { name: 'Software Economics', categories: ['Software Economics'], keywords: ['pricing', 'margin', 'seat', 'saas', 'unit economics'] },
];

// Direction is read from tags. Add the tag "positive", "neutral" or "watch" to control it.
export const DIRECTION_TAGS = ['positive', 'neutral', 'watch'];
export const POSITIVE_WORDS = ['bullish', 'acceleration', 'accelerating', 'growth', 'tailwind'];
export const WATCH_WORDS = ['risk', 'bearish', 'slowdown', 'concern', 'headwind', 'bubble'];

// Starting watchlist: names only. Everything else says "Needs verification"
// until you add details (we never guess organizations or focus areas).
export const DEFAULT_WATCHLIST_NAMES = [
  'Brad Gerstner',
  'Greg Jensen',
  'Cathie Wood',
  'Philippe Trounev',
  'Altimeter',
  'Sarah Guo',
  'Elad Gil',
  'Aaron Levie',
  'Martin Casado',
  'Luke Sophinos',
  'Jason Lemkin',
  'Andrew Ng',
  'Ethan Mollick',
];
