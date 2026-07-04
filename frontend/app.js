async function loadVacations() {
  const summary = document.getElementById("summary");
  const gallery = document.getElementById("gallery");

  try {
    const response = await fetch("/api/vacations");

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();

    summary.textContent = `${data.owner}'s gallery has ${data.totalPhotos} photos across ${data.totalVacations} vacations.`;

    gallery.innerHTML = data.vacations
      .map((vacation) => {
        const photos = vacation.photos
          .map(
            (photo) => `
              <article class="photo-card">
                <img src="${photo.imageUrl}" alt="${photo.title}" />
                <div class="photo-body">
                  <h3>${photo.title}</h3>
                  <p>${photo.caption}</p>
                </div>
              </article>
            `
          )
          .join("");

        return `
          <section class="vacation-card">
            <div class="vacation-heading">
              <div>
                <h2>${vacation.title}</h2>
                <p>${vacation.location} · ${vacation.year}</p>
              </div>
              <span>${vacation.photos.length} photos</span>
            </div>
            <p class="description">${vacation.description}</p>
            <div class="photos">${photos}</div>
          </section>
        `;
      })
      .join("");
  } catch (error) {
    summary.textContent = "Could not load vacation data from the backend.";
    gallery.innerHTML = `<pre class="error">${error.message}</pre>`;
  }
}

loadVacations();
