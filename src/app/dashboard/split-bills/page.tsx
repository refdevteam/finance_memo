import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SplitBillsClient } from '@/components/split/SplitBillsClient'
import type { SharedBill, SplitBillWithShares } from '@/components/split/types'

export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function SplitBillsPage({
  searchParams,
}: {
  searchParams: Promise<{
    new?: string
    amount?: string
    title?: string
    date?: string
    receipt_id?: string
    cat?: string
  }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const [
    partnersRes,
    splitsRes,
    walletsRes,
    categoriesRes,
    profileRes,
    sharedBillsRes,
  ] = await Promise.all([
      supabase
        .from('last_bill_partners')
        .select('id, name, partner_user_id, avatar_url, source, last_used_at')
        .eq('user_id', user.id)
        .order('last_used_at', { ascending: false }),
      supabase
        .from('split_bills')
        .select(
          `id, title, amount, split_method, status, notes, created_at, transaction_id,
           split_bill_shares (
             id, split_bill_id, partner_id, partner_user_id, name, avatar_url,
             amount, status, paid_at, paid_transaction_id
           )`
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('wallets')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('categories')
        .select('id, name, type')
        .or(`user_id.eq.${user.id},is_default.eq.true`),
      supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single(),
      supabase.rpc('bills_shared_with_me'),
    ])

  if (partnersRes.error) console.error('Error fetching partners:', partnersRes.error)
  if (splitsRes.error) console.error('Error fetching split bills:', splitsRes.error)
  if (sharedBillsRes.error) console.error('Error fetching shared bills:', sharedBillsRes.error)

  // Prefill dari hasil AI scan struk (?new=1&amount=...&title=...&date=...&receipt_id=...)
  const {
    new: isNew,
    amount: amountParam,
    title: titleParam,
    date: dateParam,
    receipt_id: receiptId,
    cat: catParam,
  } = await searchParams
  const prefill = {
    new: isNew === '1',
    amount: amountParam
      ? Number(amountParam.replace(/[^0-9]/g, '')) || undefined
      : undefined,
    title: titleParam || undefined,
    date: dateParam || undefined,
    receipt_id:
      receiptId && UUID_RE.test(receiptId)
        ? receiptId
        : undefined,
    category_name: catParam || undefined,
  }

  return (
    <SplitBillsClient
      splits={(splitsRes.data || []) as unknown as SplitBillWithShares[]}
      sharedBills={(sharedBillsRes.data || []) as unknown as SharedBill[]}
      partners={partnersRes.data || []}
      wallets={walletsRes.data || []}
      categories={categoriesRes.data || []}
      profile={{
        user_id: user.id,
        full_name: profileRes.data?.full_name || null,
        avatar_url: profileRes.data?.avatar_url || null,
      }}
      prefill={prefill}
    />
  )
}
