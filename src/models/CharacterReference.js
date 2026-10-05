const db = require('../db/connection');

class CharacterReference {
  static getActive() {
    const row = db.prepare('SELECT * FROM character_references ORDER BY created_at ASC LIMIT 1').get();
    if (!row) return null;
    return {
      ...row,
      palette: JSON.parse(row.palette)
    };
  }

  static getById(id) {
    const row = db.prepare('SELECT * FROM character_references WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      palette: JSON.parse(row.palette)
    };
  }

  static upsert(data) {
    const now = new Date().toISOString();
    const existing = db.prepare('SELECT id FROM character_references WHERE id = ?').get(data.id);
    if (existing) {
      db.prepare(`
        UPDATE character_references 
        SET name = ?, role = ?, image_path = ?, description = ?, palette = ?, version = ?, updated_at = ?
        WHERE id = ?
      `).run(
        data.name,
        data.role,
        data.image_path,
        data.description,
        JSON.stringify(data.palette),
        data.version,
        now,
        data.id
      );
    } else {
      db.prepare(`
        INSERT INTO character_references (id, name, role, image_path, description, palette, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.id,
        data.name,
        data.role,
        data.image_path,
        data.description,
        JSON.stringify(data.palette),
        data.version,
        now,
        now
      );
    }
    return this.getById(data.id);
  }
}

module.exports = CharacterReference;
