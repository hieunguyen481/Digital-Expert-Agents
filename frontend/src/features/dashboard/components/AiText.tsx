import { StatusPill } from '@/components/ui';
import { parseAiText } from '../agentTrace';

/** Văn bản AI đã làm sạch: nhãn chữ hoa thành chip, "A; B" thành gạch đầu dòng, không "— " đầu dòng. */
/** `skipTag`: nhãn đã hiện ở chip kết luận đứng cạnh thì không in lại chip cùng chữ. */
export function AiText({ text, tone = 'warn', skipTag }: { text: string; tone?: 'warn' | 'neutral'; skipTag?: string }) {
  const { tag, lead, items } = parseAiText(text);
  return (
    <span data-testid="ai-text" style={{ display: 'inline' }}>
      {tag && tag !== skipTag && <><StatusPill tone={tone}>{tag}</StatusPill>{' '}</>}
      {lead && (items.length > 0 ? <b style={{ fontWeight: 600 }}>{lead}</b> : <span>{lead}</span>)}
      {items.length > 1 || (items.length === 1 && lead)
        ? <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>{items.map((x) => <li key={x}>{x}</li>)}</ul>
        : items[0] && <span>{items[0]}</span>}
    </span>
  );
}
