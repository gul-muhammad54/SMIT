const htmlQuestions = [
    {
        question: "Which HTML tag is used to create a hyperlink?",
        options: ["link", "a", "href", "url"],
        answer: "a"
    },
    {
        question: "Which HTML tag is used to create a paragraph?",
        options: ["p", "para", "text", "paragraph"],
        answer: "p"
    },
    {
        question: "Which HTML tag is used to insert an image?",
        options: ["picture", "img", "image", "src"],
        answer: "img"
    },
    {
        question: "Which HTML tag is used to create an unordered list?",
        options: ["ol", "ul", "li", "list"],
        answer: "ul"
    },
    {
        question: "Which HTML tag is used to create an ordered list?",
        options: ["ul", "ol", "li", "list"],
        answer: "ol"
    },
    {
        question: "Which HTML tag is used to create a list item?",
        options: ["item", "li", "list", "ul"],
        answer: "li"
    },
    {
        question: "Which HTML tag is used to create a line break?",
        options: ["break", "lb", "br", "hr"],
        answer: "br"
    },
    {
        question: "Which HTML tag is used to insert a horizontal line?",
        options: ["line", "hr", "br", "border"],
        answer: "hr"
    },
    {
        question: "Which HTML tag is used to create a table?",
        options: ["table", "tr", "td", "tab"],
        answer: "table"
    },
    {
        question: "Which HTML tag is used to create a table row?",
        options: ["td", "tr", "th", "table"],
        answer: "tr"
    },
    {
        question: "Which HTML tag is used to create a table cell?",
        options: ["td", "th", "tr", "cell"],
        answer: "td"
    },
    {
        question: "Which HTML tag is used to create a table header cell?",
        options: ["thead", "th", "header", "td"],
        answer: "th"
    },
    {
        question: "Which HTML tag is used to create a form?",
        options: ["input", "form", "label", "fieldset"],
        answer: "form"
    },
    {
        question: "Which HTML tag is used to create a text input field?",
        options: ["textbox", "input", "text", "field"],
        answer: "input"
    },
    {
        question: "Which HTML tag is used to create a button?",
        options: ["btn", "button", "input", "click"],
        answer: "button"
    },
    {
        question: "Which HTML tag is used to create a dropdown list?",
        options: ["select", "option", "list", "dropdown"],
        answer: "select"
    },
    {
        question: "Which HTML tag defines an option in a dropdown list?",
        options: ["choice", "item", "option", "value"],
        answer: "option"
    },
    {
        question: "Which HTML tag is used for a multiline text input?",
        options: ["input", "textbox", "textarea", "text"],
        answer: "textarea"
    },
    {
        question: "Which HTML tag is used to create a label for a form element?",
        options: ["caption", "label", "legend", "span"],
        answer: "label"
    },
    {
        question: "Which HTML tag is used to play audio files?",
        options: ["music", "audio", "sound", "media"],
        answer: "audio"
    },
    {
        question: "Which HTML tag is used to play video files?",
        options: ["media", "movie", "video", "play"],
        answer: "video"
    },
    {
        question: "Which HTML tag is used to embed another webpage?",
        options: ["frame", "iframe", "embed", "window"],
        answer: "iframe"
    },
    {
        question: "Which HTML tag is used to make text semantically bold?",
        options: ["b", "bold", "strong", "em"],
        answer: "strong"
    },
    {
        question: "Which HTML tag is used to emphasize text?",
        options: ["italic", "i", "em", "strong"],
        answer: "em"
    },
    {
        question: "Which HTML tag is used to display preformatted text?",
        options: ["code", "pre", "text", "format"],
        answer: "pre"
    },
    {
        question: "Which HTML tag is used to display computer code?",
        options: ["script", "code", "pre", "program"],
        answer: "code"
    },
    {
        question: "Which HTML tag defines the main content of a webpage?",
        options: ["main", "body", "section", "article"],
        answer: "main"
    },
    {
        question: "Which HTML tag defines the header of a webpage?",
        options: ["top", "header", "head", "heading"],
        answer: "header"
    },
    {
        question: "Which HTML tag defines the footer of a webpage?",
        options: ["bottom", "footer", "end", "foot"],
        answer: "footer"
    },
    {
        question: "Which HTML tag is used to define navigation links?",
        options: ["menu", "nav", "links", "navigation"],
        answer: "nav"
    }
];

var questionBar = document.getElementById('question-bar');
var question = document.getElementById('question');
var options = document.getElementById('options');

var count = 0;

function quiz() {
    options.innerHTML = ''
    questionBar.innerHTML = `Question ${count + 1}/${htmlQuestions.length}`;
    var obj = htmlQuestions[count]
    question.innerHTML = obj.question;
    for (var i = 0; i < obj.options.length; i++) {
        var item = obj.options[i];
        options.innerHTML += `<button>${item}</button>`
    }
}


function next() {
    if (count < htmlQuestions.length - 1) {
        count++;
        quiz()
    } else {
        alert("Quiz has been completed")
    }
}

quiz()