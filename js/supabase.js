
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qqlsttamprrcljljcqrk.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = supabase || createClient(
  'https://qqlsttamprrcljlcqrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTY5ODAxNjYwMCwiZXhwIjoxOTMzNTkyMjAwfQ.8jBDphYZFfPbzN1hSh-r4MEYF5PpZpqlIv0IdK8Vm5A'
);


