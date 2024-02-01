const sectionOne = document.querySelector(".section-one");

const options = {};
const observer = new IntersectionObserver(function (entries, observer) {
  entries.forEach((entry) => {
    console.log(entry);
  });
}, options);
