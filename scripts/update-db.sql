-- Add deckList column to existing Deck table
ALTER TABLE Deck ADD COLUMN deckList TEXT DEFAULT '';

-- Add gameId column to AssignmentHistory table
ALTER TABLE AssignmentHistory ADD COLUMN gameId TEXT DEFAULT '';

-- Update existing records with sample deck lists
UPDATE Deck SET deckList = '4 Lightning Bolt
4 Monastery Swiftspear  
4 Goblin Guide
4 Lava Spike
4 Rift Bolt
4 Chain Lightning
4 Searing Blaze
4 Skewer the Critics
4 Light Up the Stage
20 Mountain
4 Ramunap Ruins
4 Barbarian Ring' WHERE name = 'Lightning Aggro';

UPDATE Deck SET deckList = '4 Counterspell
4 Force of Negation
4 Snapcaster Mage
2 Jace, the Mind Sculptor
4 Brainstorm
4 Ponder
4 Swords to Plowshares
4 Terminus
4 Teferi, Time Raveler
3 Monastery Mentor
4 Flooded Strand
4 Tundra
4 Island
4 Plains
2 Mystic Sanctuary
3 Karakas' WHERE name = 'Control Master';

UPDATE Deck SET deckList = '4 Llanowar Elves
4 Elvish Mystic
4 Fyndhorn Elves
4 Craterhoof Behemoth
4 Natural Order
4 Green Sun''s Zenith
4 Glimpse of Nature
4 Heritage Druid
4 Nettle Sentinel
4 Wirewood Symbiote
4 Forest
4 Gaea''s Cradle
4 Windswept Heath
4 Dryad Arbor
3 Pendelhaven' WHERE name = 'Nature''s Fury';
