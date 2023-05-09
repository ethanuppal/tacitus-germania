// Copyright (C) 2023 Ethan Uppal. All rights reserved.

var chapters;
var chapterIndex = 0;
var textContainerHeightDiv, commentaryContainerDiv;
var chapterTextP, commentaryDiv;
var previousButton, nextButton;
var chapterNumberSpan, chapterNameSpan;
var commentaryHeightMatcher;
var perseusFrame, perseusInput;
var noteRegex = "\\#(.*?)\\#";
var linkRegex = /\@(.*?)\@/;

var referenceNotes = {};
var searchParams;

// https://stackoverflow.com/questions/22015684/zip-arrays-in-javascript
var zip = (a, b) => a.map((k, i) => [k, b[i]]);

// https://stackoverflow.com/questions/16308037/detect-when-elements-within-a-scrollable-div-are-out-of-view
function checkInView(container, element, partial) {
    //Get container properties
    let cTop = container.scrollTop + container.offsetTop + element.clientHeight;
    let cBottom = cTop + container.clientHeight;

    //Get element properties
    let eTop = element.offsetTop;
    let eBottom = eTop + element.clientHeight;

    //Check if in view
    let isTotal = (eTop >= cTop && eBottom <= cBottom);
    let isPartial = partial && (
      (eTop < cTop && eBottom > cTop) ||
      (eBottom > cBottom && eTop < cBottom)
    );

    //Return outcome
    return  (isTotal || isPartial);
}

function main() {
    textContainerHeightDiv = document.getElementById('text-container-height');
    commentaryContainerDiv = document.getElementById('commentary-container');
    chapterTextP = document.getElementById('chapter-text');
    commentaryDiv = document.getElementById('commentary');
    previousButton = document.getElementById('previous-chapter');
    nextButton = document.getElementById('next-chapter');
    chapterNumberSpan = document.getElementById('chapter-number');
    chapterNameSpan = document.getElementById('chapter-name')
    perseusFrame = document.getElementById('perseus-frame');
    perseusInput = document.getElementById('perseus-input');
    searchParams = new URLSearchParams(window.location.search);

    // Horribly inefficient but it works.
    commentaryHeightMatcher = new ResizeObserver(() => {
        commentaryContainerDiv.style.height = `${textContainerHeightDiv.offsetHeight}px`;
    }).observe(textContainerHeightDiv);

    // Also horribly inefficient
    // https://css-tricks.com/snippets/jquery/detect-first-visible-element/
    // https://properprogramming.com/tools/jquery-to-javascript-converter/#Convert_jQuery_to_JavaScript_Online_Tool
    commentaryContainerDiv.addEventListener("scroll", (event) => {
        var first;
        for (const note of document.getElementsByClassName('commentary-note')) {
            if (checkInView(commentaryContainerDiv, note, true)) {
                first = note;
                break;
            }
        }
        if (first) {
            for (const section of document.getElementsByClassName('section')) {
                if (section.dataset.sectionNumber == first.dataset.sectionNumber) {
                    section.classList.add('highlighted');
                } else {
                    section.classList.remove('highlighted');
                }
            }
            for (const noteSectNumber of document.getElementsByClassName('note-section-number')) {
                if (noteSectNumber.dataset.sectionNumber == first.dataset.sectionNumber) {
                    noteSectNumber.classList.add('highlighted');
                } else {
                    noteSectNumber.classList.remove('highlighted');
                }
            }
        }
    });

    // Load the commentary
    fetchReferenceNotes({ then: () => {
        fetchCommentarySource();
    } })
}

function setChapterFromURL() {
    if (searchParams.has('chapter')) {
        chapterIndex = (parseInt(searchParams.get('chapter'), 10) - 1) || 0;
        if (chapterIndex + 1 > chapters.count) {
            chapterIndex = 0;
        }
    }
}

function fetchReferenceNotes(thenObj) {
    fetch('reference.json')
        .then(response => response.text())
        .then(data => {
            referenceNotes = JSON.parse(data);
            thenObj.then();
    });
}

function fetchCommentarySource() {
    fetch('commentary.json')
        .then(response => response.text())
        .then(data => {
            chapters = JSON.parse(data);

            const chapterIndexTry = localStorage.getItem('chapter_index');
            if (chapterIndexTry != null) {
                chapterIndex = Number(chapterIndexTry);
            }
            setChapterFromURL();
            chapterNumberSpan.textContent = `${chapterIndex + 1}`;

            setNavigationEnabled();
            loadTextAndCommentary();
    });
}

function setButtonEnabled(button, isEnabled) {
    button.disabled = !isEnabled;
    if (isEnabled) {
        button.classList.remove('disabled');
    } else {
        button.classList.add('disabled');
    }
}

// This is potentially inefficient, but efficiency does not matter here
function setNavigationEnabled() {
    // Start by assuming they are both able to work
    setButtonEnabled(previousButton, true);
    setButtonEnabled(nextButton, true);

    // Then check based on chapter index conditions to disable one or other
    if (chapterIndex == 0) {
        previousButton.disabled = true;
        setButtonEnabled(previousButton, false);
    }
    if (chapterIndex + 1 == chapters.length) {
        chapterIndex = chapters.length - 1;
        setButtonEnabled(nextButton, false);
    }
}

function changeChapterIndexBy(delta) {
    chapterIndex += delta;
    if (chapterIndex < 0) {
        chapterIndex = 0;
    } else if (chapterIndex + 1 > chapters.length) {
        chapterIndex = chapters.length - 1;
    }
    setNavigationEnabled();

    chapterNumberSpan.textContent = `${chapterIndex + 1}`;
    localStorage.setItem('chapter_index', chapterIndex);
    loadTextAndCommentary();
}

function loadTextAndCommentary() {
    chapterTextP.innerHTML = '';
    commentaryDiv.innerHTML = '';

    const chapter = chapters[chapterIndex];
    if ('name' in chapter) {
        chapterNameSpan.textContent = `: ${chapter.name}`;
    } else {
        chapterNameSpan.textContent = '';
    }
    var sectionNumber = 1;
    var foundNotes = false;
    for (const section of chapter.sections) {
        // Add section text
        if (sectionNumber > 1) {
            chapterTextP.innerHTML += ' ';
        }
        chapterTextP.innerHTML += `<span class="section${(sectionNumber == 1) ? (' highlighted') : ('')}" data-section-number="${sectionNumber}">[${sectionNumber}] ${section.text.replaceAll('#', '')}</span>`;

        // Add commentary notes
        if (section.notes != null) {
            foundNotes = true;
            const noteWords = [...section.text.matchAll(noteRegex)];
            for (const package of zip(noteWords, section.notes)) {
                var note = package[1];
                const noteWord = note.word ?? package[0][1];

                // Check if it's a reference note
                var toAdd = '';
                if ('ref' in note) {
                    if ('text' in note) {
                        toAdd = ` ${note.text}`;
                    }
                    note = referenceNotes[note.ref];
                    if (note == undefined) {
                        continue;
                    }
                }

                if (!('insertedLink' in note)) {
                    note.insertedLink = false;
                }

                const noteP = document.createElement('p');
                noteP.classList.add('commentary-note')
                noteP.setAttribute('data-section-number', sectionNumber)
                noteP.innerHTML += `<span style="font-weight: bold;">${noteWord}</span>`;

                if (note.link != null && note.text.includes('@')) {
                    const linkPart = linkRegex.exec(note.text)[0];
                    note.text = note.text.replace(linkRegex, `<a href="${note.link}" target="_blank">${linkPart.slice(1, -1)}</a>`);
                    note.insertedLink = true;
                }
                noteP.innerHTML += `<span class="note-section-number${(sectionNumber == 1) ? (' highlighted') : ('')}" data-section-number="${sectionNumber}">[${sectionNumber}]</span>: ${note.text + toAdd}`;
                if (!note.insertedLink && note.link != null) {
                    noteP.innerHTML += ` <a href=${note.link} target="_blank">(link)</a>`;
                }

                commentaryDiv.append(noteP);
            }
        }

        // Next section
        sectionNumber++;
    }

    if (!foundNotes) {
        const messageP = document.createElement('p');
        messageP.textContent = "Looks like there aren't any notes for this section yet!";
        commentaryDiv.append(messageP);
    }

    window.scrollTo(0, 0);
}

function perseusLookupRequested() {
    if (perseusInput.value != '') {
        perseusFrame.src = `https://www.perseus.tufts.edu/hopper/morph?la=la&l=${perseusInput.value}`;
        perseusFrame.classList.remove('hidden');
    }
}
