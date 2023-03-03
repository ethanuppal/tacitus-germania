// Copyright (C) 2023 Ethan Uppal. All rights reserved.

var chapters;
var chapterIndex = 0;
var textContainerHeightDiv, commentaryContainerDiv;
var chapterTextP, commentaryDiv;
var previousButton, nextButton;
var chapterNumberSpan;
var commentaryHeightMatcher;
var whitakersFrame, whitakersInput;
var regex = "\\#(.*?)\\#";

// https://stackoverflow.com/questions/22015684/zip-arrays-in-javascript
var zip = (a, b) => a.map((k, i) => [k, b[i]]);

function main() {
    textContainerHeightDiv = document.getElementById('text-container-height');
    commentaryContainerDiv = document.getElementById('commentary-container');
    chapterTextP = document.getElementById('chapter-text');
    commentaryDiv = document.getElementById('commentary');
    previousButton = document.getElementById('previous-chapter');
    nextButton = document.getElementById('next-chapter');
    chapterNumberSpan = document.getElementById('chapter-number');
    whitakersFrame = document.getElementById('whitakers-frame');
    whitakersInput = document.getElementById('whitakers-input');

    fetch('commentary.json')
        .then(response => response.text())
        .then(data => {
            chapters = JSON.parse(data);

            const chapterIndexTry = localStorage.getItem('chapter_index');
            if (chapterIndexTry != null) {
                chapterIndex = Number(chapterIndexTry);
            }
            chapterNumberSpan.textContent = `${chapterIndex + 1}`;

            setNavigationEnabled();
            loadTextAndCommentary();
    });

    // Horribly inefficient but it works.
    commentaryHeightMatcher = new ResizeObserver(() => {
        commentaryContainerDiv.style.height = `${textContainerHeightDiv.offsetHeight}px`;
    }).observe(textContainerHeightDiv);
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
    chapterTextP.textContent = '';
    commentaryDiv.innerHTML = '';

    const chapter = chapters[chapterIndex];
    var sectionNumber = 1;
    var foundNotes = false;
    for (const section of chapter.sections) {
        // Add section text
        if (sectionNumber > 1) {
            chapterTextP.textContent += ' ';
        }
        chapterTextP.textContent += `[${sectionNumber}] ${section.text.replaceAll('#', '')}`;

        // Add commentary notes
        if (section.notes != null) {
            foundNotes = true;
            const noteWords = [...section.text.matchAll(regex)];
            for (const package of zip(noteWords, section.notes)) {
                const note = package[1];
                const noteWord = note.word ?? package[0][1];

                const noteP = document.createElement('p');
                noteP.innerHTML += `<span style="font-weight: bold;">${noteWord}</span>`;
                noteP.innerHTML += `[${sectionNumber}]: ${note.text}`;
                if (note.link != null) {
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

function whitakersLookupRequested() {
    if (whitakersInput.value != '') {
        console.log(whitakersFrame)
        whitakersFrame.src = `https://www.archives.nd.edu/cgi-bin/wordz.pl?keyword=${whitakersInput.value}`;
        whitakersFrame.classList.remove('hidden');
    }
}
