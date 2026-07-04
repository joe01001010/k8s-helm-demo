const summary = document.getElementById("summary");
const gallery = document.getElementById("gallery");

async function fetchPhotos(query = "") {
  const response = await fetch(`/api/photos${query}`);

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  return response.json();
}

async function loadPhotos(query = "") {
  try {
    const data = await fetchPhotos(query);

    summary.textContent = `Showing ${data.totalPhotos} vacation photos from the backend database.`;

    gallery.innerHTML = data.photos
      .map(
        (photo) => `
          <article class="photo-card ${photo.featured ? "featured" : ""}">
            <img src="${photo.image_url}" alt="${photo.title}" />
            <div class="photo-body">
              <h3>${photo.title}</h3>
              <p>${photo.caption}</p>
              <p class="meta">${photo.vacation} · ${photo.location} · ${photo.year}</p>
              <div class="actions">
                <button onclick="featurePhoto(${photo.id})">Feature</button>
                <button onclick="deletePhoto(${photo.id})">Delete</button>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  } catch (error) {
    summary.textContent = "Could not load photos from the backend.";
    gallery.innerHTML = `<pre class="error">${error.message}</pre>`;
  }
}

async function featurePhoto(id) {
  await fetch(`/api/photos/${id}/featured`, {
    method: "PUT"
  });

  await loadPhotos();
}

async function deletePhoto(id) {
  await fetch(`/api/photos/${id}`, {
    method: "DELETE"
  });

  await loadPhotos();
}

window.featurePhoto = featurePhoto;
window.deletePhoto = deletePhoto;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("showAll").addEventListener("click", () => loadPhotos());
  document.getElementById("showColorado").addEventListener("click", () => loadPhotos("?location=Colorado"));
  document.getElementById("showFlorida").addEventListener("click", () => loadPhotos("?location=Florida"));
  document.getElementById("showArizona").addEventListener("click", () => loadPhotos("?location=Arizona"));
  document.getElementById("showFeatured").addEventListener("click", () => loadPhotos("?featured=true"));

  loadPhotos();
});
