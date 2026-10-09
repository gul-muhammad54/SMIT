// Apne Supabase project ka URL aur anon public key yahan likhein
// (Dashboard -> Project Settings -> API)
const PROJECTURL = `https://kpalgsxvenogzfdbzwjd.supabase.co`;
const ANON_PUBLIC_KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwYWxnc3h2ZW5vZ3pmZGJ6d2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyOTQ0NDcsImV4cCI6MjEwNjg3MDQ0N30.GOrKn0vci46aLCJDegEb3Bj7HJRpOTvBhr6VLC-NFj0`;

const supabase = window.supabase.createClient(PROJECTURL, ANON_PUBLIC_KEY);
export default supabase;
