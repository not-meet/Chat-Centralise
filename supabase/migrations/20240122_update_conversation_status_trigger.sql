-- First create the enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE conversation_status AS ENUM ('active', 'needs-response', 'resolved', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update the conversations table check constraint to include 'needs-response'
ALTER TABLE conversations 
  DROP CONSTRAINT IF EXISTS conversations_status_check,
  ADD CONSTRAINT conversations_status_check 
    CHECK (status IN ('active', 'archived', 'pending', 'needs-response'));

-- Create the trigger function to update status based on sender
CREATE OR REPLACE FUNCTION update_conversation_status() RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET 
        status = CASE 
            WHEN NEW.sender_type = 'contact' THEN 'needs-response'
            WHEN NEW.sender_type = 'agent' THEN 'active'
            ELSE status
        END,
        last_message_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS update_status_on_message ON messages;
CREATE TRIGGER update_status_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_status(); 