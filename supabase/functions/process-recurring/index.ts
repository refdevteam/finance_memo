import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with Service Role Key to bypass RLS for scheduled cron execution
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ""
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call the Postgres RPC function process_due_recurring_templates()
    const { data, error } = await supabase.rpc('process_due_recurring_templates')

    if (error) {
      console.error('Error executing process_due_recurring_templates:', error)
      throw error
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Processed due recurring templates successfully.',
      result: data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    console.error('Error in process-recurring function:', err)
    return new Response(JSON.stringify({ 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
