const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

const vacations = [
  {
    id: "rocky-mountains",
    title: "Rocky Mountain Getaway",
    location: "Colorado",
    year: 2025,
    description: "Mountain views, hiking trails, and quiet evenings after long days outside.",
    photos: [
      {
        id: "rocky-1",
        title: "Mountain sunrise",
        imageUrl: "/photos/rocky-mountains.svg",
        caption: "Early morning view from the trailhead"
      },
      {
        id: "rocky-2",
        title: "Alpine lake",
        imageUrl: "/photos/alpine-lake.svg",
        caption: "Clear water surrounded by peaks"
      }
    ]
  },
  {
    id: "beach-trip",
    title: "Beach Trip",
    location: "Florida",
    year: 2024,
    description: "Warm weather, ocean air, seafood, and a slower pace for a few days.",
    photos: [
      {
        id: "beach-1",
        title: "Ocean walk",
        imageUrl: "/photos/beach.svg",
        caption: "Walking near the water before sunset"
      },
      {
        id: "beach-2",
        title: "Palm trees",
        imageUrl: "/photos/palms.svg",
        caption: "A quiet afternoon near the coast"
      }
    ]
  },
  {
    id: "desert-roadtrip",
    title: "Desert Road Trip",
    location: "Arizona",
    year: 2023,
    description: "Red rocks, open roads, scenic overlooks, and a lot of coffee.",
    photos: [
      {
        id: "desert-1",
        title: "Red rocks",
        imageUrl: "/photos/desert.svg",
        caption: "Late afternoon light over the desert"
      }
    ]
  }
];

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/vacations", (req, res) => {
  const totalPhotos = vacations.reduce((count, trip) => count + trip.photos.length, 0);

  res.json({
    owner: "Joe",
    totalVacations: vacations.length,
    totalPhotos,
    vacations
  });
});

app.listen(port, () => {
  console.log(`Vacation gallery backend running on port ${port}`);
});
