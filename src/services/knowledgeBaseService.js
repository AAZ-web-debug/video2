const fs = require('fs');
const path = require('path');

const KB_DIR = path.resolve(__dirname, '../../data/knowledge_base');

function getTopicKnowledge(topic) {
  const normalized = (topic || '').trim().toLowerCase();
  const filePath = path.join(KB_DIR, `${normalized}.json`);

  if (!fs.existsSync(filePath)) {
    // If not found, attempt case-insensitive match
    const files = fs.readdirSync(KB_DIR);
    const matched = files.find(f => f.toLowerCase() === `${normalized}.json`);
    if (matched) {
      return JSON.parse(fs.readFileSync(path.join(KB_DIR, matched), 'utf8'));
    }
    throw new Error(`Knowledge base content for topic "${topic}" not found.`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getConceptKnowledge(topic, concept) {
  const topicData = getTopicKnowledge(topic);
  const normalizedConcept = (concept || '').trim().toLowerCase();

  const conceptEntryKey = Object.keys(topicData.concepts || {}).find(
    k => k.toLowerCase() === normalizedConcept
  );

  if (!conceptEntryKey) {
    throw new Error(`Concept "${concept}" not found in topic "${topic}". Available concepts: ${Object.keys(topicData.concepts || {}).join(', ')}`);
  }

  return {
    topic: topicData.topic,
    title: topicData.title,
    conceptName: conceptEntryKey,
    details: topicData.concepts[conceptEntryKey]
  };
}

module.exports = {
  getTopicKnowledge,
  getConceptKnowledge
};
