// Clever OmniFocus Tasks
//
// Install Here: https://actions.getdrafts.com/a/1VJ

// This action allows you to create multiple tasks in OmniFocus with defer dates,
// due dates, and tags in one step.
//
// It does this by parsing a compact, easy-to-write syntax that I've adopted from
// other OmniFocus actions and tweaked to my liking, and then converting it into
// TaskPaper format, which can be "pasted" into OmniFocus in one go. This removes
// the need to confirm each individual action separately.
//
// Yes, you could also do this by writing your tasks in TaskPaper format directly,
// but I find its syntax (while innovative!) a bit cumbersome. The format this action
// uses isn't as featureful, but it does everything I need and with less typing.
//
// Instructions:
// Each line in your draft becomes a new task in OmniFocus, with the exception of
// "global" tags and dates, which I'll describe later.
//
// Each task goes on its own line and looks like this:
// The task title @defer-date !due-date #tag1 #tag2 --An optional note
//
// The defer date, due date, tags, and note are all optional. If you use them,
// the only requirement is that they come AFTER the task's title and the "--note contents"
// must be LAST.
//
// The defer and due dates support any syntax/format that OmniFocus can parse. This means
// you can write them as @today, @tomorrow, @3d, @5w, etc. If you want to use a date format
// that includes characters other than letters, numbers, and a dash (-), you'll need to enclose
// it in parenthesis like this: @(May 5, 2019) or !(6/21/2020).
//
// Global Defer/Due Dates:
// By default, tasks will only be assigned defer/due dates that are on the same line
// as the task title. However, if you add a new line that begins with a @ or ! then that
// defer or due date will be applied to ALL tasks without their own explicitly assigned date.
//
// Global Tags:
// Similarly, if you create a new line with a #, then that tag will be added to ALL tasks.
// If a task already has tags assigned to it, then the global tag will be combined with the
// other tags.
//
// Full Featured (and contrived) Example:
// Write presentation !Friday #work
// Research Mother's Day gifts @1w !(5/12/2019) --Flowers are boring
// Asparagus #shopping
// #personal
// @2d

// SCRIPT BEGINS BELOW

// Split draft's contents into lines.
const lines = draft.content.split("\n");

// Compile our globally applied tags.
// Tags can be spread across multiple lines starting with #, and each word on a line becomes a tag.
var globalTags = [];
for (var line of lines) {
    if (line.startsWith("#")) {
        const tmp = line.split("#")[1];
        const words = tmp.split(" ");
        for (var w of words) {
            globalTags.push(w);
        }
    }
}

// Grab the globally applied defer date if it exists.
var globalDeferDate = null;
for (var line of lines) {
    let defer_global_rx = /^@\(([^)]+)\)|^@(\S+)/i;
    let match = line.match(defer_global_rx);
    if (match) {
        if (match[1]) {
            globalDeferDate = match[1];
        }
        if (match[2]) {
            globalDeferDate = match[2];
        }
    }
}

// Grab the globally applied due date if it exists.
var globalDueDate = null;
for (var line of lines) {
    let due_global_rx = /^!\(([^)]+)\)|^!(\S+)/i;
    let match = line.match(due_global_rx);
    if (match) {
        if (match[1]) {
            globalDueDate = match[1];
        }
        if (match[2]) {
            globalDueDate = match[2];
        }
    }
}

var taskPaper = '';

// Parse our tasks.
for (var line of lines) {
    if (line.startsWith("#") || line.startsWith("@") || line.startsWith("!")) {
        continue;
    }

    if (line.length == 0) {
        continue;
    }

    // Is there a note on the task? If so, grab it, and remove it from the line.
    var note = null;
    let note_rx = /--(.+)$/;
    let noteMatch = line.match(note_rx);
    if (noteMatch) {
        note = noteMatch[1];
    }
    line = line.split(note_rx)[0];

    // Grab the tags.
    var tags = [];
    let tags_rx = /#(\S+)/g;
    while (t = tags_rx.exec(line)) {
        tags.push(t[1]);
    }
    
    // Merge in the global tags.
    for(var gt of globalTags) {
        if(!tags.includes(gt)) {
            tags.push(gt);
        }
    }

    // Grab the defer date.
    var defer = globalDeferDate;
    let defer_rx = /@\(([^)]+)\)|@(\S+)/i;
    var deferMatch = line.match(defer_rx);
    if (deferMatch) {
        if (deferMatch[1]) {
            defer = deferMatch[1];
        }
        if (deferMatch[2]) {
            defer = deferMatch[2];
        }
    }

    // Grab the due date.
    var due = globalDueDate;
    let due_rx = /!\(([^)]+)\)|!(\S+)/i;
    var dueMatch = line.match(due_rx);
    if (dueMatch) {
        if (dueMatch[1]) {
            due = dueMatch[1];
        }
        if (dueMatch[2]) {
            due = dueMatch[2];
        }
    }

    // Remove the tags, defer and due dates from the line.
    line = line.split(tags_rx)[0];
    line = line.split(defer_rx)[0];
    line = line.split(due_rx)[0];

    // Build the TaskPaper version of our task.
    taskPaper = taskPaper + "- " + line + " ";

    if (tags.length > 0) {
        let tagStr = tags.join(",");
        taskPaper = taskPaper + "@tags(" + tagStr + ") ";
    }

    if (defer) {
        taskPaper = taskPaper + "@defer(" + defer + ") ";
    }

    if (due) {
        taskPaper = taskPaper + "@due(" + due + ") ";
    }

    if (note) {
        taskPaper = taskPaper + "\n\t" + note;
    }

    taskPaper = taskPaper + "\n";
}

// Create our OmniFocus callback object.
var cb = CallbackURL.create()
cb.baseURL = "omnifocus://x-callback-url/paste";
cb.addParameter("content", taskPaper);
var success = cb.open();
if (!success) {
    context.fail();
}
