import { Button } from '@/components/ui/button';
import { BLOCK_REPLY, DEFAULT_CHIPS } from '@/lib/studio-guard';

export function safetyAlternatives(message: string): string[] {
  const category = (Object.keys(BLOCK_REPLY) as (keyof typeof BLOCK_REPLY)[]).find(key => message.includes(BLOCK_REPLY[key]));
  return category ? DEFAULT_CHIPS[category] : [];
}
export function SafeRetry({ message, onChoose }: { message: string; onChoose: (idea: string) => void }) {
  const choices = safetyAlternatives(message);
  return choices.length ? <div className="flex flex-wrap gap-3">{choices.map(idea => <Button key={idea} variant="outline" className="h-auto min-h-14 whitespace-normal" onClick={() => onChoose(idea)}>{idea}</Button>)}</div> : null;
}