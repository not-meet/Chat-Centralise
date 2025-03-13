-- Enable RLS on conversation_labels table
ALTER TABLE conversation_labels ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing labels
CREATE POLICY "Users can view labels for their conversations"
    ON conversation_labels
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = conversation_id
            AND (
                c.assigned_agent_id = auth.uid()
                OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
            )
        )
    );

-- Create policy for adding/removing labels
CREATE POLICY "Users can manage labels for their conversations"
    ON conversation_labels
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = conversation_id
            AND (
                c.assigned_agent_id = auth.uid()
                OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
            )
        )
    ); 