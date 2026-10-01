'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================================
// Skema validasi
// ============================================================
const shareSchema = z.object({
  partner_id: z.string().uuid().optional(),
  partner_user_id: z.string().uuid().optional(),
  name: z.string().min(1, 'Nama teman wajib diisi').max(120),
  avatar_url: z.string().nullable().optional(),
  amount: z.coerce.number().min(1, 'Bagian teman harus lebih dari 0'),
})

const splitBillSchema = z
  .object({
    title: z.string().min(1, 'Judul tagihan wajib diisi').max(160),
    amount: z.coerce.number().min(1, 'Jumlah harus lebih dari 0'),
    wallet_id: z.string().uuid('Dompet harus dipilih'),
    category_id: z.string().uuid('Kategori harus dipilih'),
    transaction_date: z.string().min(1, 'Tanggal transaksi wajib diisi'),
    receipt_id: z.string().uuid().optional(),
    split_method: z.enum(['equal', 'custom']),
    notes: z.string().max(500).optional(),
    shares: z.array(shareSchema).min(1, 'Pilih minimal satu teman'),
  })
  .superRefine((val, ctx) => {
    const total = val.shares.reduce((sum, s) => sum + s.amount, 0)
    if (total > val.amount) {
      ctx.addIssue({
        code: 'custom',
        message: 'Total bagian teman melebihi total tagihan',
        path: ['shares'],
      })
    }
  })

export type SplitBillInput = z.infer<typeof splitBillSchema>
export type ShareInput = z.infer<typeof shareSchema>

type ActionResult = { success: boolean; error?: string }
type PartnerRecord = {
  id: string
  name: string
  partner_user_id: string | null
  avatar_url: string | null
  source: 'qr' | 'manual'
  last_used_at: string
}

// ============================================================
// Helpers
// ============================================================
async function recalcSplitStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  splitBillId: string
) {
  const { data: shares } = await supabase
    .from('split_bill_shares')
    .select('status')
    .eq('split_bill_id', splitBillId)

  if (!shares || shares.length === 0) return

  const allPaid = shares.every((s: { status: string }) => s.status === 'paid')
  await supabase
    .from('split_bills')
    .update({ status: allPaid ? 'settled' : 'open' })
    .eq('id', splitBillId)
}

const idrFmt = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPayerName(supabase: any, userId: string): Promise<string> {
  try {
    const { data } = await supabase.from('profiles').select('full_name').eq('id', userId).single()
    return (data as { full_name?: string } | null)?.full_name || 'Temanmu'
  } catch {
    return 'Temanmu'
  }
}

// Kirim notifikasi in-app (insert row) + push FCM (best effort) ke partner.
// Gagal total pun tidak boleh merusak transaksi utama.
async function notifyPartner(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  p: {
    targetUserId: string
    payerId: string
    title: string
    body: string
    actionUrl: string
    metadata?: Record<string, string | number | null>
  }
) {
  if (!p.targetUserId || p.targetUserId === p.payerId) return

  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: p.targetUserId,
      title: p.title,
      body: p.body,
      type: 'split_bill',
      action_url: p.actionUrl,
      metadata: p.metadata || {},
    })
    if (error) console.error('Error inserting partner notification:', error)
  } catch (err) {
    console.error('Partner notification insert failed:', err)
  }

  try {
    await supabase.functions.invoke('send-fcm-notification', {
      body: {
        user_id: p.targetUserId,
        title: p.title,
        body: p.body,
        type: 'split_bill',
        action_url: p.actionUrl,
        data: p.metadata || {},
        save_to_db: false,
      },
    })
  } catch (err) {
    console.error('FCM push invocation failed:', err)
  }
}

// ============================================================
// CREATE — buat split bill (1 transaksi expense + shares)
// ============================================================
export async function createSplitBill(
  data: SplitBillInput
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    const validated = splitBillSchema.safeParse(data)
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message }
    }

    const input = validated.data

    // 1. Transaksi expense penuh (saldo wallet disesuaikan trigger trg_wallet_balance)
    const { data: trx, error: trxError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_id: input.wallet_id,
        category_id: input.category_id,
        receipt_id: input.receipt_id || null,
        amount: input.amount,
        type: 'expense',
        description: input.title,
        transaction_date: input.transaction_date,
      })
      .select('id')
      .single()

    if (trxError || !trx) {
      console.error('Error creating split transaction:', trxError)
      return { success: false, error: 'Gagal menyimpan transaksi tagihan.' }
    }

    // 2. Split bill
    const { data: split, error: splitError } = await supabase
      .from('split_bills')
      .insert({
        user_id: user.id,
        transaction_id: trx.id,
        title: input.title,
        amount: input.amount,
        split_method: input.split_method,
        notes: input.notes || null,
      })
      .select('id')
      .single()

    if (splitError || !split) {
      console.error('Error creating split bill:', splitError)
      // rollback transaksi agar tidak menggantung
      await supabase.from('transactions').delete().eq('id', trx.id)
      return { success: false, error: 'Gagal menyimpan tagihan patungan.' }
    }

    // 3. Shares per teman
    const { error: shareError } = await supabase.from('split_bill_shares').insert(
      input.shares.map((s) => ({
        split_bill_id: split.id,
        partner_id: s.partner_id || null,
        partner_user_id: s.partner_user_id || null,
        name: s.name,
        avatar_url: s.avatar_url || null,
        amount: s.amount,
      }))
    )

    if (shareError) {
      console.error('Error creating split shares:', shareError)
      await supabase.from('split_bills').delete().eq('id', split.id)
      await supabase.from('transactions').delete().eq('id', trx.id)
      return { success: false, error: 'Gagal menyimpan bagian teman.' }
    }

    // 4. Tandai partner terpakai (urutkan "terakhir dipakai" di daftar)
    const partnerIds = input.shares
      .map((s) => s.partner_id)
      .filter((id): id is string => Boolean(id))

    if (partnerIds.length > 0) {
      await supabase
        .from('last_bill_partners')
        .update({ last_used_at: new Date().toISOString() })
        .in('id', partnerIds)
        .eq('user_id', user.id)
    }

    // 5. Tandai struk sebagai sudah diproses (idempotent — hanya diset sekali)
    if (input.receipt_id) {
      await supabase
        .from('receipts')
        .update({ is_processed: true })
        .eq('id', input.receipt_id)
        .eq('user_id', user.id)
    }

    // 6. Notifikasi in-app + push ke setiap partner yang punya akun Fimo
    const payerName = await getPayerName(supabase, user.id)
    for (const s of input.shares) {
      if (!s.partner_user_id) continue
      await notifyPartner(supabase, {
        targetUserId: s.partner_user_id,
        payerId: user.id,
        title: `Patungan baru dari ${payerName}`,
        body: `${payerName} mengajukan patungan "${input.title}" — ${idrFmt.format(input.amount)}. Bagianmu: ${idrFmt.format(s.amount)}.`,
        actionUrl: '/dashboard/split-bills?shared=1',
        metadata: { split_bill_id: split.id, amount: s.amount },
      })
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/transactions')
    revalidatePath('/dashboard/split-bills')

    return { success: true, id: split.id as string }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.' }
  }
}

// ============================================================
// Tandai lunas (opsional catat sebagai pemasukan)
// ============================================================
export async function markSharePaid(
  shareId: string,
  options?: { record_income?: boolean; wallet_id?: string }
): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    const { data: share } = await supabase
      .from('split_bill_shares')
      .select(
        'id, status, amount, name, partner_user_id, split_bill_id, split_bills ( id, user_id, title )'
      )
      .eq('id', shareId)
      .single()

    if (!share || (share.split_bills as { user_id?: string } | null)?.user_id !== user.id) {
      return { success: false, error: 'Bagian tidak ditemukan atau akses ditolak.' }
    }

    if (share.status === 'paid') {
      return { success: true }
    }

    // Opsional: catat pemasukan (uang dari teman masuk ke dompet)
    let paidTransactionId: string | null = null
    if (options?.record_income) {
      if (!options.wallet_id) {
        return { success: false, error: 'Pilih dompet untuk menerima pembayaran.' }
      }

      const splitTitle = (share.split_bills as { title?: string } | null)?.title || 'Patungan'
      const { data: incomeTrx, error: incomeError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_id: options.wallet_id,
          category_id: null,
          amount: share.amount,
          type: 'income',
          description: `${splitTitle} - ${share.name}`,
          transaction_date: new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single()

      if (incomeError || !incomeTrx) {
        console.error('Error creating settle income:', incomeError)
        return { success: false, error: 'Gagal mencatat pemasukan.' }
      }
      paidTransactionId = incomeTrx.id
    }

    const { error } = await supabase
      .from('split_bill_shares')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        paid_transaction_id: paidTransactionId,
      })
      .eq('id', shareId)

    if (error) {
      console.error('Error marking share paid:', error)
      if (paidTransactionId) {
        await supabase.from('transactions').delete().eq('id', paidTransactionId)
      }
      return { success: false, error: 'Gagal menandai lunas.' }
    }

    await recalcSplitStatus(supabase, share.split_bill_id)

    // Notifikasi ke partner: bagianmu sudah ditandai lunas
    const paidTitle = (share.split_bills as { title?: string } | null)?.title || 'Patungan'
    if (share.partner_user_id) {
      const payerName = await getPayerName(supabase, user.id)
      await notifyPartner(supabase, {
        targetUserId: share.partner_user_id,
        payerId: user.id,
        title: 'Pembayaran diterima',
        body: `${payerName} menandai bagianmu lunas — "${paidTitle}" (${idrFmt.format(share.amount)}).`,
        actionUrl: '/dashboard/split-bills?shared=1',
        metadata: { split_bill_id: share.split_bill_id, share_id: share.id, amount: share.amount },
      })
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/wallets')
    revalidatePath('/dashboard/transactions')
    revalidatePath('/dashboard/split-bills')

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.' }
  }
}

// ============================================================
// Batalkan lunas (hapus income yang tercatat)
// ============================================================
export async function unmarkSharePaid(shareId: string): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    const { data: share } = await supabase
      .from('split_bill_shares')
      .select('id, status, paid_transaction_id, split_bill_id, split_bills ( id, user_id )')
      .eq('id', shareId)
      .single()

    if (!share || (share.split_bills as { user_id?: string } | null)?.user_id !== user.id) {
      return { success: false, error: 'Bagian tidak ditemukan atau akses ditolak.' }
    }

    if (share.status !== 'paid') {
      return { success: true }
    }

    if (share.paid_transaction_id) {
      await supabase.from('transactions').delete().eq('id', share.paid_transaction_id)
    }

    const { error } = await supabase
      .from('split_bill_shares')
      .update({ status: 'pending', paid_at: null, paid_transaction_id: null })
      .eq('id', shareId)

    if (error) {
      console.error('Error unmarking share:', error)
      return { success: false, error: 'Gagal membatalkan status lunas.' }
    }

    await recalcSplitStatus(supabase, share.split_bill_id)

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/wallets')
    revalidatePath('/dashboard/transactions')
    revalidatePath('/dashboard/split-bills')

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.' }
  }
}

// ============================================================
// Hapus split (cascade shares + expense txn; income pelunasan tetap)
// ============================================================
export async function deleteSplitBill(splitId: string): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    const { data: split } = await supabase
      .from('split_bills')
      .select('id, user_id, transaction_id, title')
      .eq('id', splitId)
      .single()

    if (!split || split.user_id !== user.id) {
      return { success: false, error: 'Tagihan tidak ditemukan atau akses ditolak.' }
    }

    // Kumpulkan partner ber-akun Fimo sebelum cascade menghapus shares
    const { data: sharesBeforeDelete } = await supabase
      .from('split_bill_shares')
      .select('partner_user_id')
      .eq('split_bill_id', splitId)

    const { error: splitError } = await supabase.from('split_bills').delete().eq('id', splitId)
    if (splitError) {
      console.error('Error deleting split bill:', splitError)
      return { success: false, error: 'Gagal menghapus tagihan patungan.' }
    }

    // Hapus transaksi expense asli (shares sudah ter-cascade)
    await supabase.from('transactions').delete().eq('id', split.transaction_id)

    // Notifikasi ke partner: patungan dibatalkan
    const partnerIds = [
      ...new Set(
        (sharesBeforeDelete || [])
          .map((s: { partner_user_id: string | null }) => s.partner_user_id)
          .filter((id: string | null): id is string => Boolean(id))
      ),
    ]
    if (partnerIds.length > 0) {
      const payerName = await getPayerName(supabase, user.id)
      for (const targetUserId of partnerIds) {
        await notifyPartner(supabase, {
          targetUserId,
          payerId: user.id,
          title: 'Patungan dibatalkan',
          body: `${payerName} membatalkan patungan "${split.title}".`,
          actionUrl: '/dashboard/split-bills?shared=1',
          metadata: { split_bill_id: split.id },
        })
      }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/wallets')
    revalidatePath('/dashboard/transactions')
    revalidatePath('/dashboard/split-bills')

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.' }
  }
}

// ============================================================
// Partner (last_bill_partners)
// ============================================================
export async function addPartner(data: {
  name: string
  partner_user_id?: string | null
  avatar_url?: string | null
  source?: 'qr' | 'manual'
}): Promise<ActionResult & { existing?: boolean; partner?: PartnerRecord }> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    const name = (data.name || '').trim()
    if (!name) {
      return { success: false, error: 'Nama teman wajib diisi.' }
    }

    // Dedupe berdasarkan partner_user_id (dari QR Fimo)
    if (data.partner_user_id) {
      const { data: existing } = await supabase
        .from('last_bill_partners')
        .select('id, name, partner_user_id, avatar_url, source, last_used_at')
        .eq('user_id', user.id)
        .eq('partner_user_id', data.partner_user_id)
        .maybeSingle()

      if (existing) {
        return { success: true, existing: true, partner: existing }
      }
    }

    const { data: partner, error } = await supabase
      .from('last_bill_partners')
      .insert({
        user_id: user.id,
        name,
        partner_user_id: data.partner_user_id || null,
        avatar_url: data.avatar_url || null,
        source: data.source || 'manual',
      })
      .select('id, name, partner_user_id, avatar_url, source, last_used_at')
      .single()

    if (error || !partner) {
      // Race dengan unique index
      if (error?.code === '23505' && data.partner_user_id) {
        const { data: existing } = await supabase
          .from('last_bill_partners')
          .select('id, name, partner_user_id, avatar_url, source, last_used_at')
          .eq('user_id', user.id)
          .eq('partner_user_id', data.partner_user_id)
          .maybeSingle()
        if (existing) {
          return { success: true, existing: true, partner: existing }
        }
      }
      console.error('Error adding partner:', error)
      return { success: false, error: 'Gagal menambahkan teman.' }
    }

    revalidatePath('/dashboard/split-bills')

    return { success: true, existing: false, partner }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.' }
  }
}

export async function renamePartner(partnerId: string, name: string): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    const trimmed = (name || '').trim()
    if (!trimmed) {
      return { success: false, error: 'Nama teman wajib diisi.' }
    }

    const { error } = await supabase
      .from('last_bill_partners')
      .update({ name: trimmed })
      .eq('id', partnerId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error renaming partner:', error)
      return { success: false, error: 'Gagal memperbarui nama teman.' }
    }

    revalidatePath('/dashboard/split-bills')

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.' }
  }
}

export async function deletePartner(partnerId: string): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    const { error } = await supabase
      .from('last_bill_partners')
      .delete()
      .eq('id', partnerId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting partner:', error)
      return { success: false, error: 'Gagal menghapus teman.' }
    }

    revalidatePath('/dashboard/split-bills')

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.' }
  }
}
