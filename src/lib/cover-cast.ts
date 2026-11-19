// Who belongs on a comic cover (A2 cover correction). Pure and deterministic: the child's explicit words decide,
// otherwise the existing default (every main character) stands. One decision feeds both the picture instructions
// and the character check so they can never disagree. Exclusions come only from explicit words; anything unclear
// falls back to the default rather than inventing an exclusion.

export type CoverMember = { id: string; name: string };
export type CoverCast = {
  /** default: no cast instructions; explicit: the child's words decide; ambiguous: unclear, so the default is used. */
  mode: "default" | "explicit" | "ambiguous";
  ids: string[];        // characters drawn with their frozen references (and sent to the check)
  names: string[];      // their names, same order
  excluded: string[];   // names the child's words leave off this cover
  mustShow: string[];   // names the picture instructions require AND the character check requires
  reason: string;       // short, child-text-free explanation for logs/tests
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = (s: string) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ");

const SENTENCE_END = /[.!?;:\n]/;
const BREAK_WORDS = "but|while|because|although|though|whereas|then|so|when|meanwhile|until|after|before";
// Minor clause boundaries end the text a cue may come from.
const MINOR = new RegExp(`[,.!?;:\\n]|\\b(?:${BREAK_WORDS})\\b`, "i");
const DOUBT = /\b(?:maybe|might|perhaps|probably|possibly|if|unless|wonders?|wondering|hopes?|hoping|wish(?:es)?|pretends?|pretending|imagines?|imagining|dreams?|dreaming|not sure|or|could|should|wants? to|plans? to|going to|will)\b/i;

// Explicit exclusion right before a name: "no Luna", "not Luna", "without Luna", "except Luna", "not with Luna".
const NEG_BEFORE = /\b(?:no|not|without|except|excluding|minus|never)\s+(?:the\s+|even\s+)?$|\b(?:not|n't|never)\s+(?:with|near|beside|next to|joined by)\s+(?:the\s+)?$/i;
// Exclusive inclusion right before a name list: "only Pip", "just Pip and Bo", "nobody but Pip".
const ONLY_BEFORE = /\b(?:only|just|nobody but|no one but|no-one but)\s+(?:the\s+)?$/i;
// Strong inclusion right before a name: "with Luna", "both Pip and Luna".
const WITH_BEFORE = /\b(?:with|joined by|together with|both|and also)\s+(?:the\s+)?$/i;

// After a name (same clause): explicit statements that the character is not in this scene.
const NOT_HERE = [
  /\b(?:isn't|wasn't|aren't|weren't|(?:is|was|are|were)\s+not|not)\s+(?:here|there|around|in (?:the|this) (?:picture|cover|scene)|on (?:the|this) cover|with (?:them|him|her|us))\b/i,
  /\b(?:can't|cannot|couldn't|didn't|doesn't|don't|won't|isn't|wasn't|(?:is|was|does|did)\s+not)\s+(?:come|coming|go|going|join|joining|be there|be here)\b/i,
  /\b(?:is|was|are|were|has gone|had gone|went)\s+(?:missing|gone)\b/i,
];
// After a name (same clause): the character is somewhere else ("stayed home", "waits back at the lighthouse").
const ELSEWHERE = [
  /\b(?:stay|stays|stayed|staying|remain|remains|remained|wait|waits|waited|waiting|sleep|sleeps|slept|sleeping|is|was|are|were)\b(?:\s+[\w']+){0,2}?\s+(?:at home|home|behind|back at|back in|elsewhere|somewhere else|far away|away)\b/i,
  /\bleft behind\b/i,
];
// After a name (same clause): this character is the only one ("Pip alone", "Pip is the only one").
const ALONE_AFTER = /\b(?:all\s+)?alone\b|\bby (?:him|her|it|them|my|your)sel(?:f|ves)\b|\bon (?:his|her|its|their) own\b|\b(?:and|with) (?:nobody|no one|no-one) else\b/i;
// "Only Pip ..." is about who is present only when presence follows ("Only Pip is on the cover", "Just Pip on the beach",
// "Only Pip!"); "Only Pip can open the door" says nothing about who is there, so it is treated as unclear.
const ONLY_PRESENCE = /^\s*$|^\s*(?:is|are|was|were)\s+(?:here|there|on|in|at|inside|outside|going|coming|invited|allowed)\b|^\s*(?:goes|go|went|comes|come|came|appears?|appeared|shows? up|showed up|stays?|stayed|sits?|sat|stands?|stood|walks?|walked|flies|flew|swims?|swam|explores?|explored|travels?|travelled|traveled|sets? off|set out|heads?|headed|gets? to go|got to go)\b|^\s*(?:on|in|at|by|under|near|inside|beside|outside)\b|^\s*and (?:the|a|an|his|her|their|some|its)\b/i;
// After a name (same clause): explicit inclusion ("Luna is here too", "Pip and Luna together").
const HERE_AFTER = /\b(?:too|as well|together|also|is here|are here|is there|are there|on the cover|joins|joined|comes along|came along)\b/i;
const JOIN = /^\s*(?:,\s*and|,|and|&|\+)\s*(?:the\s+)?$/i;
const SUBJECT_LEAD = new RegExp(`(?:^|[,.!?;:\\n]|\\b(?:and|${BREAK_WORDS}|now|later|today|first|next|finally)\\b)\\s*(?:(?:only|just|then|now|the|later|finally|so|and)\\s+)*$`, "i");

type Mention = { m: number; start: number; end: number };
type Flags = { excluded: boolean; away: boolean; only: boolean; strong: boolean; uncertain: boolean; mentioned: boolean };

function mentionsOf(text: string, cast: CoverMember[]): Mention[] {
  const found: Mention[] = [];
  cast.forEach((c, m) => {
    const name = c.name.trim();
    if (!name) return;
    for (const x of text.matchAll(new RegExp(`(?<![A-Za-z])${esc(name)}(?:'s)?(?![A-Za-z])`, "gi"))) found.push({ m, start: x.index!, end: x.index! + x[0].length });
  });
  // Longer names win where they overlap ("Luna Moth" over "Luna").
  found.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  return found.filter((f, i) => !found.slice(0, i).some(o => f.start < o.end && o.start < f.end));
}

const clauseStart = (text: string, at: number) => {
  let s = 0;
  for (const x of text.slice(0, at).matchAll(new RegExp(MINOR.source, "gi"))) s = x.index! + x[0].length;
  return s;
};
const clauseEnd = (text: string, from: number) => {
  const x = text.slice(from).match(MINOR);
  return x?.index === undefined ? text.length : from + x.index;
};
const sentenceOf = (text: string, at: number) => {
  let s = 0;
  for (let i = at - 1; i >= 0; i--) if (SENTENCE_END.test(text[i]!)) { s = i + 1; break; }
  let e = text.length;
  for (let i = at; i < text.length; i++) if (SENTENCE_END.test(text[i]!)) { e = i + 1; break; }
  return text.slice(s, e);
};

/** Decide the cover cast from the cover words (title + first panel, or the child's own cover words). */
export function intendedCoverCast(coverWords: string, cast: CoverMember[]): CoverCast {
  const members = cast.filter((c, i) => c.name.trim() && cast.findIndex(o => o.id === c.id) === i);
  const all = (mode: CoverCast["mode"], reason: string): CoverCast => {
    const names = members.map(c => c.name.trim());
    return { mode, ids: members.map(c => c.id), names, excluded: [], mustShow: names.length > 1 ? names : [], reason };
  };
  if (!members.length) return all("default", "no characters");
  const text = norm(coverWords ?? "");
  const ms = mentionsOf(text, members);
  if (!ms.length) return all("default", "no character named");

  // Group names joined by "and"/commas so one cue covers the whole list ("Pip and Bo stayed home").
  const groups: Mention[][] = [];
  for (const x of ms) {
    const g = groups[groups.length - 1];
    const last = g?.[g.length - 1];
    if (g && last && JOIN.test(text.slice(last.end, x.start))) g.push(x); else groups.push([x]);
  }

  const flags: Flags[] = members.map(() => ({ excluded: false, away: false, only: false, strong: false, uncertain: false, mentioned: false }));
  const onlyLists: string[] = [];
  for (const g of groups) {
    const first = g[0]!, last = g[g.length - 1]!;
    // A possessive ("Luna's hat is not here") is about the thing, not the character.
    const own = (x: Mention) => /'s$/i.test(text.slice(x.start, x.end));
    const before = own(first) ? "" : text.slice(clauseStart(text, first.start), first.start);
    const next = ms.find(x => x.start >= last.end);
    const after = own(last) ? "" : text.slice(last.end, Math.min(clauseEnd(text, last.end), next?.start ?? text.length));
    const sentence = sentenceOf(text, first.start);
    const doubtful = DOUBT.test(text.slice(clauseStart(text, first.start), clauseEnd(text, last.end))) || sentence.trim().endsWith("?");
    const subject = SUBJECT_LEAD.test(text.slice(0, first.start));
    const ids = g.map(x => x.m);
    const set = (k: keyof Flags) => ids.forEach(i => { flags[i]![k] = true; });
    set("mentioned");

    const neg = NEG_BEFORE.test(before);
    const onlyWord = ONLY_BEFORE.test(before);
    if (onlyWord && !ONLY_PRESENCE.test(after)) { set("uncertain"); continue; }
    const only = onlyWord || (ALONE_AFTER.test(after) && subject);
    const notHere = NOT_HERE.some(r => r.test(after));
    const elsewhere = ELSEWHERE.some(r => r.test(after));
    const strong = WITH_BEFORE.test(before) || (HERE_AFTER.test(after) && !notHere);
    const cue = neg || only || notHere || elsewhere || strong || ALONE_AFTER.test(after);
    // A cue in a doubtful clause ("Luna might stay home"), or about someone who isn't the subject ("Pip leaves Luna
    // at home"), or that also puts them together with someone ("Pip is home with Luna") is unclear.
    if (cue && (doubtful || (!subject && !neg && !ONLY_BEFORE.test(before) && !WITH_BEFORE.test(before)) || ((notHere || elsewhere) && /\b(?:with|together)\b/i.test(after)))) { set("uncertain"); continue; }
    if (neg || notHere) set("excluded");
    else if (elsewhere) set("away");
    if (only && !neg) { set("only"); onlyLists.push(ids.slice().sort().join(",")); }
    if (strong && !neg && !notHere) set("strong");
  }

  if (flags.some(f => f.uncertain)) return all("ambiguous", "unclear cast words");
  if (flags.some(f => (f.excluded || f.away) && (f.strong || f.only))) return all("ambiguous", "contradictory cast words");
  if (new Set(onlyLists).size > 1) return all("ambiguous", "contradictory only-lists");
  const anyOnly = flags.some(f => f.only);
  if (anyOnly && flags.some(f => !f.only && f.strong)) return all("ambiguous", "only-list contradicted");
  const keep = members.filter((_, i) => anyOnly ? flags[i]!.only : !(flags[i]!.excluded || flags[i]!.away));
  // Being "somewhere else" only means something next to a named character who is here ("Pip explores while Luna waits
  // back at the lighthouse"); on its own ("Pip is far away from home") it may just be where the story happens.
  if (flags.some(f => f.away) && !flags.some(f => f.mentioned && !f.away && !f.excluded)) return all("ambiguous", "elsewhere without contrast");
  if (!flags.some(f => f.excluded || f.away || f.only || f.strong)) return all("default", "no cast instructions");
  const names = keep.map(c => c.name.trim());
  return { mode: "explicit", ids: keep.map(c => c.id), names, excluded: members.filter(c => !keep.includes(c)).map(c => c.name.trim()), mustShow: names, reason: anyOnly ? "only these characters" : "some characters left out" };
}

const joinNames = (n: string[]) => n.length < 3 ? n.join(" and ") : `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;

/** The picture-instruction line for the cast. Names exactly the characters the check will require. */
export function coverCastLine(plan: CoverCast): string {
  const out: string[] = [];
  const n = plan.mustShow;
  if (plan.mode !== "explicit") {
    if (n.length > 1) out.push(`Show all ${n.length} main characters together on the cover, each one clearly and fully visible: ${joinNames(n)}.`);
  } else {
    if (n.length > 1) out.push(plan.excluded.length ? `Show these ${n.length} characters together on the cover, each one clearly and fully visible: ${joinNames(n)}.` : `Show all ${n.length} main characters together on the cover, each one clearly and fully visible: ${joinNames(n)}.`);
    else if (n.length === 1) out.push(`Show ${n[0]} clearly and fully visible on the cover.`);
    if (plan.excluded.length) out.push(`Leave ${joinNames(plan.excluded)} off this cover, as the child's words say.`);
  }
  return out.join(" ");
}

/** Character-check rule: the check requires exactly the characters the picture instructions named. */
export function presenceRule(mustShow: string[]): string {
  if (!mustShow.length) return "";
  if (mustShow.length === 1) return ` This locked character must appear in the scene: ${mustShow[0]}. If it is missing, pass=false and score below 50.`;
  return ` Every one of these locked characters must appear in the scene: ${mustShow.join(", ")}. If any one is missing, pass=false and score below 50.`;
}
