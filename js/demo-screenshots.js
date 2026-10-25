document.querySelectorAll(".screenshot-image").forEach((image) => {
  const showImage = () => {
    if (image.naturalWidth > 0) {
      image.closest(".screenshot-frame")?.classList.add("has-image");
    }
  };

  image.addEventListener("load", showImage);

  if (image.complete) {
    showImage();
  }
});
