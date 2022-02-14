console.log('hello controls');

class MyControls {
    constructor(camera) {
        // set up my controls
        this.camera = camera;
        this.camera.position.set(0,40,0);
        this.camera.lookAt(0,0,0);

        this.keys = {};
        document.body.addEventListener('keydown',(ev) => {
            this.keys[ev.key] = true;
        } )
        document.body.addEventListener('keyup',(ev) => {
            this.keys[ev.key] = false;
        } )
    }

    update(avatar){
        avatar.position.set(this.camera.position.x,0,this.camera.position.z);
        console.log('controls updating okay!');
        console.log('KEYS: ',this.keys);

        if (this.keys["w"]) {
            this.camera.position.z -= 0.1;
        }
        if (this.keys["a"]) {
            this.camera.position.x -= 0.1;
        }
        if (this.keys["s"]) {
            this.camera.position.z += 0.1;
        }
        if (this.keys["d"]) {
            this.camera.position.x += 0.1;
        }
    }
}