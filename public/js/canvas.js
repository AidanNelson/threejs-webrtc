class DrawingBoard {
    constructor(elementID) {
        paper.setup(elementID);
        let tool = new paper.Tool();
        tool.onMouseDown = this.onMouseDown;
        tool.onMouseDrag = this.onMouseDrag;
        tool.onMouseUp = this.onMouseUp;

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
        return this;
    }

    onMouseDown(event) {
        // If we produced a path before, deselect it:
        if (this.path) {
            this.path.selected = false;
        }

        // Create a new path and set its stroke color to black:
        this.path = new paper.Path({
            segments: [event.point],
            strokeColor: 'black',
            // Select the path, so we can see its segment points:
            fullySelected: false
        });
    }

    // While the user drags the mouse, points are added to the path
// at the position of the mouse:
    onMouseDrag(event) {
        this.path.add(event.point);

        // Update the content of the text item to show how many
        // segments it has:
        // textItem.content = 'Segment count: ' + path.segments.length;
    }

// When the mouse is released, we simplify the path:
    onMouseUp(event) {
        // When the mouse is released, simplify it:
        this.path.simplify(10);

        // Select the path, so we can see its segments:
        this.path.fullySelected = false;

        // emit update to peers
        let segments = JSON.parse(this.path.exportJSON())[1].segments;
        mySocket.emit("drawPath", {'segments': segments, 'id': mySocket.id});

        // update screen in 3D canvas
        setTimeout(function() {
            drawingTexture.needsUpdate = true;
        }, 100);
    }

    updateCanvas(update) {
        if (update.id === mySocket.id) {
            return
        }

        // draw incoming path from peer
        this.path = new paper.Path({
            segments: update.segments,
            strokeColor: 'blue',
        });

        // update screen in 3D canvas
        setTimeout(function() {
            drawingTexture.needsUpdate = true;
        }, 100);
    }
}
