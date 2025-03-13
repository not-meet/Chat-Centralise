# Database Schema Design - ChatCentralize

## Tables

### users

- Primary key for agents and admins

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'agent')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}', -- Store UI preferences, notifications settings, etc.
    phone TEXT -- For notifications
);
```

### contacts

- Stores WhatsApp contact information

```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT UNIQUE NOT NULL,
    wa_id TEXT UNIQUE, -- WhatsApp ID
    full_name TEXT,
    email TEXT,
    location TEXT,
    avatar_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB, -- For additional flexible fields
    tags TEXT[], -- Quick tags for filtering
    language TEXT DEFAULT 'es', -- Preferred language
    timezone TEXT -- Customer's timezone
);
```

### conversations

- Links contacts with their chat history

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) NOT NULL,
    assigned_agent_id UUID REFERENCES users(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending')),
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB, -- For additional conversation context
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    last_agent_response_at TIMESTAMP WITH TIME ZONE,
    first_response_time INTERVAL -- Track response time metrics
);
```

### messages

- Stores all messages with real-time capabilities

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('agent', 'contact')),
    sender_id UUID NOT NULL, -- References either users.id or contacts.id
    content TEXT,
    message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'file', 'location', 'template')),
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    media_url TEXT, -- For image/file messages
    metadata JSONB, -- For additional message data (e.g., file details)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    error_data JSONB, -- Store error details if message fails
    reply_to_message_id UUID REFERENCES messages(id) -- For message replies/threads
);
```

### labels

- For organizing conversations

```sql
CREATE TABLE labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    color TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### conversation_labels

- Many-to-many relationship between conversations and labels

```sql
CREATE TABLE conversation_labels (
    conversation_id UUID REFERENCES conversations(id),
    label_id UUID REFERENCES labels(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (conversation_id, label_id)
);
```

### notes

- Internal notes on conversations

```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) NOT NULL,
    content TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### message_templates

- Pre-defined message templates

```sql
CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### broadcast_messages

- For sending mass messages

```sql
CREATE TABLE broadcast_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);
```

### broadcast_recipients

- Tracks broadcast message delivery

```sql
CREATE TABLE broadcast_recipients (
    broadcast_id UUID REFERENCES broadcast_messages(id),
    contact_id UUID REFERENCES contacts(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    PRIMARY KEY (broadcast_id, contact_id)
);
```

## Indexes

```sql
-- Conversations
CREATE INDEX idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX idx_conversations_assigned_agent_id ON conversations(assigned_agent_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- Messages
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Labels
CREATE INDEX idx_conversation_labels_conversation_id ON conversation_labels(conversation_id);
CREATE INDEX idx_conversation_labels_label_id ON conversation_labels(label_id);

-- Notes
CREATE INDEX idx_notes_conversation_id ON notes(conversation_id);
```

## Real-time Subscriptions

Enable real-time capabilities on:

- messages (for instant message updates)
- conversations (for status changes)
- notes (for collaborative note-taking)
- broadcast_messages (for status updates)

## Row Level Security (RLS)

Implement RLS policies for:

- Users can only access conversations assigned to them (agents) or all conversations (admins)
- Users can only create/edit their own notes
- Only admins can manage labels and broadcast messages
- Agents can only view and use existing templates

## Extensions Required

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
```
