// ===== Supabase client =====
var db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
var me = null      // login wala user (profile)
var myEmp = null   // login wale user ka employee record

