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
  updatedAt: string;
  sources: { title: string; url: string }[];
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
    updatedAt: '2026-11-02',
    sources: [{ title: 'PBS News · Experts’ tips for parents of young children (October 2026)', url: 'https://www.pbs.org/newshour/education/helpful-or-harmful-when-it-comes-to-ai-and-young-kids-experts-have-these-tips-for-parents' }],
    body: [
      { type: 'p', text: 'If AI feels both exciting and unsettling, you are not behind. You are paying attention. Your child does not need you to predict the future or explain every new product. They need a grown-up who helps them ask good questions.' },
      { type: 'h2', text: 'Start with one simple explanation' },
      { type: 'p', text: 'AI is a broad name for computer systems that learn patterns from examples. Some recognize pictures or recommend videos. Generative AI makes new text, images or other content from those patterns. A useful explanation for a child is: “It has learned from lots of examples, and now it makes a guess. We still need to check that guess.”' },
      { type: 'h2', text: 'A confident answer is not a checked answer' },
      { type: 'p', text: 'AI can produce a helpful explanation and then invent a detail in the next sentence. It can repeat unfair patterns in its examples. Friendly words do not make it a person, and polished pictures do not make a scene real. These are reasons to practice judgment—not reasons to expect your child to spot every problem alone.' },
      { type: 'h2', text: 'What the recent conversation tells us' },
      { type: 'p', text: 'October 2026 reporting from PBS focused on young children, not just teens. Experts described the AI children already encounter and emphasized age-appropriate conversations. They also noted that research on young children and at-home AI is still developing. That uncertainty matters: no single tool or article can promise what AI use will mean for every child.' },
      { type: 'h2', text: 'Try a five-minute family check' },
      { type: 'list', items: ['Choose an age-appropriate tool together and check its age requirements. An adult account is not a substitute for those requirements.', 'Use a made-up question with no names, photos, school details or location.', 'Pick one claim in the answer and check it against a book or a reliable source.', 'Ask: “What was useful? What did we decide ourselves?” Then put the screen away.'] },
      { type: 'h2', text: 'The goal is good judgment, not early expertise' },
      { type: 'p', text: 'For ages 5–6, keep the explanation concrete: a computer can guess and get things wrong. For ages 7–9, compare examples and look for mistakes together. For ages 10–12, discuss where information came from, what is missing, and who should make the final choice. These are conversation ideas, not developmental assessments. Curiosity, privacy and independent thinking matter more than keeping up with every AI headline.' },
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
    updatedAt: '2026-11-02',
    sources: [
      { title: 'BBC News · Children’s photos and AI privacy (October 2026)', url: 'https://www.bbc.com/news/articles/crpdgz2nqe59o' },
      { title: 'University of Oxford · Responsible pupil-data research (October 2026)', url: 'https://www.education.ox.ac.uk/news/research-project-to-inform-policy-on-the-responsible-use-of-childrens-data-in-ai/' },
    ],
    body: [
      { type: 'p', text: 'The best family rules are short enough to remember and kind enough that a child will tell you when something goes wrong. You do not need a new rule for every AI product. Start with five boundaries and revisit them as your child grows.' },
      { type: 'h2', text: '1. We try new tools together' },
      { type: 'p', text: 'A grown-up checks the tool’s age requirements, privacy settings and purpose before a child uses it. Choose a short activity in a shared space. Being nearby lets you help with confusing answers; it does not guarantee that every output is safe.' },
      { type: 'h2', text: '2. Real-life details stay out' },
      { type: 'p', text: 'Use invented names and places. Keep full names, schools, home addresses, passwords and family photos out of prompts. BBC reporting in October raised questions about how uploaded children’s photos might be stored or reused. Settings differ by service, so do not assume a private-looking chat or a training opt-out answers every privacy question.' },
      { type: 'h2', text: '3. We check before we trust' },
      { type: 'p', text: 'An AI answer is a starting point, not proof. Check important facts with a trusted adult and reliable sources. Health, safety and money decisions belong with people qualified to help—not an AI guess. Celebrate “I’m not sure” as a smart response.' },
      { type: 'h2', text: '4. People stay in charge' },
      { type: 'p', text: 'AI is a tool, not a person or a replacement for friendship. Your child’s ideas, choices and words should remain theirs. Ask them to explain what they made and what the tool contributed. Follow school rules about AI and authorship rather than treating generated work as their own.' },
      { type: 'h2', text: '5. We stop and tell, without getting in trouble' },
      { type: 'p', text: 'If a response feels scary, rude, too personal or confusing, stop the activity and tell a grown-up. Make this promise explicit: “You will not be in trouble for showing me.” You can close the tool, check reporting options together and choose something else.' },
      { type: 'h2', text: 'Three questions to ask your school' },
      { type: 'list', items: ['Which AI tools will my child use, and what is the learning purpose?', 'What pupil information or images leave the school, and how are they stored, shared or used for training?', 'How can families ask questions or raise a concern, and what alternatives are available?'] },
      { type: 'p', text: 'Oxford announced a pupil-data research project in October 2026. It is a reminder that governance questions are still being worked through, not evidence that new protections are already in place. You can ask practical questions now without needing to become a privacy expert.' },
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
    updatedAt: '2026-11-02',
    sources: [
      { title: 'PBS News · Talking with young children about AI (October 2026)', url: 'https://www.pbs.org/newshour/education/helpful-or-harmful-when-it-comes-to-ai-and-young-kids-experts-have-these-tips-for-parents' },
      { title: 'Fairplay · Proposed student-first AI policy (October 2026)', url: 'https://fairplayforkids.org/student-first-ai-policy-offers-model-for-districts-nationwide-as-evidence-mounts-of-ai-harms/' },
    ],
    body: [
      { type: 'p', text: 'A good AI conversation does not begin with a lecture. It begins with something your child noticed: a surprising picture, a silly answer, a recommendation or a character they created. Ask one question and give them room to think.' },
      { type: 'h2', text: 'When your child asks, “Is it real?”' },
      { type: 'p', text: 'Try: “A computer made that. It might look real, but we need to find out where it came from.” Look at the source together. Do not turn this into a test your child must pass: convincing images can fool adults too.' },
      { type: 'h2', text: 'When the computer sounds certain' },
      { type: 'p', text: 'Try: “It sounds sure. How could we check?” Choose one small claim and look it up in a book or a trustworthy source. If you cannot verify it, model the answer “We don’t know yet.” Catching a mistake can be playful rather than a warning that the whole activity was bad.' },
      { type: 'h2', text: 'When they are proud of a creation' },
      { type: 'p', text: 'Try: “Tell me about the part you chose.” Ask what they imagined, changed or disagreed with. Praise their decisions and effort, not just how polished the result looks. If AI supplied part of the work, talk honestly about that contribution.' },
      { type: 'h2', text: 'When they say, “My class uses it”' },
      { type: 'p', text: 'Try: “What does it help you practice, and what does your teacher want you to do yourself?” Ask the school about tools and safeguards without making your child responsible for explaining policy. In October, advocacy group Fairplay released a proposed student-first AI policy. It is one viewpoint in the debate—not a national rule. Families can ask for evidence and clear boundaries while staying open to useful, age-appropriate activities.' },
      { type: 'h2', text: 'Keep it small for their age' },
      { type: 'list', items: ['Ages 5–6: “Does the computer know you, or is it making a guess?” Keep it concrete and adult-led.', 'Ages 7–9: “What examples might have taught it that?” Compare two guesses and notice differences.', 'Ages 10–12: “Who made this, what might be missing, and how would we check?” Discuss sources and fairness without expecting them to solve everything.'] },
      { type: 'h2', text: 'A five-minute conversation for tonight' },
      { type: 'p', text: 'Ask your child to show one idea they made their own. Take turns answering: “What did the tool do? What did I decide? What would I change next time?” End with something away from the screen. You are building a habit of reflection, not adding another assignment.' },
      { type: 'p', text: 'You can be honest about your own concerns: “I’m learning too. Some of this is useful, and some needs care.” Your child does not need you to love every new technology. They need to know that questions are welcome and you will help them navigate.' },
    ],
  },
];

export const getArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug);
