'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCategories() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // Get both system categories and user-specific categories
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

export async function createCategory(formData: {
  name: string
  type: 'income' | 'expense'
  icon?: string
  color?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('categories')
    .insert({
      user_id: user.id,
      name: formData.name,
      type: formData.type,
      icon: formData.icon || 'Tag',
      color: formData.color || '#94a3b8',
    })

  if (error) throw error
  
  revalidatePath('/dashboard/categories')
}

export async function deleteCategory(id: string) {
  const supabase = createClient()
  
  // Only delete if it's a user-specific category (handled by RLS anyway)
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) throw error

  revalidatePath('/dashboard/categories')
}
