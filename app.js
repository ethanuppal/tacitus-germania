// Copyright (C) 2023 Ethan Uppal. All rights reserved.

var chapters;
var chapterIndex = 0;
var chapterTextP;
var commentaryDiv;
var previousButton;
var nextButton;
var chapterNumberSpan;
var regex = "\\#(.*?)\\#";

// https://stackoverflow.com/questions/22015684/zip-arrays-in-javascript
var zip = (a, b) => a.map((k, i) => [k, b[i]]);

function main() {
    chapterTextP = document.getElementById('chapter-text');
    commentaryDiv = document.getElementById('commentary');
    previousButton = document.getElementById('previous-chapter');
    nextButton = document.getElementById('next-chapter');
    chapterNumberSpan = document.getElementById('chapter-number');

    fetch('commentary.json')
        .then(response => response.text())
        .then(data => {
            chapters = JSON.parse(data);
            console.log(chapters);

            const chapterIndexTry = localStorage.getItem('chapter_index');
            if (chapterIndexTry != null) {
                chapterIndex = Number(chapterIndexTry);
            }
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
    chapterTextP.textContent = '';
    commentaryDiv.innerHTML = '';

    const chapter = chapters[chapterIndex];
    var sectionNumber = 1;
    for (const section of chapter.sections) {
        // Add section text
        if (sectionNumber > 1) {
            chapterTextP.textContent += ' ';
        }
        chapterTextP.textContent += `[${sectionNumber}] ${section.text.replaceAll('#', '')}`;

        // Add commentary notes
        if (section.notes != null) {
            const noteWords = [...section.text.matchAll(regex)];
            for (const package of zip(noteWords, section.notes)) {
                const noteWord = package[0][1];
                const note = package[1];

                const noteP = document.createElement('p');
                if (note.link != null) {
                    noteP.innerHTML += `<a href=${note.link} target="_blank" style="font-weight: bold;">${noteWord}</a>`;
                } else {
                    noteP.innerHTML += `<span style="font-weight: bold;">${noteWord}</span>`;
                }
                noteP.innerHTML += `[${sectionNumber}]: ${note.text}`;
                commentaryDiv.append(noteP);
            }
        }

        // Next section
        sectionNumber++;
    }
}
