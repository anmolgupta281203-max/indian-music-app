import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fafuzykysnifpsbrsqmr.supabase.co'
const supabaseKey = 'sb_publishable_s1DXCZ4I5MQqupgt-6KV2g_6TRi4veb'

export const supabase = createClient(supabaseUrl, supabaseKey)
