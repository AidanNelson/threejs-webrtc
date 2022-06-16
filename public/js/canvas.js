
let ctx;

var path;
var tool;

function initCanvas() {
    paper.setup('drawingCanvas');
    tool = new Tool();
    tool.onMouseDown = onMouseDown;
    tool.onMouseDrag = onMouseDrag;
    tool.onMouseUp = onMouseUp;

    var rect = new paper.Path.Rectangle({
        point: [0, 0],
        size: [view.size.width, view.size.height],
        strokeColor: 'white',
        selected: false
    });
    rect.sendToBack();
    rect.fillColor = 'white';

    // Give the stroke a color
    // path.strokeColor = 'black';
    // var start = new paper.Point(100, 100);
    // // Move to start and draw a line from there
    // path.moveTo(start);
    // // Note that the plus operator on Point objects does not work
    // // in JavaScript. Instead, we need to call the add() function:
    // path.lineTo(start.add([ 200, -50 ]));
    // Draw the view now:
    paper.view.draw();


    // let canvas = document.getElementById('drawingCanvas');
    // ctx = canvas.getContext("2d");
    // ctx.fillStyle = '#FFF';
    // ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // ctx.beginPath();
    // ctx.arc(95, 50, 40, 0, 2 * Math.PI);
    // ctx.stroke();
}

function onMouseDown(event) {
    // If we produced a path before, deselect it:
    if (path) {
        path.selected = false;
    }

    // Create a new path and set its stroke color to black:
    path = new paper.Path({
        segments: [event.point],
        strokeColor: 'black',
        // Select the path, so we can see its segment points:
        fullySelected: false
    });
}

// While the user drags the mouse, points are added to the path
// at the position of the mouse:
function onMouseDrag(event) {
    path.add(event.point);

    // Update the content of the text item to show how many
    // segments it has:
    // textItem.content = 'Segment count: ' + path.segments.length;
}

// When the mouse is released, we simplify the path:
function onMouseUp(event) {
    // When the mouse is released, simplify it:
    path.simplify(10);

    // Select the path, so we can see its segments:
    path.fullySelected = false;

    // emit update to peers
    mySocket.emit("drawPath", JSON.parse(path.exportJSON())[1].segments);

    // update screen in 3D canvas
    setTimeout(function() {
        drawingTexture.needsUpdate = true;
    }, 100);
}

function updateCanvas(pathJSON) {
    // draw incoming path from peer
    path = new paper.Path({
        segments: pathJSON,
        strokeColor: 'black',
    });

    // update screen in 3D canvas
    setTimeout(function() {
        drawingTexture.needsUpdate = true;
    }, 100);
}
