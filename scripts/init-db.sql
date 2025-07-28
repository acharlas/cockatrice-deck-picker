-- Initialize the database with some sample decks
INSERT INTO Deck (id, name, bracket, colors, createdAt) VALUES 
('deck1', 'Lightning Aggro', 1, '["Red", "White"]', datetime('now')),
('deck2', 'Control Master', 2, '["Blue", "Black"]', datetime('now')),
('deck3', 'Nature''s Fury', 1, '["Green"]', datetime('now')),
('deck4', 'Artifact Storm', 3, '["Colorless"]', datetime('now')),
('deck5', 'Tribal Warriors', 2, '["Red", "Green"]', datetime('now')),
('deck6', 'Mill Control', 2, '["Blue"]', datetime('now')),
('deck7', 'Lifegain Combo', 1, '["White", "Green"]', datetime('now')),
('deck8', 'Burn Rush', 1, '["Red"]', datetime('now')),
('deck9', 'Reanimator', 3, '["Black"]', datetime('now')),
('deck10', 'Midrange Value', 2, '["Blue", "Green"]', datetime('now'));
