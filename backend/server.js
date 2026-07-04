const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uploadDir = process.env.UPLOAD_DIR || "/data/uploads";

fs.mkdirSync(uploadDir, { recursive: true });

app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeOriginalName = file.originalname
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-");

    cb(null, `${Date.now()}-${safeOriginalName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }

    cb(null, true);
  }
});

const pool = new Pool({
  host: process.env.DB_HOST || "vacation-gallery-postgres",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "vacation_gallery",
  user: process.env.DB_USER || "vacation_user",
  password: process.env.DB_PASSWORD || "vacation_password"
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sections (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      year INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS photos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      location TEXT NOT NULL,
      vacation TEXT NOT NULL,
      year INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      caption TEXT NOT NULL,
      featured BOOLEAN NOT NULL DEFAULT false,
      section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    ALTER TABLE photos
    ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL;
  `);

  const sectionResult = await pool.query("SELECT COUNT(*)::int AS count FROM sections");

  if (sectionResult.rows[0].count === 0) {
    await pool.query(`
      INSERT INTO sections (name, description, location, year)
      VALUES
        ('Rocky Mountain Getaway', 'Mountain views, hiking trails, and quiet evenings outisde.', 'Colorado', 2025),
        ('Beach Trip', 'Warm weather, ocean air, seafood, and a slower pace.', 'Florida', 2024),
        ('Desert Road Trip', 'Late afternoon light over the desert', 'Arizona', 2023);
    `);
  }

  const photoResult = await pool.query("SELECT COUNT(*)::int AS count FROM photos");

if (photoResult.rows[0].count === 0) {
    await pool.query(`
      INSERT INTO photos (title, location, vacation, year, image_url, caption, featured, section_id)
      VALUES
        (
          'Mountain sunrise',
          'Colorado',
          'Rocky Mountain Getaway',
          2025,
          '/photos/rocky-mountains.svg',
          'Early morning view from the trailhead',
          true,
          (SELECT id FROM sections WHERE name = 'Rocky Mountain Getaway')
        ),
        (
          'Alpine lake',
          'Colorado',
          'Rocky Mountain Getaway',
          2025,
          '/photos/alpine-lake.svg',
          'Clear water surrounded by peaks',
          false,
          (SELECT id FROM sections WHERE name = 'Rocky Mountain Getaway')
        ),
        (
          'Ocean walk',
          'Florida',
          'Beach Trip',
          2024,
          '/photos/beach.svg',
          'Walking near the water before sunset',
          false,
          (SELECT id FROM sections WHERE name = 'Beach Trip')
        ),
        (
          'Palm trees',
          'Florida',
          'Beach Trip',
          2024,
          '/photos/palms.svg',
          'A quiet afternoon near the coast',
          false,
          (SELECT id FROM sections WHERE name = 'Beach Trip')
        ),
        (
          'Red rocks',
          'Arizona',
          'Desert Road Trip',
          2023,
          '/photos/desert.svg',
          'Late afternoon light over the desert',
          false,
          (SELECT id FROM sections WHERE name = 'Desert Road Trip')
        );
    `);
  }
}

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

app.get("/api/photos", async (req, res) => {
  const { vacation, location, featured, sectionId } = req.query;

  const filters = [];
  const values = [];

  if (vacation) {
    values.push(vacation);
    filters.push(`vacation = $${values.length}`);
  }

  if (location) {
    values.push(location);
    filters.push(`location = $${values.length}`);
  }

  if (sectionId) {
    values.push(sectionId);
    filters.push(`section_id = $${values.length}`);
  }

  if (featured === "true") {
    filters.push("featured = true");
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const result = await pool.query(
    `
      SELECT id, title, location, vacation, year, image_url, caption, featured, section_id, created_at
      FROM photos
      ${whereClause}
      ORDER BY featured DESC, created_at DESC, id DESC;
    `,
    values
  );

  res.json({
    totalPhotos: result.rows.length,
    photos: result.rows
  });
});

app.post("/api/photos", async (req, res) => {
  const { title, location, vacation, year, imageUrl, caption } = req.body;

  if (!title || !location || !vacation || !year || !imageUrl || !caption) {
    return res.status(400).json({
      error: "title, location, vacation, year, imageUrl, and caption are required"
    });
  }

  const result = await pool.query(
    `
      INSERT INTO photos (title, location, vacation, year, image_url, caption)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, location, vacation, year, image_url, caption, featured;
    `,
    [title, location, vacation, year, imageUrl, caption]
  );

  res.status(201).json(result.rows[0]);
});

app.put("/api/photos/:id/featured", async (req, res) => {
  const { id } = req.params;

  await pool.query("UPDATE photos SET featured = false");

  const result = await pool.query(
    `
      UPDATE photos
      SET featured = true
      WHERE id = $1
      RETURNING id, title, location, vacation, year, image_url, caption, featured;
    `,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Photo not found" });
  }

  res.json(result.rows[0]);
});

app.delete("/api/photos/:id", async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    "DELETE FROM photos WHERE id = $1 RETURNING id",
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Photo not found" });
  }

  res.status(204).send();
});

app.get("/api/sections", async (req, res) => {
  const result = await pool.query(`
    SELECT
      s.id,
      s.name,
      s.description,
      s.location,
      s.year,
      s.created_at,
      COUNT(p.id)::int AS photo_count
    FROM sections s
    LEFT JOIN photos p ON p.section_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC, s.id DESC;
  `);

  res.json({
    totalSections: result.rows.length,
    sections: result.rows
  });
});

app.post("/api/sections", async (req, res) => {
  const { name, description = "", location = "", year = null } = req.body;

  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  const result = await pool.query(
    `
      INSERT INTO sections (name, description, location, year)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, description, location, year, created_at;
    `,
    [name, description, location, year || null]
  );

  res.status(201).json(result.rows[0]);
});

app.post("/api/photos/upload", upload.single("photo"), async (req, res) => {
  const { title, caption = "", sectionId } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: "photo file is required" });
  }

  if (!title || !sectionId) {
    return res.status(400).json({ error: "title and sectionId are required" });
  }

  const imageUrl = `/uploads/${req.file.filename}`;

  const sectionResult = await pool.query(
    "SELECT id, name, location, year FROM sections WHERE id = $1",
    [sectionId]
  );

  if (sectionResult.rows.length === 0) {
    return res.status(404).json({ error: "Section not found" });
  }

  const section = sectionResult.rows[0];

  const result = await pool.query(
    `
      INSERT INTO photos (
        title,
        location,
        vacation,
        year,
        image_url,
        caption,
        section_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, title, location, vacation, year, image_url, caption, featured, section_id;
    `,
    [
      title,
      section.location || section.name,
      section.name,
      section.year || new Date().getFullYear(),
      imageUrl,
      caption,
      section.id
    ]
  );

  res.status(201).json(result.rows[0]);
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Vacation gallery backend running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
