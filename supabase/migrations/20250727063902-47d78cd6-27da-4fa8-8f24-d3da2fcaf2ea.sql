-- Atualizar os valores dos tokens para seguir a tabuada do 8: 4, 8, 16, 40, 80, 104...
UPDATE tokens SET price = 4, points = 5 WHERE id = 'hadrian';
UPDATE tokens SET price = 8, points = 10 WHERE id = 'augustus';
UPDATE tokens SET price = 16, points = 20 WHERE id = 'julius-caesar';
UPDATE tokens SET price = 40, points = 50 WHERE id = 'trajan';
UPDATE tokens SET price = 80, points = 100 WHERE id = 'marcus-aurelius';
UPDATE tokens SET price = 104, points = 130 WHERE id = 'constantine';
UPDATE tokens SET price = 112, points = 140 WHERE id = 'nero';