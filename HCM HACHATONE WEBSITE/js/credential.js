// ============================================================================
// credential.js - Supabase Client Initialization (ES Module)
// ============================================================================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

// Supabase project credentials
const SUPABASE_URL = "https://qydjaldtnzjpveubmrrg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5ZGphbGR0bnpqcHZldWJtcnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NjQzODgsImV4cCI6MjEwODQ0MDM4OH0.od8by95GL8iHGconQhFQL0W1xEViDQ0xWfCHNS5VvxE";

// Supabase client instance banaya
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default supabase;
