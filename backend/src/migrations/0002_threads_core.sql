CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS threads (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES categories(id),
    author_user_id BIGINT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threads_category_created_at
ON threads (category_id, created_at DESC);

INSERT INTO categories (slug, name, description)
VALUES
    ('general', 'General', 'A place for general topics and conversations.'),
    ('q-and-a', 'Q&A', 'Ask questions and get answers from the community.'),
    ('showcase', 'Showcase', 'Show off your projects and creations.'),
    ('help', 'Help and Support', 'Get help and support from the community.'),
    ('announcements', 'Announcements', 'Official announcements and updates.'),
    ('off-topic', 'Off Topic', 'Discuss anything not related to other categories.'),
    ('feedback', 'Feedback', 'Provide feedback and suggestions for improvement.'),
    ('events', 'Events', 'Discuss upcoming events and meetups.'),
    ('resources', 'Resources', 'Share useful resources and materials.')
ON CONFLICT (slug) DO NOTHING;
