'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }
  const attemptedRole = formData.get('role_type') as string; // 'admin' or 'user'

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  if (authData.user) {
    const isMasterAdmin = authData.user.email?.toLowerCase() === 'admin@jira.com';
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).maybeSingle();

    // 1. If user profile does not exist (e.g. was deleted by Admin)
    if (!profile && !isMasterAdmin) {
      await supabase.auth.signOut();
      redirect(`/login?error=${encodeURIComponent('🚫 Account Not Found: Your account has been deleted by the administrator.')}`)
    }

    const isSuperadmin = isMasterAdmin || profile?.is_superadmin === true;

    // 2. If trying to log in on the Admin tab without Admin privileges
    if (attemptedRole === 'admin' && !isSuperadmin) {
      await supabase.auth.signOut();
      redirect(`/login?error=${encodeURIComponent('❌ Access Denied: This account does not have Admin privileges. Please sign in under the Team Member tab.')}`)
    }

    // 3. If account is pending approval or revoked
    if (!isSuperadmin && (!profile || !profile.is_approved)) {
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
