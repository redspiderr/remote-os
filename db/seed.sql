-- REMOTE OS — Seed Data (3 users, 2 teams, 5 standups)

-- Teams
INSERT INTO teams (id, name, slug, settings) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Ironborn Engineering', 'ironborn', '{"timezone": "UTC", "standup_time": "09:00"}'::jsonb),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Greyjoy Ops', 'greyjoy-ops', '{"timezone": "Europe/Belfast", "standup_time": "10:00"}'::jsonb);

-- Users
INSERT INTO users (id, email, name, avatar_url, team_id) VALUES
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'euron@greyjoy.com', 'Euron Greyjoy', 'https://i.pravatar.cc/150?u=euron', 'b2c3d4e5-f6a7-8901-bcde-f12345678901'),
    ('d4e5f6a7-b8c9-0123-defa-234567890123', 'asha@greyjoy.com', 'Asha Greyjoy', 'https://i.pravatar.cc/150?u=asha', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
    ('e5f6a7b8-c9d0-1234-efab-345678901234', 'theon@greyjoy.com', 'Theon Greyjoy', 'https://i.pravatar.cc/150?u=theon', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

-- Standups
INSERT INTO standups (id, user_id, video_url, transcript, summary, status, duration, created_at) VALUES
    ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'https://storage.remote-os.dev/videos/euron-001.mp4', 'Shipped the new Docker stack today. PostgreSQL and Redis are live.', 'Docker Compose stack deployed with Postgres 16 and Redis 7.', 'completed', 78, NOW() - INTERVAL '2 hours'),
    ('a7b8c9d0-e1f2-3456-abcd-567890123456', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'https://storage.remote-os.dev/videos/asha-001.mp4', 'Working on the fleet routing algorithm. Hitting some edge cases with the pathfinding.', 'Fleet routing in progress, investigating edge cases.', 'processing', 45, NOW() - INTERVAL '5 hours'),
    ('b8c9d0e1-f2a3-4567-bcde-678901234567', 'e5f6a7b8-c9d0-1234-efab-345678901234', 'https://storage.remote-os.dev/videos/theon-001.mp4', 'Refactored the dashboard components. Need feedback on the new layout.', 'Dashboard refactor done, awaiting review.', 'completed', 62, NOW() - INTERVAL '1 day'),
    ('c9d0e1f2-a3b4-5678-cdef-789012345678', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'https://storage.remote-os.dev/videos/euron-002.mp4', NULL, NULL, 'pending', 0, NOW() - INTERVAL '30 minutes'),
    ('d0e1f2a3-b4c5-6789-defa-890123456789', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'https://storage.remote-os.dev/videos/asha-002.mp4', 'Spent the morning reviewing PRs and updating the CI pipeline.', 'PR reviews and CI pipeline updates.', 'completed', 54, NOW() - INTERVAL '3 hours');
