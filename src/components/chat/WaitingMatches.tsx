import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UiPayload } from '@/lib/agentUi';

export function WaitingMatches({ ui }: { ui: Extract<UiPayload, { kind: 'matching' }> }) {
  const [expanded, setExpanded] = useState(false);
  const ready = ui.rows.filter((r) => r.matches.length > 0);
  const blocked = ui.rows.filter((r) => r.matches.length === 0);
  const group = (title: string, rows: typeof ui.rows, actionable: boolean) => <section className="mt-5" aria-label={title}>
    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">{title}<span className="font-mono text-muted-foreground">{rows.length}</span></h3>
    {!rows.length ? <p className="text-sm text-muted-foreground">لا توجد استفسارات في هذه المجموعة.</p> : <div className="overflow-x-auto border-y">
      <table className="w-full text-right text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="py-2 font-medium">المستفسر / الطلب</th><th className="px-3 py-2 font-medium">الانتظار</th><th className="py-2 font-medium">{actionable ? 'المطابقة' : 'سبب التعذر'}</th></tr></thead>
        <tbody>{(expanded ? rows : rows.slice(0, 4)).map((row) => <tr key={row.inquiry_id} className="border-t">
          <td className="py-3"><div className="font-medium">{row.investor_name}</div><div className="mt-1 text-xs text-muted-foreground">{row.segment}</div></td>
          <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{row.wait_days} يومًا</td>
          <td className="py-3">{actionable ? <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs">{row.matches.length} أراضٍ</span><Button asChild variant="ghost" size="sm"><Link to="/admin/offer" search={{ inquiry: row.inquiry_id }}>جهّز العرض<ArrowLeft className="size-3" /></Link></Button></div> : <span className="text-xs text-muted-foreground">{row.flag}</span>}</td>
        </tr>)}</tbody>
      </table></div>}
  </section>;
  return <div>{group('جاهزون للعرض — الأطول انتظارًا أولًا', ready, true)}{group('طلبات بلا مطابقة حاليًا', blocked, false)}
    {(ready.length > 4 || blocked.length > 4) && <Button variant="ghost" size="sm" className="mt-2" onClick={() => setExpanded((v) => !v)}><ChevronDown className={expanded ? 'rotate-180' : ''} />{expanded ? 'اختصر القائمة' : 'عرض بقية الاستفسارات'}</Button>}
  </div>;
}