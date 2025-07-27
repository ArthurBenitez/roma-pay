-- Corrigir URLs das imagens dos tokens para usar o caminho correto
UPDATE tokens SET image_url = 'src/assets/augustus-cyber.jpg' WHERE id = 'augustus';
UPDATE tokens SET image_url = 'src/assets/constantine-cyber.jpg' WHERE id = 'constantine';  
UPDATE tokens SET image_url = 'src/assets/hadrian-cyber.jpg' WHERE id = 'hadrian';
UPDATE tokens SET image_url = 'src/assets/julius-caesar-cyber.jpg' WHERE id = 'julius-caesar';
UPDATE tokens SET image_url = 'src/assets/marcus-aurelius-cyber.jpg' WHERE id = 'marcus-aurelius';
UPDATE tokens SET image_url = 'src/assets/nero-cyber.jpg' WHERE id = 'nero';
UPDATE tokens SET image_url = 'src/assets/trajan-cyber.jpg' WHERE id = 'trajan';