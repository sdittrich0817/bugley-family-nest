import nightSky from "@/assets/illustrations/night-sky.jpg";
import fieldJournal from "@/assets/illustrations/field-journal.jpg";
import kitchenDusk from "@/assets/illustrations/kitchen-dusk.jpg";

/**
 * Parent articles for /resources. To add one, append an object here.
 * Body blocks: { type: "p" | "h2", text } or { type: "list", items }.
 */
export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "list"; items: string[] };

export interface Article {
  slug: string;
  title: string;
  summary: string;
  readMinutes: number;
  category: string;
  image: string;
  imageAlt: string;
  body: ArticleBlock[];
}

export const ARTICLES: Article[] = [
  {
    slug: "what-is-ai-guide-for-parents",
    title: "What is AI? A 5-minute guide for parents",
    summary: "A plain-English look at what AI is, what it isn't, and why your kids already bump into it every day.",
    readMinutes: 5,
    category: "Getting started",
    image: nightSky,
    imageAlt: "A soft night sky dotted with tiny lights",
    body: [
      { type: "p", text: "Placeholder article. AI is a computer program that learns patterns from lots of examples, then uses those patterns to make guesses: the next word, a picture, an answer." },
      { type: "h2", text: "What AI is good at" },
      { type: "list", items: ["Spotting patterns quickly", "Drafting words and pictures", "Answering common questions"] },
      { type: "h2", text: "What AI gets wrong" },
      { type: "p", text: "It can sound sure and still be wrong. That's why we teach kids to check, question, and think for themselves." },
    ],
  },
  {
    slug: "ai-safety-rules-for-your-family",
    title: "5 AI safety rules for your family",
    summary: "Five simple house rules that keep AI fun, honest, and safe for every age at your table.",
    readMinutes: 4,
    category: "Safety",
    image: fieldJournal,
    imageAlt: "A hand-drawn field journal sketch",
    body: [
      { type: "p", text: "Placeholder article. A few clear rules go a long way. Here are five to start with." },
      { type: "list", items: ["Use AI where a grown-up can see", "Never share real names, addresses, or photos", "AI can be wrong, so check it", "AI is a tool, not a friend", "Tell a parent if something feels off"] },
      { type: "p", text: "Post them on the fridge and revisit them together every few months." },
    ],
  },
  {
    slug: "how-to-talk-with-kids-about-ai",
    title: "How to talk with your kids about AI",
    summary: "Easy conversation starters for dinner, the car, or bedtime, with no tech degree required.",
    readMinutes: 6,
    category: "Family talk",
    image: kitchenDusk,
    imageAlt: "A family kitchen table at dusk",
    body: [
      { type: "p", text: "Placeholder article. You don't need all the answers. Curiosity is enough to start." },
      { type: "h2", text: "Questions to try" },
      { type: "list", items: ["Where do you think you saw AI today?", "How could we tell if an answer is wrong?", "What should a person decide, not a computer?"] },
      { type: "p", text: "Listen more than you explain. Their questions will lead the way." },
    ],
  },
];

export const getArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug);
