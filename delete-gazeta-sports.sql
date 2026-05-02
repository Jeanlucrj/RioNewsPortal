-- Delete all Gazeta do Povo articles from esportes category
DELETE FROM news_articles
WHERE source LIKE '%Gazeta do Povo%'
AND category = 'esportes';

-- Verify remaining Gazeta do Povo articles (should not be in esportes)
SELECT id, title, category, source
FROM news_articles
WHERE source LIKE '%Gazeta do Povo%'
ORDER BY published_at DESC
LIMIT 10;
