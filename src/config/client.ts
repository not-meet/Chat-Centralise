export const config = {
    supabase: {
        url: import.meta.env.VITE_SUPABASE_URL,
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    server: {
        url: 'http://localhost:3001',
    },
}
