const summary = document.getElementById("summary");
const gallery = document.getElementById("gallery");
const sectionSelect = document.getElementById("sectionSelect");
const sectionButtons = document.getElementById("sectionButtons");
const sectionForm = document.getElementById("sectionForm");
const uploadForm = document.getElementById("uploadForm");

async function loadSections() {
  const response = await fetch("/api/sections");

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  const data = await response.json();

  sectionSelect.innerHTML = `
    <option value="">Choose a section</option>
    ${data.sections
      .map((section) => `<option value="${section.id}">${section.name}</option>`)
      .join("")}
  `;

  sectionButtons.innerHTML = `
    <button onclick="loadPhotos()">All photos</button>
    ${data.sections
      .map(
        (section) => `
          <button onclick="loadPhotos('?sectionId=${section.id}')">
            ${section.name} (${section.photo_count})
          </button>
        `
      )
      .join("")}
  `;
}

sectionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    name: document.getElementById("sectionName").value,
    location: document.getElementById("sectionLocation").value,
    year: document.getElementById("sectionYear").value,
    description: document.getElementById("sectionDescription").value
  };

  const response = await fetch("/api/sections", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    alert("Could not create section");
    return;
  }

  sectionForm.reset();
  await loadSections();
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData();
  formData.append("sectionId", document.getElementById("sectionSelect").value);
  formData.append("title", document.getElementById("photoTitle").value);
  formData.append("caption", document.getElementById("photoCaption").value);
  formData.append("photo", document.getElementById("photoFile").files[0]);

  const response = await fetch("/api/photos/upload", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    alert("Could not upload photo");
    return;
  }

  uploadForm.reset();
  await loadSections();
  await loadPhotos();
});

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

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("showAll").addEventListener("click", () => loadPhotos());
  document.getElementById("showColorado").addEventListener("click", () => loadPhotos("?location=Colorado"));
  document.getElementById("showFlorida").addEventListener("click", () => loadPhotos("?location=Florida"));
  document.getElementById("showArizona").addEventListener("click", () => loadPhotos("?location=Arizona"));
  document.getElementById("showFeatured").addEventListener("click", () => loadPhotos("?featured=true"));

  await loadSections();
  await loadPhotos();
});
