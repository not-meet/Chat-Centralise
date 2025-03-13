-- Create agent_stats table
CREATE TABLE IF NOT EXISTS public.agent_stats (
    agent_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    active_chats INT DEFAULT 0,
    resolved_today INT DEFAULT 0,
    avg_response_time INT DEFAULT 0,
    satisfaction_rate FLOAT DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.agent_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Agents can view all agent stats"
    ON public.agent_stats FOR SELECT
    USING (true);

CREATE POLICY "Only system can update agent stats"
    ON public.agent_stats FOR UPDATE
    USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')); 