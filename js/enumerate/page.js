const moveElemContents = (from, to) => {
  while (from.childNodes.length) {
    to.appendChild(from.firstChild);
  }
};

const convertBlockquotes = () => {
  for (let elem of Array.from(document.getElementsByTagName('blockquote'))) {
    let details = document.createElement('details');
    let summary = document.createElement('summary');
    details.appendChild(summary);

    // Add the first paragraph as the summary.
    moveElemContents(elem.firstElementChild, summary);
    elem.removeChild(elem.firstElementChild);
    // Move the rest of the blockquote into the details section.
    moveElemContents(elem, details);

    // Replace the blockquote with the details.
    elem.parentNode.replaceChild(details, elem);
  }
};

const initPage = () => {
  convertBlockquotes();
};
