'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  // Check if account is approved by Admin
  if (authData.user) {
    const isMasterAdmin = authData.user.email?.toLowerCase() === 'admin@jira.com';
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).maybeSingle();

    if (profile && profile.is_approved === false && !profile.is_superadmin && !isMasterAdmin) {
      await supabase.auth.signOut();
      redirect(`/login?error=${encodeURIComponent('⏳ Your account is pending Admin approval. Please contact the administrator to activate your access.')}`)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('full_name') as string,
        city: formData.get('city') as string || 'Mumbai',
        designation: formData.get('designation') as string || '',
      }
    }
  }

  const { data: signUpData, error } = await supabase.auth.signUp(data)

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  // If new user signed up (not master admin), inform them about pending approval
  if (signUpData.user && data.email.toLowerCase() !== 'admin@jira.com') {
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent('✅ Account created successfully! It is now pending Admin approval before you can sign in.')}`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
