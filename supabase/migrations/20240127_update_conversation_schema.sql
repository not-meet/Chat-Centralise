-- Create labels table if not exists
CREATE TABLE IF NOT EXISTS labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366F1',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Enable RLS on labels
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;

-- Create policy for labels
CREATE POLICY "Agents can manage labels"
ON labels
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('admin', 'agent')
        AND status = 'active'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('admin', 'agent')
        AND status = 'active'
    )
);

-- Update conversation status enum
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS conversations_status_check;

ALTER TABLE conversations 
ADD CONSTRAINT conversations_status_check 
CHECK (status IN ('unassigned', 'active', 'archived', 'pending'));

-- Add needs_attention column
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS needs_attention BOOLEAN DEFAULT true;

-- Add last_customer_message_at column
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS last_customer_message_at TIMESTAMP WITH TIME ZONE;

-- Add label_id column to conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS label_id UUID REFERENCES labels(id);

-- Update existing rows to have proper status
UPDATE conversations 
SET status = 'unassigned' 
WHERE assigned_agent_id IS NULL AND status = 'pending';

-- Create function to update needs_attention flag
CREATE OR REPLACE FUNCTION update_conversation_needs_attention()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sender_type = 'contact' THEN
        UPDATE conversations 
        SET 
            needs_attention = true,
            last_customer_message_at = NEW.created_at
        WHERE id = NEW.conversation_id;
    ELSIF NEW.sender_type = 'agent' THEN
        UPDATE conversations 
        SET 
            needs_attention = false,
            last_agent_response_at = NEW.created_at
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for needs_attention
DROP TRIGGER IF EXISTS on_message_update_conversation_attention ON messages;
CREATE TRIGGER on_message_update_conversation_attention
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_needs_attention();

-- Function to handle auto-assignment
CREATE OR REPLACE FUNCTION handle_agent_first_response()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sender_type = 'agent' THEN
        UPDATE conversations
        SET 
            assigned_agent_id = NEW.sender_id,
            status = 'active',
            metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{assignment_history}',
                COALESCE(
                    metadata->'assignment_history', '[]'::jsonb
                ) || jsonb_build_array(
                    jsonb_build_object(
                        'agent_id', NEW.sender_id,
                        'assigned_at', NEW.created_at,
                        'assigned_by', 'auto'
                    )
                )
            )
        WHERE 
            id = NEW.conversation_id 
            AND (assigned_agent_id IS NULL OR status = 'unassigned');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-assignment
DROP TRIGGER IF EXISTS on_message_handle_assignment ON messages;
CREATE TRIGGER on_message_handle_assignment
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION handle_agent_first_response();

-- Create broadcasts table if not exists
CREATE TABLE IF NOT EXISTS broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES users(id) NOT NULL,
    message_content TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'template')),
    media_url TEXT,
    template_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'sent', 'failed')),
    target_type TEXT NOT NULL CHECK (target_type IN ('all', 'label', 'selected', 'numbers')),
    target_label UUID REFERENCES labels(id),
    target_numbers TEXT[],
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0
);

-- Create broadcast recipients table
CREATE TABLE IF NOT EXISTS broadcast_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for broadcast recipients
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast_id ON broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_status ON broadcast_recipients(status);

-- Add RLS for broadcast recipients
ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view broadcast recipients"
ON broadcast_recipients FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('admin', 'agent')
        AND status = 'active'
    )
);

-- Add indexes for broadcast queries
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_label_status ON conversations(label_id, status);

-- Add RLS policies for broadcasts
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can create broadcasts"
ON broadcasts FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('admin', 'agent')
        AND status = 'active'
    )
);

CREATE POLICY "Agents can view broadcasts"
ON broadcasts FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('admin', 'agent')
        AND status = 'active'
    )
); 