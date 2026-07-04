const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || "vacation-gallery-postgres",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "vacation_gallery",
  user: process.env.DB_USER || "vacation_user",
  password: process.env.DB_PASSWORD || "vacation_password"
});

async function initDb() {
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const result = await pool.query("SELECT COUNT(*)::int AS count FROM photos");

  if (result.rows[0].count === 0) {
    await pool.query(`
      INSERT INTO photos (title, location, vacation, year, image_url, caption, featured)
      VALUES
        ('Mountain sunrise', 'Colorado', 'Rocky Mountain Getaway', 2025, '/photos/rocky-mountains.svg', 'Early morning view from the trailhead', true),
        ('Alpine lake', 'Colorado', 'Rocky Mountain Getaway', 2025, '/photos/alpine-lake.svg', 'Clear water surrounded by peaks', false),
        ('Ocean walk', 'Florida', 'Beach Trip', 2024, '/photos/beach.svg', 'Walking near the water before sunset', false),
        ('Palm trees', 'Florida', 'Beach Trip', 2024, '/photos/palms.svg', 'A quiet afternoon near the coast', false),
        ('Red rocks', 'Arizona', 'Desert Road Trip', 2023, '/photos/desert.svg', 'Late afternoon light over the desert', false);
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
  const { vacation, location, featured } = req.query;

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

  if (featured === "true") {
    filters.push("featured = true");
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const result = await pool.query(
    `
      SELECT id, title, location, vacation, year, image_url, caption, featured, created_at
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
